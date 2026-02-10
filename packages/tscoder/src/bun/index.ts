import z from "zod"
import { Global } from "../global"
import { Log } from "../util/log"
import path from "path"
import { Filesystem } from "../util/filesystem"
import { NamedError } from "@tscoder/util/error"
import { Lock } from "../util/lock"
import { PackageRegistry } from "./registry"
import { proxied } from "@/util/proxied"
import { spawnAsync, which, file, writeFile } from "@/platform"
import { spawn } from "child_process"

export namespace BunProc {
  const log = Log.create({ service: "bun" })

  export async function run(cmd: string[], options?: { cwd?: string; env?: Record<string, string> }) {
    log.info("running", {
      cmd: [which(), ...cmd],
      ...options,
    })

    const proc = spawn(which(), cmd, {
      cwd: options?.cwd,
      env: {
        ...process.env,
        ...options?.env,
        BUN_BE_BUN: "1",
      },
    })

    let stdout = ""
    let stderr = ""

    proc.stdout?.on("data", (data) => {
      stdout += data.toString()
    })

    proc.stderr?.on("data", (data) => {
      stderr += data.toString()
    })

    const code = await new Promise<number>((resolve) => {
      proc.on("exit", (exitCode) => {
        resolve(exitCode ?? 0)
      })
    })

    log.info("done", {
      code,
      stdout,
      stderr,
    })

    if (code !== 0) {
      throw new Error(`Command failed with exit code ${code}`)
    }

    return { exitCode: code, stdout, stderr }
  }

  export function which() {
    return process.execPath
  }

  export const InstallFailedError = NamedError.create(
    "BunInstallFailedError",
    z.object({
      pkg: z.string(),
      version: z.string(),
    }),
  )

  export async function install(pkg: string, version = "latest") {
    // Use lock to ensure only one install at a time
    using _ = await Lock.write("bun-install")

    const mod = path.join(Global.Path.cache, "node_modules", pkg)
    const pkgjsonPath = path.join(Global.Path.cache, "package.json")
    const pkgjson = file(pkgjsonPath)

    let parsed: { dependencies: Record<string, string> }
    try {
      const content = await pkgjson.text()
      parsed = JSON.parse(content)
    } catch {
      parsed = { dependencies: {} }
      await writeFile(pkgjsonPath, JSON.stringify(parsed, null, 2))
    }

    const dependencies = parsed.dependencies ?? {}
    if (!parsed.dependencies) parsed.dependencies = dependencies
    const modExists = await Filesystem.exists(mod)
    const cachedVersion = dependencies[pkg]

    if (!modExists || !cachedVersion) {
      // continue to install
    } else if (version !== "latest" && cachedVersion === version) {
      return mod
    } else if (version === "latest") {
      const isOutdated = await PackageRegistry.isOutdated(pkg, cachedVersion, Global.Path.cache)
      if (!isOutdated) return mod
      log.info("Cached version is outdated, proceeding with install", { pkg, cachedVersion })
    }

    // Build command arguments
    const args = [
      "add",
      "--force",
      "--exact",
      // TODO: get rid of this case (see: https://github.com/oven-sh/bun/issues/19936)
      ...(proxied() ? ["--no-cache"] : []),
      "--cwd",
      Global.Path.cache,
      pkg + "@" + version,
    ]

    // Let Bun handle registry resolution:
    // - If .npmrc files exist, Bun will use them automatically
    // - If no .npmrc files exist, Bun will default to https://registry.npmjs.org
    // - No need to pass --registry flag
    log.info("installing package using Bun's default registry resolution", {
      pkg,
      version,
    })

    await BunProc.run(args, {
      cwd: Global.Path.cache,
    }).catch((e) => {
      throw new InstallFailedError(
        { pkg, version },
        {
          cause: e,
        },
      )
    })

    // Resolve actual version from installed package when using "latest"
    // This ensures subsequent starts use the cached version until explicitly updated
    let resolvedVersion = version
    if (version === "latest") {
      const installedPkgJsonPath = path.join(mod, "package.json")
      try {
        const content = await file(installedPkgJsonPath).text()
        const installedPkg = JSON.parse(content)
        if (installedPkg?.version) {
          resolvedVersion = installedPkg.version
        }
      } catch {
        // ignore
      }
    }

    parsed.dependencies[pkg] = resolvedVersion
    await writeFile(pkgjsonPath, JSON.stringify(parsed, null, 2))
    return mod
  }
}
