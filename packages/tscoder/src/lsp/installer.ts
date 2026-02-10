import path from "path"
import os from "os"
import fs from "fs/promises"
import { Global } from "../global"
import { Log } from "../util/log"
import { BunProc } from "../bun"
import { $, file, writeFile, which, spawnAsync } from "@/platform"
import { Archive } from "../util/archive"

export namespace LSPInstaller {
  const log = Log.create({ service: "lsp.installer" })

  export interface InstallOptions {
    force?: boolean
    verbose?: boolean
  }

  export interface LSPPackage {
    id: string
    name: string
    description: string
    extensions: string[]
    install: (options?: InstallOptions) => Promise<boolean>
    isInstalled: () => Promise<boolean>
  }

  const pathExists = async (p: string) =>
    fs
      .stat(p)
      .then(() => true)
      .catch(() => false)

  // Python - Pyright
  export const Pyright: LSPPackage = {
    id: "pyright",
    name: "Pyright",
    description: "Python language server",
    extensions: [".py", ".pyi"],
    async install(options = {}) {
      const js = path.join(Global.Path.bin, "node_modules", "pyright", "dist", "pyright-langserver.js")
      if (!options.force && (await file(js).exists())) {
        log.info("Pyright is already installed", { path: js })
        return true
      }

      log.info("Installing Pyright...")
      try {
        const proc = spawnAsync([BunProc.which(), "install", "pyright"], {
          cwd: Global.Path.bin,
          env: { ...process.env, BUN_BE_BUN: "1" },
          stdout: options.verbose ? "inherit" : "pipe",
          stderr: options.verbose ? "inherit" : "pipe",
        })
        await new Promise((resolve) => proc.on("exit", resolve))
        log.info("Pyright installed successfully")
        return true
      } catch (error) {
        log.error("Failed to install Pyright", { error })
        return false
      }
    },
    async isInstalled() {
      const js = path.join(Global.Path.bin, "node_modules", "pyright", "dist", "pyright-langserver.js")
      return await file(js).exists()
    },
  }

  // Java - JDTLS
  export const JDTLS: LSPPackage = {
    id: "jdtls",
    name: "JDT Language Server",
    description: "Java language server (Eclipse JDTLS)",
    extensions: [".java"],
    async install(options = {}) {
      const distPath = path.join(Global.Path.bin, "jdtls")
      const launcherDir = path.join(distPath, "plugins")
      
      if (!options.force && (await pathExists(launcherDir))) {
        log.info("JDTLS is already installed", { path: distPath })
        return true
      }

      log.info("Installing JDTLS...")
      try {
        await fs.mkdir(distPath, { recursive: true })
        const releaseURL = "https://www.eclipse.org/downloads/download.php?file=/jdtls/snapshots/jdt-language-server-latest.tar.gz"
        const archiveName = "release.tar.gz"

        log.info("Downloading JDTLS archive...")
        const curlResult = await $`curl -L -o ${archiveName} '${releaseURL}'`.cwd(distPath).quiet().nothrow()
        if (curlResult.exitCode !== 0) {
          log.error("Failed to download JDTLS")
          return false
        }

        log.info("Extracting JDTLS archive...")
        const tarResult = await $`tar -xzf ${archiveName}`.cwd(distPath).quiet().nothrow()
        if (tarResult.exitCode !== 0) {
          log.error("Failed to extract JDTLS")
          return false
        }

        await fs.rm(path.join(distPath, archiveName), { force: true })
        log.info("JDTLS installed successfully")
        return true
      } catch (error) {
        log.error("Failed to install JDTLS", { error })
        return false
      }
    },
    async isInstalled() {
      const launcherDir = path.join(Global.Path.bin, "jdtls", "plugins")
      return await pathExists(launcherDir)
    },
  }

