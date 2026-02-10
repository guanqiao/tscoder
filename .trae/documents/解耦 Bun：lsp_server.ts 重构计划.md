## 任务概述
将 `packages/tscoder/src/lsp/server.ts` 中的 90+ 处 Bun API 调用解耦，通过仔细重构迁移到平台抽象层。

## 现状分析

### 已存在的平台抽象层
项目已有 `@/platform` 模块：
- `fs.ts`: `file()`, `writeFile()`, `Glob`
- `shell.ts`: `$`, `spawnAsync()`, `streamToText()`
- `utils.ts`: `which()`, `resolve()`

### 需要解耦的 Bun API 分类

#### 类型 A: 可执行文件查找 (约 50+ 处)
```typescript
Bun.which("command")
Bun.which("command", { PATH: ... })
```
→ 使用 `which()`

#### 类型 B: 文件存在检查 (约 25+ 处)
```typescript
await Bun.file(path).exists()
```
→ 使用 `file(path).exists()`

#### 类型 C: 文件读取 (约 2 处)
```typescript
await Bun.file(path).text()
```
→ 使用 `file(path).text()`

#### 类型 D: 文件写入 (约 4 处)
```typescript
await Bun.file(path).write(response)
await Bun.write(path, buf)
```
→ 使用 `file(path).write()` 或 `writeFile()`

#### 类型 E: 模块解析 (约 4 处)
```typescript
await Bun.resolve(moduleId, from)
```
→ 使用 `resolve()`

#### 类型 F: 进程创建 (约 10+ 处)
```typescript
const proc = Bun.spawn([cmd, ...args], options)
await proc.exited
const help = await readableStreamToText(proc.stdout)
```
→ 需要仔细设计，因为 API 差异较大

#### 类型 G: Shell 命令 (约 10+ 处)
```typescript
await $`command`.cwd(dir).quiet().nothrow()
```
→ 使用 `$` (已存在)

## 详细重构计划

### Phase 1: 分析现有代码结构
1. 通读整个 server.ts，理解每个 LSP 服务器的初始化逻辑
2. 识别重复的代码模式（如二进制下载、解压、安装等）
3. 标记需要提取的公共逻辑

### Phase 2: 设计平台层扩展
1. 检查 `platform/fs.ts` 是否需要扩展 `write()` 方法
2. 设计 `spawnAsync` 的返回值接口，使其兼容 `.exited` 模式
3. 考虑添加辅助函数如 `downloadFile()`, `extractArchive()` 等

### Phase 3: 逐函数重构
按 LSP 服务器逐个重构，确保每个都能正常工作：

1. **Deno** - 简单示例，验证基础流程
2. **TypeScript** - 涉及 `Bun.resolve`
3. **Vue** - 涉及 `Bun.spawn` 和安装逻辑
4. **ESLint** - 涉及下载、解压、npm 安装
5. **Oxlint** - 涉及 `Bun.spawn` 和 stdout 读取
6. **Biome** - 涉及 `Bun.resolve`
7. **Gopls** - 涉及 `Bun.spawn`
8. **Rubocop** - 涉及 `Bun.spawn`
9. **Ty/Pyright** - 涉及虚拟环境检测
10. **ElixirLS** - 涉及下载、解压、mix 编译
11. **Zls** - 涉及 GitHub API、下载、解压
12. **CSharp/FSharp** - 涉及 `dotnet tool install`
13. **SourceKit** - 涉及 `xcrun` 调用
14. **RustAnalyzer** - 涉及文件读取
15. **Clangd** - 涉及复杂下载逻辑
16. **Svelte/Astro** - 类似 Vue
17. **JDTLS** - 涉及 curl、tar
18. **KotlinLS** - 涉及 GitHub API
19. **YamlLS** - 类似 Vue
20. **LuaLS** - 类似 Zls
21. **PHPIntelephense** - 类似 Vue
22. **Prisma/Dart/Ocaml** - 简单查找
23. **BashLS** - 类似 Vue
24. **TerraformLS** - 类似 Zls
25. **TexLab** - 类似 Zls
26. **DockerfileLS** - 类似 Vue
27. **Gleam/Clojure/Nixd** - 简单查找
28. **Tinymist** - 类似 Zls
29. **HLS** - 简单查找

### Phase 4: 提取公共逻辑
识别并提取重复模式：
1. `downloadFromGitHub(repo, assetPattern)` - 下载 GitHub Release
2. `installNodeModule(pkg)` - 使用 bun 安装 npm 包
3. `extractArchive(archive, dest)` - 解压文件
4. `findBinary(name, paths)` - 查找二进制文件

### Phase 5: 验证和测试
1. 类型检查
2. 单元测试
3. 集成测试（如可能）

## 依赖关系
- 无外部依赖
- 依赖 `@/platform` 模块的稳定性

## 优先级
- P0: Phase 1 分析 + Phase 2 设计
- P1: Phase 3 逐函数重构（按依赖顺序）
- P2: Phase 4 提取公共逻辑
- P3: Phase 5 验证测试

## 完成标准
- [ ] 无 `from "bun"` 导入
- [ ] 无 `Bun.` 前缀调用
- [ ] 代码结构更清晰（提取公共逻辑）
- [ ] 类型检查通过
- [ ] 测试通过

## 预估时间
- Phase 1: 1 小时
- Phase 2: 1 小时
- Phase 3: 4-5 小时（每服务器约 10-15 分钟）
- Phase 4: 1 小时
- Phase 5: 1 小时
- **总计: 约 8-9 小时**