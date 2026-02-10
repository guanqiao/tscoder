# LSP (Language Server Protocol) 配置指南

本文档介绍如何在 OpenCode 中配置和使用 LSP（语言服务器协议）功能。

## 目录

- [简介](#简介)
- [快速开始](#快速开始)
- [LSP 安装命令](#lsp-安装命令)
- [支持的 LSP 服务器](#支持的-lsp-服务器)
- [配置文件](#配置文件)
- [环境变量](#环境变量)
- [故障排除](#故障排除)

---

## 简介

OpenCode 内置了 LSP 客户端，支持多种编程语言的智能代码补全、跳转定义、查找引用、诊断等功能。LSP 服务器可以按需自动下载，也可以预下载到本地使用。

### 特性

- ✅ 自动检测项目类型并启动对应 LSP 服务器
- ✅ 支持 20+ 种编程语言
- ✅ 按需自动下载或预下载安装
- ✅ 可自定义 LSP 服务器配置
- ✅ 支持禁用特定 LSP 服务器

---

## 快速开始

### 1. 查看可用的 LSP 服务器

```bash
opencode lsp-install --list
```

### 2. 检查已安装的 LSP 服务器

```bash
opencode lsp-install --check
```

### 3. 安装常用的 LSP 服务器

```bash
# 安装所有支持的 LSP 服务器
opencode lsp-install all

# 或安装特定的服务器
opencode lsp-install python typescript java eslint
```

### 4. 开始使用

安装完成后，打开对应语言的文件，OpenCode 会自动启动相应的 LSP 服务器并提供智能功能。

---

## LSP 安装命令

### 命令格式

```bash
opencode lsp-install [servers...] [options]
```

### 参数说明

| 参数 | 类型 | 说明 |
|------|------|------|
| `servers` | 字符串数组 | 要安装的 LSP 服务器 ID，使用 `all` 安装所有 |

### 选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--force` | 布尔值 | `false` | 强制重新安装，即使已存在 |
| `--verbose` | 布尔值 | `false` | 显示详细的安装输出 |
| `--list` | 布尔值 | `false` | 列出所有可用的 LSP 服务器 |
| `--check` | 布尔值 | `false` | 检查 LSP 服务器的安装状态 |

### 使用示例

```bash
# 列出所有可用的 LSP 服务器
opencode lsp-install --list

# 检查安装状态
opencode lsp-install --check

# 安装所有 LSP 服务器
opencode lsp-install all

# 安装 Python 和 TypeScript 支持
opencode lsp-install pyright typescript

# 强制重新安装 Java 支持
opencode lsp-install --force jdtls

# 显示详细输出安装所有服务器
opencode lsp-install --verbose all
```

---

## 支持的 LSP 服务器

### 自动下载安装

以下 LSP 服务器可以通过 `lsp-install` 命令自动下载安装：

| ID | 名称 | 语言 | 文件扩展名 |
|----|------|------|-----------|
| `pyright` | Pyright | Python | `.py`, `.pyi` |
| `jdtls` | Eclipse JDTLS | Java | `.java` |
| `typescript` | TypeScript Language Server | TypeScript/JavaScript | `.ts`, `.tsx`, `.js`, `.jsx` |
| `vue` | Vue Language Server | Vue | `.vue` |
| `eslint` | ESLint Language Server | JavaScript/TypeScript | `.js`, `.ts`, `.vue` |
| `gopls` | Gopls | Go | `.go` |
| `rust` | Rust Analyzer | Rust | `.rs` |
| `lua-ls` | Lua Language Server | Lua | `.lua` |
| `yaml` | YAML Language Server | YAML | `.yaml`, `.yml` |
| `json` | JSON Language Server | JSON | `.json` |
| `dockerfile` | Dockerfile Language Server | Dockerfile | `Dockerfile` |
| `bash` | Bash Language Server | Bash/Shell | `.sh`, `.bash` |

### 需要预装依赖

以下 LSP 服务器需要系统预装相应的运行时环境：

| ID | 名称 | 语言 | 依赖要求 |
|----|------|------|----------|
| `deno` | Deno LSP | TypeScript/JavaScript | 需要安装 [Deno](https://deno.land/) |
| `elixir-ls` | ElixirLS | Elixir | 需要安装 Elixir 和 Mix |
| `gleam` | Gleam LSP | Gleam | 需要安装 [Gleam](https://gleam.run/) |
| `clojure-lsp` | Clojure LSP | Clojure | 需要安装 [Clojure CLI](https://clojure.org/guides/install_clojure) |
| `nixd` | Nixd | Nix | 需要安装 [Nix](https://nixos.org/) |

### 项目依赖

以下 LSP 服务器使用项目本地安装的依赖：

| ID | 名称 | 语言 | 说明 |
|----|------|------|------|
| `typescript` | TypeScript | TypeScript | 使用项目中的 `typescript` 包 |
| `oxlint` | Oxlint | JavaScript/TypeScript | 使用项目中的 `oxlint` 包 |
| `biome` | Biome | JavaScript/TypeScript/JSON | 使用项目中的 `@biomejs/biome` 包 |

---

## 配置文件

### 配置文件位置

OpenCode 的配置文件为 `opencode.json`，位于项目根目录或用户主目录。

### LSP 配置示例

```json
{
  "$schema": "https://opencode.ai/config.json",
  "lsp": {
    "pyright": {
      "disabled": false,
      "env": {
        "PYTHONPATH": "/path/to/python"
      }
    },
    "typescript": {
      "disabled": false,
      "initialization": {
        "preferences": {
          "includeCompletionsForModuleExports": true
        }
      }
    },
    "jdtls": {
      "disabled": false
    },
    "eslint": {
      "disabled": true
    }
  }
}
```

### 配置项说明

#### 禁用 LSP 服务器

```json
{
  "lsp": {
    "pyright": {
      "disabled": true
    }
  }
}
```

#### 设置环境变量

```json
{
  "lsp": {
    "pyright": {
      "env": {
        "VIRTUAL_ENV": "/path/to/venv",
        "PYTHONPATH": "/path/to/modules"
      }
    }
  }
}
```

#### 自定义 LSP 服务器命令

```json
{
  "lsp": {
    "custom-lsp": {
      "command": ["/path/to/custom-lsp", "--stdio"],
      "extensions": [".custom"],
      "env": {
        "CUSTOM_VAR": "value"
      }
    }
  }
}
```

#### 初始化选项

```json
{
  "lsp": {
    "typescript": {
      "initialization": {
        "preferences": {
          "includeCompletionsForModuleExports": true,
          "includeCompletionsWithInsertText": true
        }
      }
    }
  }
}
```

### 完全禁用 LSP

如果要完全禁用所有 LSP 功能：

```json
{
  "lsp": false
}
```

---

## 环境变量

### 控制 LSP 下载

| 环境变量 | 类型 | 说明 |
|----------|------|------|
| `OPENCODE_DISABLE_LSP_DOWNLOAD` | 布尔值 | 设置为 `true` 或 `1` 禁用所有 LSP 自动下载 |

示例：

```bash
# 禁用自动下载
export OPENCODE_DISABLE_LSP_DOWNLOAD=true
opencode

# 或单次运行
OPENCODE_DISABLE_LSP_DOWNLOAD=true opencode
```

### 实验性功能

| 环境变量 | 类型 | 说明 |
|----------|------|------|
| `OPENCODE_EXPERIMENTAL_LSP_TY` | 布尔值 | 启用实验性的 Ty Python LSP |

---

## 故障排除

### LSP 服务器无法启动

1. **检查是否已安装**
   ```bash
   opencode lsp-install --check
   ```

2. **查看日志**
   ```bash
   opencode --print-logs --log-level DEBUG
   ```

3. **手动安装依赖**
   某些 LSP 服务器需要系统预装运行时环境（如 Java、Go、Rust 等）。

### 安装失败

1. **检查网络连接**
   LSP 服务器需要从网络下载，确保网络连接正常。

2. **使用 verbose 模式查看详细错误**
   ```bash
   opencode lsp-install --verbose python
   ```

3. **强制重新安装**
   ```bash
   opencode lsp-install --force python
   ```

### 性能问题

1. **禁用不需要的 LSP 服务器**
   在 `opencode.json` 中禁用不需要的 LSP 服务器。

2. **预下载常用 LSP 服务器**
   使用 `opencode lsp-install all` 预下载所有服务器，避免使用时等待下载。

### 配置文件不生效

1. 检查配置文件位置是否正确
2. 验证 JSON 格式是否有效
3. 重启 OpenCode

---

## 存储位置

LSP 服务器默认安装在以下目录：

| 操作系统 | 路径 |
|----------|------|
| Linux | `~/.local/share/opencode/bin/` |
| macOS | `~/Library/Application Support/opencode/bin/` |
| Windows | `%APPDATA%\opencode\bin\` |

可以通过设置 `OPENCODE_TEST_HOME` 环境变量更改存储位置。

---

## 更多信息

- [LSP 规范](https://microsoft.github.io/language-server-protocol/)
- [OpenCode 文档](https://opencode.ai/docs)
- [GitHub Issues](https://github.com/opencode-ai/opencode/issues)

---

**版本**: 1.1.53  
**更新日期**: 2026-02-10