  // TypeScript/JavaScript - typescript-language-server
  export const TypeScript: LSPPackage = {
    id: "typescript",
    name: "TypeScript Language Server",
    description: "TypeScript and JavaScript language server",
    extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"],
    async install(options = {}) {
      const js = path.join(Global.Path.bin, "node_modules", "typescript-language-server", "lib", "cli.js")

      if (!options.force && (await file(js).exists())) {
        log.info("TypeScript Language Server is already installed", { path: js })
        return true
      }

      log.info("Installing TypeScript Language Server...")
      try {
        const proc = spawnAsync([BunProc.which(), "install", "typescript-language-server", "typescript"], {
          cwd: Global.Path.bin,
          env: { ...process.env, BUN_BE_BUN: "1" },
          stdout: options.verbose ? "inherit" : "pipe",
          stderr: options.verbose ? "inherit" : "pipe",
        })
        await new Promise((resolve) => proc.on("exit", resolve))
        log.info("TypeScript Language Server installed successfully")
        return true
      } catch (error) {
        log.error("Failed to install TypeScript Language Server", { error })
        return false
      }
    },
    async isInstalled() {
      const js = path.join(Global.Path.bin, "node_modules", "typescript-language-server", "lib", "cli.js")
      return await file(js).exists()
    },
  }

  // Vue
  export const Vue: LSPPackage = {
    id: "vue",
    name: "Vue Language Server",
    description: "Vue.js language server",
    extensions: [".vue"],
    async install(options = {}) {
      const js = path.join(Global.Path.bin, "node_modules", "@vue", "language-server", "bin", "vue-language-server.js")

      if (!options.force && (await file(js).exists())) {
        log.info("Vue Language Server is already installed", { path: js })
        return true
      }

      log.info("Installing Vue Language Server...")
      try {
        const proc = spawnAsync([BunProc.which(), "install", "@vue/language-server"], {
          cwd: Global.Path.bin,
          env: { ...process.env, BUN_BE_BUN: "1" },
          stdout: options.verbose ? "inherit" : "pipe",
          stderr: options.verbose ? "inherit" : "pipe",
        })
        await new Promise((resolve) => proc.on("exit", resolve))
        log.info("Vue Language Server installed successfully")
        return true
      } catch (error) {
        log.error("Failed to install Vue Language Server", { error })
        return false
      }
    },
    async isInstalled() {
      const js = path.join(Global.Path.bin, "node_modules", "@vue", "language-server", "bin", "vue-language-server.js")
      return await file(js).exists()
    },
  }

  // ESLint
  export const ESLint: LSPPackage = {
    id: "eslint",
    name: "ESLint Language Server",
    description: "ESLint language server (VS Code ESLint)",
    extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts", ".vue"],
    async install(options = {}) {
      const serverPath = path.join(Global.Path.bin, "vscode-eslint", "server", "out", "eslintServer.js")

      if (!options.force && (await file(serverPath).exists())) {
        log.info("ESLint Language Server is already installed", { path: serverPath })
        return true
      }

      log.info("Installing ESLint Language Server...")
      try {
        const response = await fetch("https://github.com/microsoft/vscode-eslint/archive/refs/heads/main.zip")
        if (!response.ok) {
          log.error("Failed to download VS Code ESLint server")
          return false
        }

        const zipPath = path.join(Global.Path.bin, "vscode-eslint.zip")
        const responseBuffer = Buffer.from(await response.arrayBuffer())
        await writeFile(zipPath, responseBuffer)

        const ok = await Archive.extractZip(zipPath, Global.Path.bin)
          .then(() => true)
          .catch((error) => {
            log.error("Failed to extract vscode-eslint archive", { error })
            return false
          })
        if (!ok) return false

        await fs.rm(zipPath, { force: true })

        const extractedPath = path.join(Global.Path.bin, "vscode-eslint-main")
        const finalPath = path.join(Global.Path.bin, "vscode-eslint")

        const stats = await fs.stat(finalPath).catch(() => undefined)
        if (stats) {
          await fs.rm(finalPath, { force: true, recursive: true })
        }
        await fs.rename(extractedPath, finalPath)

        const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm"
        await $`${npmCmd} install`.cwd(finalPath).quiet()
        await $`${npmCmd} run compile`.cwd(finalPath).quiet()

        log.info("ESLint Language Server installed successfully")
        return true
      } catch (error) {
        log.error("Failed to install ESLint Language Server", { error })
        return false
      }
    },
    async isInstalled() {
      const serverPath = path.join(Global.Path.bin, "vscode-eslint", "server", "out", "eslintServer.js")
      return await file(serverPath).exists()
    },
  }

