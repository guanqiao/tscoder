import type { Argv } from "yargs"
import { LSPInstaller } from "../../lsp/installer"
import { cmd } from "./cmd"
import { UI } from "../ui"

export const LspInstallCommand = cmd({
  command: "lsp-install [servers..]",
  describe: "Install LSP (Language Server Protocol) servers for local use",
  builder: (yargs: Argv) => {
    return yargs
      .positional("servers", {
        describe: "LSP servers to install (e.g., python java typescript). Use 'all' to install all servers.",
        type: "string",
        array: true,
      })
      .option("force", {
        describe: "Force reinstallation even if already installed",
        type: "boolean",
        default: false,
      })
      .option("verbose", {
        describe: "Show detailed installation output",
        type: "boolean",
        default: false,
      })
      .option("list", {
        describe: "List all available LSP servers",
        type: "boolean",
        default: false,
      })
      .option("check", {
        describe: "Check which LSP servers are installed",
        type: "boolean",
        default: false,
      })
  },
  handler: async (args) => {
    // List available servers
    if (args.list) {
      UI.println("\nAvailable LSP servers:\n")
      for (const pkg of LSPInstaller.AllPackages) {
        UI.println(`  ${UI.Style.TEXT_BOLD}${pkg.id.padEnd(15)}${UI.Style.TEXT_NORMAL} - ${pkg.name}`)
        UI.println(`  ${"".padEnd(15)}   ${pkg.description}`)
        UI.println(`  ${"".padEnd(15)}   Extensions: ${pkg.extensions.join(", ")}`)
        UI.println("")
      }
      UI.println("Usage:")
      UI.println("  opencode lsp-install all                    # Install all servers")
      UI.println("  opencode lsp-install python typescript      # Install specific servers")
      UI.println("  opencode lsp-install --force python         # Force reinstall")
      UI.println("  opencode lsp-install --check                # Check installed status")
      return
    }

    // Check installed status
    if (args.check) {
      UI.println("\nChecking LSP server installation status...\n")
      const status = await LSPInstaller.checkAll()
      
      let installedCount = 0
      for (const pkg of LSPInstaller.AllPackages) {
        const isInstalled = status.get(pkg.id) ?? false
        const statusIcon = isInstalled 
          ? UI.Style.TEXT_SUCCESS_BOLD + "\u2713" + UI.Style.TEXT_NORMAL
          : UI.Style.TEXT_ERROR_BOLD + "\u2717" + UI.Style.TEXT_NORMAL
        const statusText = isInstalled ? "installed" : "not installed"
        UI.println(`  ${statusIcon} ${pkg.id.padEnd(15)} - ${statusText}`)
        if (isInstalled) installedCount++
      }
      
      UI.println(`\n${installedCount}/${LSPInstaller.AllPackages.length} servers installed`)
      return
    }

    // Install servers
    const servers = args.servers || []
    
    if (servers.length === 0) {
      UI.println("No servers specified. Use --list to see available servers, or specify server names.")
      UI.println("")
      UI.println("Examples:")
      UI.println("  opencode lsp-install all")
      UI.println("  opencode lsp-install python java typescript eslint")
      return
    }

    const options = {
      force: args.force,
      verbose: args.verbose,
    }

    UI.println("\nInstalling LSP servers...\n")

    let results: Map<string, boolean>

    if (servers.includes("all")) {
      results = await LSPInstaller.installAll(options)
    } else {
      results = await LSPInstaller.installPackages(servers, options)
    }

    UI.println("\nInstallation Results:\n")
    
    let successCount = 0
    let failCount = 0
    
    for (const [id, success] of results) {
      const pkg = LSPInstaller.getPackage(id)
      const name = pkg?.name ?? id
      
      if (success) {
        UI.println(`  ${UI.Style.TEXT_SUCCESS_BOLD}\u2713${UI.Style.TEXT_NORMAL} ${name} - installed successfully`)
        successCount++
      } else {
        UI.println(`  ${UI.Style.TEXT_ERROR_BOLD}\u2717${UI.Style.TEXT_NORMAL} ${name} - installation failed`)
        failCount++
      }
    }

    UI.println(`\nSummary: ${successCount} succeeded, ${failCount} failed`)
    
    if (failCount > 0) {
      process.exit(1)
    }
  },
})
