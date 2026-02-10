# OpenCode 离线部署指南

本文档介绍如何在受限且被监控的网络环境中部署和运行 OpenCode，避免运行时从网络下载资源。

**版本**: 1.2.0  
**更新日期**: 2026-02-10

---

## 目录

- [概述](#概述)
- [需要预下载的资源](#需要预下载的资源)
- [LSP 服务器离线安装](#lsp-服务器离线安装)
- [Parser 查询文件配置](#parser-查询文件配置)
- [模型 API 配置](#模型-api-配置)
  - [使用自定义 Provider](#使用自定义-provider)
  - [使用简化 LLM 配置（推荐）](#使用简化-llm-配置推荐)
  - [Ollama 本地模型配置](#ollama-本地模型配置)
  - [Privatemode AI 配置](#privatemode-ai-配置)
- [环境变量配置](#环境变量配置)
- [完整配置示例](#完整配置示例)
- [故障排除](#故障排除)

---

## 概述

OpenCode 在运行时会尝试从网络下载以下资源：

1. **LSP 语言服务器** - 按需自动下载
2. **Parser 查询文件** - 从 GitHub 下载 Tree-sitter 查询
3. **模型 API 调用** - 调用外部 AI 服务
4. **版本更新检查** - 检查新版本

在离线环境中，需要预先下载这些资源并配置本地源。

---

## 需要预下载的资源

### 1. LSP 服务器

| LSP 服务器 | 语言 | 下载来源 | 安装方式 |
|-----------|------|---------|---------|
| pyright | Python | npm registry | `bun install pyright` |
| jdtls | Java | Eclipse 官网 | curl 下载 tar.gz |
| typescript | TypeScript | npm registry | `bun install typescript-language-server` |
| vue | Vue | npm registry | `bun install @vue/language-server` |
| eslint | JavaScript | GitHub | fetch 下载 zip |
| gopls | Go | Go 代理 | `go install golang.org/x/tools/gopls@latest` |
| rust | Rust | GitHub Releases | fetch 下载 gzip |
| lua-ls | Lua | GitHub Releases | fetch 下载 tar.gz/zip |
| yaml | YAML | npm registry | `bun install yaml-language-server` |
| json | JSON | npm registry | `bun install vscode-json-languageserver` |
| dockerfile | Dockerfile | npm registry | `bun install dockerfile-language-server-nodejs` |
| bash | Bash | npm registry | `bun install bash-language-server` |

### 2. 额外 LSP 服务器（server.ts 中）

| LSP 服务器 | 下载来源 |
|-----------|---------|
| elixir-ls | `https://github.com/elixir-lsp/elixir-ls/archive/refs/heads/master.zip` |
| zls (Zig) | GitHub API: `api.github.com/repos/zigtools/zls/releases/latest` |
| clangd (C/C++) | GitHub API: `api.github.com/repos/clangd/clangd/releases/latest` |
| kotlin-ls | CDN: `https://download-cdn.jetbrains.com/kotlin-lsp/` |
| terraform-ls | GitHub API: `api.github.com/repos/hashicorp/terraform-ls/releases/latest` |
| texlab (LaTeX) | GitHub API: `api.github.com/repos/latex-lsp/texlab/releases/latest` |
| tinymist (Typst) | GitHub API: `api.github.com/repos/Myriad-Dreamin/tinymist/releases/latest` |

### 3. Parser 查询文件

从以下 URL 模式下载 Tree-sitter 查询文件：

```
https://raw.githubusercontent.com/nvim-treesitter/nvim-treesitter/refs/heads/master/queries/{language}/{type}.scm
```

涉及语言：Python、Rust、Go、C/C++、C#、Bash、Java、Ruby、PHP、Scala、JSON、YAML、Haskell、CSS、Julia、OCaml、Clojure、Swift、Nix

### 4. 配置文件 Schema

```
https://opencode.ai/config.json
```

---

## LSP 服务器离线安装

### 步骤 1：在可访问外网的机器上预下载

```bash
# 安装所有 LSP 服务器
opencode lsp-install all

# 或安装特定服务器
opencode lsp-install python typescript java
```

### 步骤 2：打包 LSP 目录

```bash
# Linux/macOS
tar -czf opencode-lsp-backup.tar.gz ~/.local/share/opencode/bin/

# Windows (PowerShell)
Compress-Archive -Path "$env:APPDATA\opencode\bin\*" -DestinationPath "opencode-lsp-backup.zip"
```

### 步骤 3：复制到内网机器

将打包文件复制到内网机器并解压到对应目录：

| 操作系统 | 目标路径 |
|---------|---------|
| Linux | `~/.local/share/opencode/bin/` |
| macOS | `~/Library/Application Support/opencode/bin/` |
| Windows | `%APPDATA%\opencode\bin\` |

---

## Parser 查询文件配置

### 步骤 1：下载查询文件

在可访问外网的机器上执行：

```bash
# 创建下载目录
mkdir -p opencode-parsers/queries

# 下载各语言的查询文件
curl -o opencode-parsers/queries/python-highlights.scm \
  https://raw.githubusercontent.com/nvim-treesitter/nvim-treesitter/refs/heads/master/queries/python/highlights.scm

curl -o opencode-parsers/queries/python-locals.scm \
  https://raw.githubusercontent.com/nvim-treesitter/nvim-treesitter/refs/heads/master/queries/python/locals.scm

# 重复上述命令下载其他语言的查询文件...
```

### 步骤 2：修改 parsers-config.ts

将 [parsers-config.ts](../parsers-config.ts) 中的 URL 替换为本地路径：

```typescript
// 修改前
highlights: [
  "https://raw.githubusercontent.com/nvim-treesitter/nvim-treesitter/refs/heads/master/queries/python/highlights.scm",
],

// 修改后
highlights: [
  "file:///path/to/opencode-parsers/queries/python-highlights.scm",
],
```

---

## 模型 API 配置

OpenCode 支持多种方式配置本地或内部 LLM 服务：

### 使用自定义 Provider

在 `opencode.json` 中使用 `provider` 字段配置自定义模型提供商：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "my-local-llm": {
      "name": "My Local LLM",
      "npm": "@ai-sdk/openai-compatible",
      "env": [],
      "models": {
        "llama-3": {
          "name": "Llama 3",
          "tool_call": true,
          "limit": {
            "context": 8192,
            "output": 2048
          }
        }
      },
      "options": {
        "apiKey": "not-needed",
        "baseURL": "http://localhost:11434/v1"
      }
    }
  },
  "model": "my-local-llm:llama-3"
}
```

**配置说明**：
- `name`: 提供商显示名称
- `npm`: 使用的 AI SDK 包（通常为 `@ai-sdk/openai-compatible`）
- `env`: 需要的环境变量列表
- `models`: 模型列表配置
  - `tool_call`: 是否支持工具调用
  - `limit.context`: 上下文长度限制
  - `limit.output`: 输出长度限制
- `options.apiKey`: API 密钥（本地模型可设为 "not-needed"）
- `options.baseURL`: 本地模型服务端点

### 使用简化 LLM 配置（推荐）

对于简单的本地模型配置，可以使用 `llm` 数组（推荐用于离线环境）：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "llm": [
    {
      "name": "Ollama Local",
      "endpoint": "http://localhost:11434/v1",
      "apiKey": "ollama",
      "model": "qwen2.5-coder:14b",
      "caCert": "~/.config/opencode/certs/ca.crt"
    },
    {
      "name": "Internal LLM",
      "endpoint": "http://internal-llm-server:8080/v1",
      "apiKey": "{env:INTERNAL_API_KEY}",
      "model": "deepseek-coder",
      "caCert": "/etc/ssl/certs/internal-ca.crt"
    }
  ]
}
```

**配置说明**：
- `name`: 配置显示名称（必填，用于标识此配置）
- `endpoint`: API 端点 URL（必填）
- `apiKey`: API 密钥（必填，支持环境变量引用 `{env:VAR_NAME}`）
- `model`: 模型名称（必填）
- `caCert`: CA 证书路径（**必填**，支持 `~` 展开为用户主目录）

**⚠️ 重要提示**：`caCert` 是必需字段，OpenCode 会使用此证书验证 LLM 服务的 TLS 连接。如果服务使用自签名证书，请将证书文件路径配置在此字段。

**生成自签名证书示例**：

```bash
# 创建证书目录
mkdir -p ~/.config/opencode/certs

# 生成自签名证书（用于本地测试）
openssl req -x509 -newkey rsa:4096 \
  -keyout ~/.config/opencode/certs/ca.key \
  -out ~/.config/opencode/certs/ca.crt \
  -days 365 -nodes \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=MyOrg/CN=localhost"

# 如果使用内部 CA，复制 CA 证书到该目录
cp /path/to/internal-ca.crt ~/.config/opencode/certs/
```

### Ollama 本地模型配置

如果使用 Ollama 作为本地模型服务：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "llm": [
    {
      "name": "Ollama Qwen",
      "endpoint": "http://localhost:11434/v1",
      "apiKey": "ollama",
      "model": "qwen2.5-coder:14b",
      "caCert": "~/.config/opencode/certs/ca.crt"
    }
  ]
}
```

**Ollama 离线部署步骤**：

1. 在可联网机器下载模型：
   ```bash
   ollama pull qwen2.5-coder:14b
   ollama pull llama3.1
   ```

2. 导出模型（可选）：
   ```bash
   # 找到模型存储位置
   # Linux/macOS: ~/.ollama/models/
   # Windows: C:\Users\<username>\.ollama\models\
   
   # 打包模型
   tar -czf ollama-models.tar.gz ~/.ollama/models/
   ```

3. 在内网机器导入：
   ```bash
   # 解压到对应目录
   tar -xzf ollama-models.tar.gz -C ~/
   ```

4. 配置 Ollama 允许跨域访问（如需）：
   ```bash
   export OLLAMA_ORIGINS="*"
   export OLLAMA_HOST="0.0.0.0:11434"
   ollama serve
   ```

### Privatemode AI 配置

如果使用 Privatemode AI 作为内部模型服务：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "llm": [
    {
      "name": "Privatemode AI",
      "endpoint": "{env:PRIVATEMODE_ENDPOINT}",
      "apiKey": "{env:PRIVATEMODE_API_KEY}",
      "model": "qwen3-coder-30b-a3b",
      "caCert": "/etc/ssl/certs/privatemode-ca.crt"
    }
  ]
}
```

**环境变量配置**：
```bash
export PRIVATEMODE_API_KEY="your-api-key"
export PRIVATEMODE_ENDPOINT="http://your-privatemode-server:8080/v1"
```

---

## 环境变量配置

### 禁用自动下载

```bash
# 禁用所有 LSP 自动下载
export OPENCODE_DISABLE_LSP_DOWNLOAD=true

# 或使用数字
export OPENCODE_DISABLE_LSP_DOWNLOAD=1
```

### 配置本地 npm Registry

```bash
# 配置 Bun 使用内部 npm 镜像
export BUN_CONFIG_REGISTRY=http://your-internal-npm-registry

# 或使用 npm 配置
export NPM_CONFIG_REGISTRY=http://your-internal-npm-registry
```

### 配置 LSP 存储路径（可选）

```bash
# 自定义 LSP 服务器存储位置
export OPENCODE_TEST_HOME=/path/to/lsp-storage
```

### 配置本地 LLM 环境变量

```bash
# Ollama 本地模型
export OLLAMA_HOST="http://localhost:11434"

# 自定义本地模型
export INTERNAL_API_KEY="your-api-key"
export INTERNAL_ENDPOINT="http://localhost:8080/v1"

# Privatemode AI
export PRIVATEMODE_API_KEY="your-api-key"
export PRIVATEMODE_ENDPOINT="http://privatemode-server:8080/v1"
```

---

## 完整配置示例

### 示例 1：使用 Ollama 本地模型（推荐）

```json
{
  "$schema": "./config.json",
  "lsp": {
    "pyright": { "disabled": false },
    "typescript": { "disabled": false },
    "jdtls": { "disabled": false },
    "eslint": { "disabled": true },
    "rust": { "disabled": false },
    "lua-ls": { "disabled": false }
  },
  "llm": [
    {
      "name": "Ollama Local",
      "endpoint": "http://localhost:11434/v1",
      "apiKey": "ollama",
      "model": "qwen2.5-coder:14b",
      "caCert": "~/.config/opencode/certs/ca.crt"
    }
  ]
}
```

### 示例 2：使用自定义 Provider 配置

```json
{
  "$schema": "./config.json",
  "lsp": {
    "pyright": { "disabled": false },
    "typescript": { "disabled": false },
    "jdtls": { "disabled": false }
  },
  "provider": {
    "internal-llm": {
      "name": "Internal LLM Server",
      "npm": "@ai-sdk/openai-compatible",
      "env": ["INTERNAL_API_KEY"],
      "models": {
        "deepseek-coder": {
          "name": "DeepSeek Coder",
          "tool_call": true,
          "limit": {
            "context": 64000,
            "output": 8192
          }
        }
      },
      "options": {
        "apiKey": "{env:INTERNAL_API_KEY}",
        "baseURL": "http://internal-llm.corp.local:8080/v1"
      }
    }
  },
  "model": "internal-llm:deepseek-coder"
}
```

### 示例 3：多模型配置（带 fallback）

```json
{
  "$schema": "./config.json",
  "llm": [
    {
      "name": "Primary Ollama",
      "endpoint": "http://localhost:11434/v1",
      "apiKey": "ollama",
      "model": "qwen2.5-coder:14b",
      "caCert": "~/.config/opencode/certs/ca.crt"
    },
    {
      "name": "Backup Internal LLM",
      "endpoint": "http://backup-llm.corp.local:8080/v1",
      "apiKey": "{env:BACKUP_API_KEY}",
      "model": "backup-model",
      "caCert": "/etc/ssl/certs/backup-ca.crt"
    }
  ]
}
```

### 启动脚本（offline-start.sh）

```bash
#!/bin/bash

# 离线环境启动脚本

# 1. 禁用 LSP 自动下载
export OPENCODE_DISABLE_LSP_DOWNLOAD=true

# 2. 配置本地 npm registry（如需安装新 LSP）
export BUN_CONFIG_REGISTRY=http://internal-npm-mirror:4873

# 3. 配置 Ollama（如果使用）
export OLLAMA_HOST="http://localhost:11434"

# 4. 配置内部 LLM API 密钥（如果使用）
export INTERNAL_API_KEY="your-internal-key"
export INTERNAL_ENDPOINT="http://internal-llm:8080/v1"

# 5. 启动 OpenCode
opencode "$@"
```

### Windows 启动脚本（offline-start.ps1）

```powershell
# 离线环境启动脚本

# 1. 禁用 LSP 自动下载
$env:OPENCODE_DISABLE_LSP_DOWNLOAD = "true"

# 2. 配置本地 npm registry
$env:BUN_CONFIG_REGISTRY = "http://internal-npm-mirror:4873"

# 3. 配置 Ollama
$env:OLLAMA_HOST = "http://localhost:11434"

# 4. 配置内部 LLM API 密钥
$env:INTERNAL_API_KEY = "your-internal-key"
$env:INTERNAL_ENDPOINT = "http://internal-llm:8080/v1"

# 5. 启动 OpenCode
opencode $args
```

---

## 故障排除

### LSP 服务器无法启动

1. 检查 LSP 服务器是否已预下载
   ```bash
   opencode lsp-install --check
   ```

2. 检查 LSP 目录权限
   ```bash
   ls -la ~/.local/share/opencode/bin/
   ```

3. 手动指定 LSP 路径
   ```json
   {
     "lsp": {
       "pyright": {
         "command": ["/path/to/pyright", "--stdio"]
       }
     }
   }
   ```

### 模型 API 连接失败

1. 检查网络连通性
   ```bash
   # 测试 Ollama
   curl http://localhost:11434/api/tags
   
   # 测试自定义端点
   curl http://internal-llm-server:8080/v1/models
   ```

2. 检查 API 密钥配置
   ```bash
   echo $INTERNAL_API_KEY
   ```

3. 检查 CA 证书文件是否存在
   ```bash
   ls -la ~/.config/opencode/certs/
   cat ~/.config/opencode/certs/ca.crt
   ```

4. 查看 OpenCode 日志
   ```bash
   opencode --print-logs --log-level DEBUG
   ```

5. 验证模型配置格式
   ```bash
   opencode config validate
   ```

### Ollama 连接问题

1. 检查 Ollama 服务是否运行
   ```bash
   ollama list
   ```

2. 检查模型是否已下载
   ```bash
   ollama pull qwen2.5-coder:14b
   ```

3. 检查防火墙设置（确保端口 11434 可访问）

4. 检查 CA 证书配置（如果使用 HTTPS）
   ```bash
   # 对于 HTTP 连接，可以创建一个空的 CA 文件
   # 或者使用系统默认 CA 证书
   echo "" > ~/.config/opencode/certs/ca.crt
   ```

### CA 证书错误

如果遇到 CA 证书相关错误：

1. **证书路径不存在**
   ```bash
   # 确保证书目录存在
   mkdir -p ~/.config/opencode/certs
   ```

2. **自签名证书问题**
   ```bash
   # 生成自签名证书
   openssl req -x509 -newkey rsa:4096 \
     -keyout ~/.config/opencode/certs/ca.key \
     -out ~/.config/opencode/certs/ca.crt \
     -days 365 -nodes \
     -subj "/CN=localhost"
   ```

3. **使用系统 CA 证书**
   ```json
   {
     "llm": [
       {
         "name": "Local LLM",
         "endpoint": "http://localhost:8080/v1",
         "apiKey": "key",
         "model": "model-name",
         "caCert": "/etc/ssl/certs/ca-certificates.crt"
       }
     ]
   }
   ```

---

## 相关文档

- [LSP 配置指南](./LSP-CONFIG.zh-CN.md)
- [OpenCode 官方文档](https://opencode.ai/docs)
- [Ollama 官方文档](https://github.com/ollama/ollama)
- [AI SDK 文档](https://sdk.vercel.ai/docs)

---

**注意**: 本文档基于 OpenCode v1.1.53 版本编写，后续版本可能会有变化。