  // Go - Gopls
  export const Gopls: LSPPackage = {
    id: "gopls",
    name: "Gopls",
    description: "Go language server",
    extensions: [".go"],
    async install(options = {}) {
      const bin = path.join(Global.Path.bin, "gopls" + (process.platform === "win32" ? ".exe" : ""))

      if (!options.force && (await pathExists(bin))) {
        log.info("Gopls is already installed", { path: bin })
        return true
      }

      if (!which("go")) {
        log.error("Go is required to install Gopls. Please install Go first.")
        return false
      }

      log.info("Installing Gopls...")
      try {
        const proc = spawnAsync(["go", "install", "golang.org/x/tools/gopls@latest"], {
          cwd: Global.Path.bin,
          env: { ...process.env, GOBIN: Global.Path.bin },
          stdout: options.verbose ? "inherit" : "pipe",
          stderr: options.verbose ? "inherit" : "pipe",
        })
        await new Promise((resolve) => proc.on("exit", resolve))
        log.info("Gopls installed successfully")
        return true
      } catch (error) {
        log.error("Failed to install Gopls", { error })
        return false
      }
    },
    async isInstalled() {
      const bin = path.join(Global.Path.bin, "gopls" + (process.platform === "win32" ? ".exe" : ""))
      return await pathExists(bin)
    },
  }

  // Rust - rust-analyzer
  export const RustAnalyzer: LSPPackage = {
    id: "rust",
    name: "Rust Analyzer",
    description: "Rust language server",
    extensions: [".rs"],
    async install(options = {}) {
      const bin = path.join(Global.Path.bin, "rust-analyzer" + (process.platform === "win32" ? ".exe" : ""))
      
      if (!options.force && (await pathExists(bin))) {
        log.info("Rust Analyzer is already installed", { path: bin })
        return true
      }

      log.info("Installing Rust Analyzer...")
      try {
        const platform = process.platform
        const arch = process.arch
        
        let target = ""
        if (platform === "darwin" && arch === "arm64") target = "aarch64-apple-darwin"
        else if (platform === "darwin" && arch === "x64") target = "x86_64-apple-darwin"
        else if (platform === "linux" && arch === "arm64") target = "aarch64-unknown-linux-gnu"
        else if (platform === "linux" && arch === "x64") target = "x86_64-unknown-linux-gnu"
        else if (platform === "win32" && arch === "x64") target = "x86_64-pc-windows-msvc"
        else {
          log.error(`Platform ${platform}/${arch} is not supported for Rust Analyzer`)
          return false
        }

        const downloadUrl = `https://github.com/rust-lang/rust-analyzer/releases/latest/download/rust-analyzer-${target}.gz`
        const archivePath = path.join(Global.Path.bin, "rust-analyzer.gz")

        const response = await fetch(downloadUrl)
        if (!response.ok) {
          log.error("Failed to download Rust Analyzer")
          return false
        }

        const responseBuffer = Buffer.from(await response.arrayBuffer())
        await writeFile(archivePath, responseBuffer)
        
        // Decompress gzip
        await $`gunzip -f ${archivePath}`.cwd(Global.Path.bin).quiet().nothrow()
        
        if (platform !== "win32") {
          await $`chmod +x ${bin}`.quiet().nothrow()
        }
        
        log.info("Rust Analyzer installed successfully")
        return true
      } catch (error) {
        log.error("Failed to install Rust Analyzer", { error })
        return false
      }
    },
    async isInstalled() {
      const bin = path.join(Global.Path.bin, "rust-analyzer" + (process.platform === "win32" ? ".exe" : ""))
      return await pathExists(bin)
    },
  }

