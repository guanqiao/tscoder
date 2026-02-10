// 简单测试脚本验证重构后的 lsp/server.ts 可以正确导入
import { LSPServer } from "./src/lsp/server"

console.log("Testing LSP Server module imports...")

// 验证所有 LSP 服务器定义都存在
const servers = [
  LSPServer.Deno,
  LSPServer.Typescript,
  LSPServer.Vue,
  LSPServer.ESLint,
  LSPServer.Oxlint,
  LSPServer.Biome,
  LSPServer.Gopls,
  LSPServer.Rubocop,
  LSPServer.Ty,
  LSPServer.Pyright,
  LSPServer.ElixirLS,
  LSPServer.Zls,
  LSPServer.CSharp,
  LSPServer.FSharp,
  LSPServer.SourceKit,
  LSPServer.RustAnalyzer,
  LSPServer.Clangd,
  LSPServer.Svelte,
  LSPServer.Astro,
  LSPServer.JDTLS,
  LSPServer.KotlinLS,
  LSPServer.YamlLS,
  LSPServer.LuaLS,
  LSPServer.PHPIntelephense,
  LSPServer.Prisma,
  LSPServer.Dart,
