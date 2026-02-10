import { dynamicTool, type Tool, jsonSchema, type JSONSchema7 } from "ai"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import {
  CallToolResultSchema,
  type Tool as MCPToolDef,
  ToolListChangedNotificationSchema,
} from "@modelcontextprotocol/sdk/types.js"
import { Config } from "../config/config"
import { Log } from "../util/log"
import { NamedError } from "@tscoder/util/error"
import z from "zod/v4"
import { Instance } from "../project/instance"
import { Installation } from "../installation"
import { withTimeout } from "@/util/timeout"
import { BusEvent } from "../bus/bus-event"
import { Bus } from "@/bus"

export namespace MCP {
  const log = Log.create({ service: "mcp" })
  const DEFAULT_TIMEOUT = 30_000

  export const Resource = z
    .object({
      name: z.string(),
      uri: z.string(),
      description: z.string().optional(),
      mimeType: z.string().optional(),
      client: z.string(),
    })
    .meta({ ref: "McpResource" })
  export type Resource = z.infer<typeof Resource>

  export const ToolsChanged = BusEvent.define(
    "mcp.tools.changed",
    z.object({
      server: z.string(),
    }),
  )

  export const BrowserOpenFailed = BusEvent.define(
    "mcp.browser.open.failed",
    z.object({
      mcpName: z.string(),
      url: z.string(),
    }),
  )

  export const Failed = NamedError.create(
    "MCPFailed",
    z.object({
      name: z.string(),
    }),
  )

  type MCPClient = Client

  export const Status = z
    .discriminatedUnion("status", [
      z
        .object({
          status: z.literal("connected"),
        })
        .meta({
          ref: "MCPStatusConnected",
        }),
      z
        .object({
          status: z.literal("disabled"),
        })
        .meta({
          ref: "MCPStatusDisabled",
        }),
      z
        .object({
          status: z.literal("failed"),
          error: z.string(),
        })
        .meta({
          ref: "MCPStatusFailed",
        }),
      z
        .object({
          status: z.literal("needs_auth"),
        })
        .meta({
          ref: "MCPStatusNeedsAuth",
        }),
      z
        .object({
          status: z.literal("needs_client_registration"),
          error: z.string(),
        })
        .meta({
          ref: "MCPStatusNeedsClientRegistration",
        }),
    ])
    .meta({
      ref: "MCPStatus",
    })
  export type Status = z.infer<typeof Status>

  // Register notification handlers for MCP client
  function registerNotificationHandlers(client: MCPClient, serverName: string) {
    client.setNotificationHandler(ToolListChangedNotificationSchema, async () => {
      log.info("tools list changed notification received", { server: serverName })
      Bus.publish(ToolsChanged, { server: serverName })
    })
  }

  // Convert MCP tool definition to AI SDK Tool type
  async function convertMcpTool(mcpTool: MCPToolDef, client: MCPClient, timeout?: number): Promise<Tool> {
    const inputSchema = mcpTool.inputSchema

    // Spread first, then override type to ensure it's always "object"
    const schema: JSONSchema7 = {
      ...(inputSchema as JSONSchema7),
      type: "object",
      properties: (inputSchema.properties ?? {}) as JSONSchema7["properties"],
      additionalProperties: false,
    }

    return dynamicTool({
      description: mcpTool.description ?? "",
      inputSchema: jsonSchema(schema),
      execute: async (args: unknown) => {
        return client.callTool(
          {
            name: mcpTool.name,
            arguments: (args || {}) as Record<string, unknown>,
          },
          CallToolResultSchema,
          {
            resetTimeoutOnProgress: true,
            timeout,
          },
        )
      },
    })
  }



  // Prompt cache types
  type PromptInfo = Awaited<ReturnType<MCPClient["listPrompts"]>>["prompts"][number]

  type ResourceInfo = Awaited<ReturnType<MCPClient["listResources"]>>["resources"][number]
  type McpEntry = NonNullable<Config.Info["mcp"]>[string]
  function isMcpConfigured(entry: McpEntry): entry is Config.Mcp {
    return typeof entry === "object" && entry !== null && "type" in entry
  }

  const state = Instance.state(
    async () => {
      const cfg = await Config.get()
      const config = cfg.mcp ?? {}
      const clients: Record<string, MCPClient> = {}
      const status: Record<string, Status> = {}

      await Promise.all(
        Object.entries(config).map(async ([key, mcp]) => {
          if (!isMcpConfigured(mcp)) {
            log.error("Ignoring MCP config entry without type", { key })
            return
          }

          // If disabled by config, mark as disabled without trying to connect
          if (mcp.enabled === false) {
            status[key] = { status: "disabled" }
            return
          }

          const result = await create(key, mcp).catch(() => undefined)
          if (!result) return

          status[key] = result.status

          if (result.mcpClient) {
            clients[key] = result.mcpClient
          }
        }),
      )
      return {
        status,
        clients,
      }
    },
    async (state) => {
      await Promise.all(
        Object.values(state.clients).map((client) =>
          client.close().catch((error) => {
            log.error("Failed to close MCP client", {
              error,
            })
          }),
        ),
      )
    },
  )