  // Lua - lua-language-server
  export const LuaLS: LSPPackage = {
    id: "lua-ls",
    name: "Lua Language Server",
    description: "Lua language server",
    extensions: [".lua"],
    async install(options = {}) {
      const binName = process.platform === "win32" ? "lua-language-server.exe" : "lua-language-server"
      const bin = path.join(Global.Path.bin, "lua-ls", "bin", binName)
      
      if (!options.force && (await pathExists(bin))) {
        log.info("Lua Language Server is already installed", { path: bin })
        return true
      }

      log.info("Installing Lua Language Server...")
      try {
        const response = await fetch("https://api.github.com/repos/LuaLS/lua-language-server/releases/latest")
        if (!response.ok) {
          log.error("Failed to fetch Lua LS release info")
          return false
        }

        const release = await response.json()
        const platform = process.platform
        const arch = process.arch
        
        let assetName = ""
        if (platform === "darwin" && arch === "arm64") assetName = "lua-language-server-darwin-arm64.tar.gz"
        else if (platform === "darwin" && arch === "x64") assetName = "lua-language-server-darwin-x64.tar.gz"
        else if (platform === "linux" && arch === "arm64") assetName = "lua-language-server-linux-arm64.tar.gz"
        else if (platform === "linux" && arch === "x64") assetName = "lua-language-server-linux-x64.tar.gz"
        else if (platform === "win32" && arch === "x64") assetName = "lua-language-server-win32-x64.zip"
        else {
          log.error(`Platform ${platform}/${arch} is not supported by Lua Language Server`)
          return false
        }

        const asset = release.assets.find((a: any) => a.name === assetName)
        if (!asset) {
          log.error(`Could not find asset ${assetName} in latest Lua LS release`)
          return false
        }

        const downloadResponse = await fetch(asset.browser_download_url)
        if (!downloadResponse.ok) {
          log.error("Failed to download Lua Language Server")
          return false
        }

        const tempPath = path.join(Global.Path.bin, assetName)
        const responseBuffer = Buffer.from(await downloadResponse.arrayBuffer())
        await writeFile(tempPath, responseBuffer)

        const extractPath = path.join(Global.Path.bin, "lua-ls")
        await fs.mkdir(extractPath, { recursive: true })

        if (assetName.endsWith(".zip")) {
          await Archive.extractZip(tempPath, extractPath)
        } else {
          await $`tar -xzf ${tempPath}`.cwd(extractPath).quiet()
        }

        await fs.rm(tempPath, { force: true })
        log.info("Lua Language Server installed successfully")
        return true
      } catch (error) {
        log.error("Failed to install Lua Language Server", { error })
        return false
      }
    },
    async isInstalled() {
      const binName = process.platform === "win32" ? "lua-language-server.exe" : "lua-language-server"
      const bin = path.join(Global.Path.bin, "lua-ls", "bin", binName)
      return await pathExists(bin)
    },
  }

  // YAML
  export const YAMLLS: LSPPackage = {
    id: "yaml",
    name: "YAML Language Server",
    description: "YAML language server",
    extensions: [".yaml", ".yml"],
    async install(options = {}) {
      const js = path.join(Global.Path.bin, "node_modules", "yaml-language-server", "bin", "yaml-language-server")

      if (!options.force && (await file(js).exists())) {
        log.info("YAML Language Server is already installed", { path: js })
        return true
      }

      log.info("Installing YAML Language Server...")
      try {
        const proc = spawnAsync([BunProc.which(), "install", "yaml-language-server"], {
          cwd: Global.Path.bin,
          env: { ...process.env, BUN_BE_BUN: "1" },
          stdout: options.verbose ? "inherit" : "pipe",
          stderr: options.verbose ? "inherit" : "pipe",
        })
        await new Promise((resolve) => proc.on("exit", resolve))
        log.info("YAML Language Server installed successfully")
        return true
      } catch (error) {
        log.error("Failed to install YAML Language Server", { error })
        return false
      }
    },
    async isInstalled() {
      const js = path.join(Global.Path.bin, "node_modules", "yaml-language-server", "bin", "yaml-language-server")
      return await file(js).exists()
    },
  }

  // JSON
  export const JSONLS: LSPPackage = {
    id: "json",
    name: "JSON Language Server",
    description: "JSON language server (VS Code JSON)",
    extensions: [".json"],
    async install(options = {}) {
      const js = path.join(Global.Path.bin, "node_modules", "vscode-json-languageserver", "bin", "vscode-json-languageserver")

      if (!options.force && (await file(js).exists())) {
        log.info("JSON Language Server is already installed", { path: js })
        return true
      }

      log.info("Installing JSON Language Server...")
      try {
        const proc = spawnAsync([BunProc.which(), "install", "vscode-json-languageserver"], {
          cwd: Global.Path.bin,
          env: { ...process.env, BUN_BE_BUN: "1" },
          stdout: options.verbose ? "inherit" : "pipe",
          stderr: options.verbose ? "inherit" : "pipe",
        })
        await new Promise((resolve) => proc.on("exit", resolve))
        log.info("JSON Language Server installed successfully")
        return true
      } catch (error) {
        log.error("Failed to install JSON Language Server", { error })
        return false
      }
    },
    async isInstalled() {
      const js = path.join(Global.Path.bin, "node_modules", "vscode-json-languageserver", "bin", "vscode-json-languageserver")
      return await file(js).exists()
    },
  }

