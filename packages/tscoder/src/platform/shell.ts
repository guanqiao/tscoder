import { spawn, type SpawnOptions, type ChildProcess } from "child_process"
import { promisify } from "util"
import { exec } from "child_process"

const execAsync = promisify(exec)

export interface ShellOptions {
  cwd?: string
  env?: Record<string, string | undefined>
  quiet?: boolean
  nothrow?: boolean
  timeout?: number
}

export interface ShellResult {
  stdout: string
  stderr: string
  exitCode: number
}

export class ShellCommand {
  private command: string
  private args: string[]
  private options: ShellOptions = {}

  constructor(strings: TemplateStringsArray, ...values: unknown[]) {
    const parts: string[] = []
    for (let i = 0; i < strings.length; i++) {
      parts.push(strings[i])
      if (i < values.length) {
        const value = values[i]
        if (Array.isArray(value)) {
          parts.push(value.join(" "))
        } else {
          parts.push(String(value))
        }
      }
    }
    const fullCommand = parts.join("").trim()
    const parts2 = fullCommand.split(/\s+/)
    this.command = parts2[0] || ""
    this.args = parts2.slice(1)
  }

  cwd(dir: string): this {
    this.options.cwd = dir
    return this
  }

  quiet(): this {
    this.options.quiet = true
    return this
  }

  nothrow(): this {
    this.options.nothrow = true
    return this
  }

  async text(): Promise<string> {
    const result = await this.execute()
    return result.stdout
  }

  async json<T>(): Promise<T> {
    const text = await this.text()
    return JSON.parse(text) as T
  }

  private async execute(): Promise<ShellResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.command, this.args, {
        cwd: this.options.cwd,
        env: { ...process.env, ...this.options.env },
        shell: true,
        stdio: this.options.quiet ? ["ignore", "pipe", "pipe"] : "inherit",
      })

      let stdout = ""
      let stderr = ""

      if (child.stdout) {
        child.stdout.on("data", (data) => {
          stdout += data.toString()
        })
      }

      if (child.stderr) {
        child.stderr.on("data", (data) => {
          stderr += data.toString()
        })
      }

      child.on("close", (code) => {
        const result: ShellResult = {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code ?? 0,
        }
        if (code !== 0 && !this.options.nothrow) {
          reject(new Error(`Command failed with exit code ${code}: ${stderr}`))
        } else {
          resolve(result)
        }
      })

      child.on("error", (error) => {
        if (this.options.nothrow) {
          resolve({
            stdout: "",
            stderr: error.message,
            exitCode: 1,
          })
        } else {
          reject(error)
        }
      })
    })
  }
}

export function $(strings: TemplateStringsArray, ...values: unknown[]): ShellCommand {
  return new ShellCommand(strings, ...values)
}

export interface SpawnResult {
  stdout: NodeJS.ReadableStream | null
  stderr: NodeJS.ReadableStream | null
  exited: Promise<number>
  exitCode: number | null
  kill(signal?: NodeJS.Signals): boolean
}

export function spawnAsync(
  command: string[],
  options: {
    cwd?: string
    env?: Record<string, string | undefined>
    stdout?: "pipe" | "inherit" | "ignore"
    stderr?: "pipe" | "inherit" | "ignore"
    stdin?: "pipe" | "inherit" | "ignore"
  } = {}
): SpawnResult {
  const [cmd, ...args] = command
  const child = spawn(cmd, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    stdio: [
      options.stdin ?? "ignore",
      options.stdout ?? "inherit",
      options.stderr ?? "inherit",
    ],
  })

  const exited = new Promise<number>((resolve) => {
    child.on("close", (code) => resolve(code ?? 0))
    child.on("exit", (code) => resolve(code ?? 0))
  })

  return {
    stdout: child.stdout,
    stderr: child.stderr,
    exited,
    exitCode: null,
    kill: (signal?: NodeJS.Signals) => {
      if (!child.killed) {
        child.kill(signal)
        return true
      }
      return false
    },
  }
}

export async function streamToText(stream: ReadableStream<Uint8Array> | NodeJS.ReadableStream | null): Promise<string> {
  if (!stream) return ""
  
  if ("getReader" in stream) {
    // Web ReadableStream
    const reader = stream.getReader()
    const chunks: Uint8Array[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    const decoder = new TextDecoder()
    return chunks.map(c => decoder.decode(c)).join("")
  } else {
    // Node.js ReadableStream
    return new Promise((resolve, reject) => {
      let data = ""
      stream.on("data", (chunk) => {
        data += chunk.toString()
      })
      stream.on("end", () => resolve(data))
      stream.on("error", reject)
    })
  }
}