  // Helper function to fetch prompts for a specific client
  async function fetchPromptsForClient(clientName: string, client: Client) {
    const prompts = await client.listPrompts().catch((e) => {
      log.error("failed to get prompts", { clientName, error: e.message })
      return undefined
    })

    if (!prompts) {
      return
    }

    const commands: Record<string, PromptInfo & { client: string }> = {}

    for (const prompt of prompts.prompts) {
      const sanitizedClientName = clientName.replace(/[^a-zA-Z0-9_-]/g, "_")
      const sanitizedPromptName = prompt.name.replace(/[^a-zA-Z0-9_-]/g, "_")
      const key = sanitizedClientName + ":" + sanitizedPromptName

      commands[key] = { ...prompt, client: clientName }
    }
    return commands
  }

  async function fetchResourcesForClient(clientName: string, client: Client) {
    const resources = await client.listResources().catch((e) => {
      log.error("failed to get prompts", { clientName, error: e.message })
      return undefined
    })

    if (!resources) {
      return
    }

    const commands: Record<string, ResourceInfo & { client: string }> = {}

    for (const resource of resources.resources) {
      const sanitizedClientName = clientName.replace(/[^a-zA-Z0-9_-]/g, "_")
      const sanitizedResourceName = resource.name.replace(/[^a-zA-Z0-9_-]/g, "_")
      const key = sanitizedClientName + ":" + sanitizedResourceName

      commands[key] = { ...resource, client: clientName }
    }
    return commands
  }

  export async function add(name: string, mcp: Config.Mcp) {
    const s = await state()
    const result = await create(name, mcp)
    if (!result) {
      const status = {
        status: "failed" as const,
        error: "unknown error",
      }
      s.status[name] = status
      return {
        status,
      }
    }
    if (!result.mcpClient) {
      s.status[name] = result.status
      return {
        status: s.status,
      }
    }
    // Close existing client if present to prevent memory leaks
    const existingClient = s.clients[name]
    if (existingClient) {
      await existingClient.close().catch((error) => {
        log.error("Failed to close existing MCP client", { name, error })
      })
    }
    s.clients[name] = result.mcpClient
    s.status[name] = result.status

    return {
      status: s.status,
    }
  }

  async function create(key: string, mcp: Config.Mcp) {
    if (mcp.enabled === false) {
      log.info("mcp server disabled", { key })
      return {
        mcpClient: undefined,
        status: { status: "disabled" as const },
      }
    }

    log.info("found", { key, type: mcp.type })
    let mcpClient: MCPClient | undefined
    let status: Status | undefined = undefined

    // Only local MCP servers are supported
    if (mcp.type !== "local") {
      log.error("Only local MCP servers are supported", { key, type: mcp.type })
      return {
        mcpClient: undefined,
        status: {
          status: "failed" as const,
          error: "Only local MCP servers are supported. Remote MCP servers have been disabled.",
        },
      }
    }

    // Local MCP server connection
      const [cmd, ...args] = mcp.command
      const cwd = Instance.directory
      const transport = new StdioClientTransport({
        stderr: "pipe",
        command: cmd,
        args,
        cwd,
        env: {
          ...process.env,
          ...(cmd === "opencode" ? { BUN_BE_BUN: "1" } : {}),
          ...mcp.environment,
        },
      })
      transport.stderr?.on("data", (chunk: Buffer) => {
        log.info(`mcp stderr: ${chunk.toString()}`, { key })
      })

      const connectTimeout = mcp.timeout ?? DEFAULT_TIMEOUT
      try {
        const client = new Client({
          name: "opencode",
          version: Installation.VERSION,
        })
        await withTimeout(client.connect(transport), connectTimeout)
        registerNotificationHandlers(client, key)
        mcpClient = client
        status = {
          status: "connected",
        }
      } catch (error) {
        log.error("local mcp startup failed", {
          key,
          command: mcp.command,
          cwd,
          error: error instanceof Error ? error.message : String(error),
        })
        status = {
          status: "failed" as const,
          error: error instanceof Error ? error.message : String(error),
        }
      }
    }

    if (!status) {
      status = {
        status: "failed" as const,
        error: "Unknown error",
      }
    }

    if (!mcpClient) {
      return {
        mcpClient: undefined,
        status,
      }
    }

    const result = await withTimeout(mcpClient.listTools(), mcp.timeout ?? DEFAULT_TIMEOUT).catch((err) => {
      log.error("failed to get tools from client", { key, error: err })
      return undefined
    })
    if (!result) {
      await mcpClient.close().catch((error) => {
        log.error("Failed to close MCP client", {
          error,
        })
      })
      status = {
        status: "failed",
        error: "Failed to get tools",
      }
      return {
        mcpClient: undefined,
        status: {
          status: "failed" as const,
          error: "Failed to get tools",
        },
      }
    }