  // Docker
  export const DockerfileLS: LSPPackage = {
    id: "dockerfile",
    name: "Dockerfile Language Server",
    description: "Dockerfile language server",
    extensions: [".dockerfile", "Dockerfile"],
    async install(options = {}) {
      const js = path.join(Global.Path.bin, "node_modules", "dockerfile-language-server-nodejs", "lib", "server.js")

      if (!options.force && (await file(js).exists())) {
        log.info("Dockerfile Language Server is already installed", { path: js })
        return true
      }

      log.info("Installing Dockerfile Language Server...")
      try {
        const proc = spawnAsync([BunProc.which(), "install", "dockerfile-language-server-nodejs"], {
          cwd: Global.Path.bin,
          env: { ...process.env, BUN_BE_BUN: "1" },
          stdout: options.verbose ? "inherit" : "pipe",
          stderr: options.verbose ? "inherit" : "pipe",
        })
        await new Promise((resolve) => proc.on("exit", resolve))
        log.info("Dockerfile Language Server installed successfully")
        return true
      } catch (error) {
        log.error("Failed to install Dockerfile Language Server", { error })
        return false
      }
    },
    async isInstalled() {
      const js = path.join(Global.Path.bin, "node_modules", "dockerfile-language-server-nodejs", "lib", "server.js")
      return await file(js).exists()
    },
  }

  // Bash
  export const BashLS: LSPPackage = {
    id: "bash",
    name: "Bash Language Server",
    description: "Bash shell script language server",
    extensions: [".sh", ".bash"],
    async install(options = {}) {
      const js = path.join(Global.Path.bin, "node_modules", "bash-language-server", "out", "cli.js")

      if (!options.force && (await file(js).exists())) {
        log.info("Bash Language Server is already installed", { path: js })
        return true
      }

      log.info("Installing Bash Language Server...")
      try {
        const proc = spawnAsync([BunProc.which(), "install", "bash-language-server"], {
          cwd: Global.Path.bin,
          env: { ...process.env, BUN_BE_BUN: "1" },
          stdout: options.verbose ? "inherit" : "pipe",
          stderr: options.verbose ? "inherit" : "pipe",
        })
        await new Promise((resolve) => proc.on("exit", resolve))
        log.info("Bash Language Server installed successfully")
        return true
      } catch (error) {
        log.error("Failed to install Bash Language Server", { error })
        return false
      }
    },
    async isInstalled() {
      const js = path.join(Global.Path.bin, "node_modules", "bash-language-server", "out", "cli.js")
      return await file(js).exists()
    },
  }

  // All available packages
  export const AllPackages: LSPPackage[] = [
    Pyright,
    JDTLS,
    TypeScript,
    Vue,
    ESLint,
    Gopls,
    RustAnalyzer,
    LuaLS,
    YAMLLS,
    JSONLS,
    DockerfileLS,
    BashLS,
  ]

  // Install all packages
  export async function installAll(options: InstallOptions = {}): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>()
    
    log.info("Starting installation of all LSP packages...")
    
    for (const pkg of AllPackages) {
      log.info(`Installing ${pkg.name}...`)
      const success = await pkg.install(options)
      results.set(pkg.id, success)
      
      if (success) {
        log.info(`�?${pkg.name} installed successfully`)
      } else {
        log.error(`�?${pkg.name} installation failed`)
      }
    }
    
    const successCount = Array.from(results.values()).filter(Boolean).length
    log.info(`Installation complete: ${successCount}/${AllPackages.length} packages installed`)
    
    return results
  }

  // Check status of all packages
  export async function checkAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>()
    
    for (const pkg of AllPackages) {
      const installed = await pkg.isInstalled()
      results.set(pkg.id, installed)
    }
    
    return results
  }

  // Get package by ID
  export function getPackage(id: string): LSPPackage | undefined {
    return AllPackages.find((pkg) => pkg.id === id)
  }

  // Install specific packages
  export async function installPackages(ids: string[], options: InstallOptions = {}): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>()
    
    for (const id of ids) {
      const pkg = getPackage(id)
      if (!pkg) {
        log.error(`Unknown package: ${id}`)
        results.set(id, false)
        continue
      }
      
      const success = await pkg.install(options)
      results.set(id, success)
    }
    
    return results
  }
}