    log.info("create() successfully created client", { key, toolCount: result.tools.length })
    return {
      mcpClient,
      status,
    }
  }

  export async function status() {
    const s = await state()
    const cfg = await Config.get()
    const config = cfg.mcp ?? {}
    const result: Record<string, Status> = {}

    // Include all configured MCPs from config, not just connected ones
    for (const [key, mcp] of Object.entries(config)) {
      if (!isMcpConfigured(mcp)) continue
      result[key] = s.status[key] ?? { status: "disabled" }
    }

    return result
  }

  export async function clients() {
    return state().then((state) => state.clients)
  }

  export async function connect(name: string) {
    const cfg = await Config.get()
    const config = cfg.mcp ?? {}
    const mcp = config[name]
    if (!mcp) {
      log.error("MCP config not found", { name })
      return
    }

    if (!isMcpConfigured(mcp)) {
      log.error("Ignoring MCP connect request for config without type", { name })
      return
    }

    const result = await create(name, { ...mcp, enabled: true })

    if (!result) {
      const s = await state()
      s.status[name] = {
        status: "failed",
        error: "Unknown error during connection",
      }
      return
    }

    const s = await state()
    s.status[name] = result.status
    if (result.mcpClient) {
      // Close existing client if present to prevent memory leaks
      const existingClient = s.clients[name]
      if (existingClient) {
        await existingClient.close().catch((error) => {
          log.error("Failed to close existing MCP client", { name, error })
        })
      }
      s.clients[name] = result.mcpClient
    }
  }

  export async function disconnect(name: string) {
    const s = await state()
    const client = s.clients[name]
    if (client) {
      await client.close().catch((error) => {
        log.error("Failed to close MCP client", { name, error })
      })
      delete s.clients[name]
    }
    s.status[name] = { status: "disabled" }
  }

  export async function tools() {
    const result: Record<string, Tool> = {}
    const s = await state()
    const cfg = await Config.get()
    const config = cfg.mcp ?? {}
    const clientsSnapshot = await clients()
    const defaultTimeout = cfg.experimental?.mcp_timeout

    for (const [clientName, client] of Object.entries(clientsSnapshot)) {
      // Only include tools from connected MCPs (skip disabled ones)
      if (s.status[clientName]?.status !== "connected") {
        continue
      }

      const toolsResult = await client.listTools().catch((e) => {
        log.error("failed to get tools", { clientName, error: e.message })
        const failedStatus = {
          status: "failed" as const,
          error: e instanceof Error ? e.message : String(e),
        }
        s.status[clientName] = failedStatus
        delete s.clients[clientName]
        return undefined
      })
      if (!toolsResult) {
        continue
      }
      const mcpConfig = config[clientName]
      const entry = isMcpConfigured(mcpConfig) ? mcpConfig : undefined
      const timeout = entry?.timeout ?? defaultTimeout
      for (const mcpTool of toolsResult.tools) {
        const sanitizedClientName = clientName.replace(/[^a-zA-Z0-9_-]/g, "_")
        const sanitizedToolName = mcpTool.name.replace(/[^a-zA-Z0-9_-]/g, "_")
        result[sanitizedClientName + "_" + sanitizedToolName] = await convertMcpTool(mcpTool, client, timeout)
      }
    }
    return result
  }

  export async function prompts() {
    const s = await state()
    const clientsSnapshot = await clients()

    const prompts = Object.fromEntries<PromptInfo & { client: string }>(
      (
        await Promise.all(
          Object.entries(clientsSnapshot).map(async ([clientName, client]) => {
            if (s.status[clientName]?.status !== "connected") {
              return []
            }

            return Object.entries((await fetchPromptsForClient(clientName, client)) ?? {})
          }),
        )
      ).flat(),
    )

    return prompts
  }

  export async function resources() {
    const s = await state()
    const clientsSnapshot = await clients()

    const result = Object.fromEntries<ResourceInfo & { client: string }>(
      (
        await Promise.all(
          Object.entries(clientsSnapshot).map(async ([clientName, client]) => {
            if (s.status[clientName]?.status !== "connected") {
              return []
            }

            return Object.entries((await fetchResourcesForClient(clientName, client)) ?? {})
          }),
        )
      ).flat(),
    )

    return result
  }

  export async function getPrompt(clientName: string, name: string, args?: Record<string, string>) {
    const clientsSnapshot = await clients()
    const client = clientsSnapshot[clientName]

    if (!client) {
      log.warn("client not found for prompt", {
        clientName,
      })
      return undefined
    }

    const result = await client
      .getPrompt({
        name: name,
        arguments: args,
      })
      .catch((e) => {
        log.error("failed to get prompt from MCP server", {
          clientName,
          promptName: name,
          error: e.message,
        })
        return undefined
      })

    return result
  }

  export async function readResource(clientName: string, resourceUri: string) {
    const clientsSnapshot = await clients()
    const client = clientsSnapshot[clientName]

    if (!client) {
      log.warn("client not found for prompt", {
        clientName: clientName,
      })
      return undefined
    }

    const result = await client
      .readResource({
        uri: resourceUri,
      })
      .catch((e) => {
        log.error("failed to get prompt from MCP server", {
          clientName: clientName,
          resourceUri: resourceUri,
          error: e.message,
        })
        return undefined
      })

    return result
  }

  // OAuth and remote MCP server functions have been removed
  // Only local MCP servers are supported
}
