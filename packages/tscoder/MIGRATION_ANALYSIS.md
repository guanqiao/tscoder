# Bun 到 npm/vitest 迁移测试失败分析报告

## 执行摘要

本次分析针对将项目从 Bun 迁移到 npm/vitest 后的测试失败情况进行深入分析。经过修复，测试通过率从初始的极低水平提升到 **497个测试通过，64个测试失败**。

## 测试统计

- **总测试数**: 561
- **通过**: 497 (88.6%)
- **失败**: 64 (11.4%)
- **测试文件**: 66个
  - 通过: 24个
  - 失败: 42个

## 失败测试分类分析

### 1. 与 Bun 迁移直接相关的失败 (约 30%)

#### 1.1 Bun 特定 API 未完全模拟

**问题**: `test/util/bun-compat.ts` 提供的兼容层不完整

**影响测试**:
- `test/provider/copilot/copilot-chat-model.test.ts` - 11个失败
  - 错误: `mock is not a function`
  - 原因: Bun 的 `mock()` 函数与 vitest 的 `vi.fn()` 行为不完全一致

**修复建议**:
```typescript
// 需要增强 bun-compat.ts
export const mock = vi.fn;
export const spyOn = vi.spyOn;
```

#### 1.2 Shell 命令执行差异

**问题**: Bun 的 `$` 模板标签与 Node.js 实现的行为差异

**影响测试**:
- `test/snapshot/snapshot.test.ts` - 大部分失败
  - 错误: `expected undefined to be truthy`
  - 原因: `Snapshot.track()` 返回 `undefined`，说明 git 命令执行失败

**根本原因分析**:
```typescript
// src/snapshot/index.ts 中的代码
const result = await $`git write-tree`.cwd(Instance.directory).quiet().nothrow()
const hash = result.text().trim()
```

在 Windows 上，`git write-tree` 可能返回空结果或失败，导致 `hash` 为 `undefined`。

**修复建议**:
1. 增强错误处理
2. 添加 Windows 特定的 git 命令处理
3. 使用 `cross-spawn` 替代 `child_process.spawn`

### 2. 与 Windows 平台相关的失败 (约 50%)

#### 2.1 路径分隔符问题

**问题**: Windows 使用 `\` 而 Unix 使用 `/`

**影响测试**:
- `test/snapshot/snapshot.test.ts`
  - 错误: `expected [] to include 'C:\Users\...'`
  - 原因: 路径比较时未进行归一化

**修复建议**:
```typescript
// 使用 path.normalize 或 path.posix.normalize
import { normalize } from 'path';
expect(normalize(actualPath)).toBe(normalize(expectedPath));
```

#### 2.2 命令不可用

**问题**: Unix 特定命令在 Windows 上不可用

**已修复**:
- ✅ `rm` → `fs.unlink()`
- ✅ `mkdir -p` → `fs.mkdir({ recursive: true })`

**仍需修复**:
- `git worktree` 在 Windows 上的行为差异
- `ripgrep` (rg) 命令可能不存在

#### 2.3 文件系统差异

**问题**: Windows 文件系统行为与 Unix 不同

**影响测试**:
- 符号链接 (symlink) 处理
- 文件权限 (chmod/chown)
- 隐藏文件处理

### 3. 与测试基础设施相关的失败 (约 15%)

#### 3.1 超时设置

**问题**: LSP 客户端测试超时

**影响测试**:
- `test/lsp/client.test.ts` - 3个失败
  - 错误: 超时
  - 原因: 默认 5 秒超时对于 LSP 通信不足

**修复建议**:
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: 30000, // 增加到 30 秒
  },
});
```

#### 3.2 环境变量

**问题**: 某些测试依赖特定环境变量

**已设置**:
- ✅ `OPENCODE_FAKE_VCS=git`

**仍需设置**:
- `CI=true` 用于某些 CI 特定行为
- `NODE_ENV=test`

### 4. 与网络相关的失败 (约 5%)

#### 4.1 外部 API 调用

**影响测试**:
- `test/skill/discovery.test.ts` - 下载技能失败
- `test/memory/abort-leak.test.ts` - 内存泄漏测试

**建议**: 使用 `nock` 或 `msw` 进行 HTTP 请求 mock

## 核心问题深度分析

### ShellCommand 实现问题

当前的 `ShellCommand` 实现虽然支持基本功能，但与 Bun 的 `$` 有行为差异:

```typescript
// 当前实现的问题
class ShellCommand {
  // 1. 缺少 Bun 的一些方法
  // Bun 支持: $.cwd(), $.env(), $.nothrow(), $.quiet()
  // 当前只实现了部分
  
  // 2. 返回值差异
  // Bun 的 $ 返回的对象可以直接调用 .text(), .json(), .lines()
  // 当前实现需要 await 后才能调用
  
  // 3. 异步迭代器
  // Bun 支持: for await (const line of $`cmd`.lines())
  // 当前实现可能不完全兼容
}
```

### 推荐的完整修复方案

#### 方案 1: 增强 ShellCommand (短期)

```typescript
// src/platform/shell.ts
export class ShellCommand {
  // 添加缺失的方法
  cwd(dir: string): this {
    this.options.cwd = dir;
    return this;
  }
  
  env(vars: Record<string, string>): this {
    this.options.env = { ...this.options.env, ...vars };
    return this;
  }
  
  nothrow(): this {
    this.options.nothrow = true;
    return this;
  }
  
  quiet(): this {
    this.options.quiet = true;
    return this;
  }
  
  // 确保 lines() 返回正确的异步可迭代对象
  lines(): AsyncIterable<string> {
    return {
      [Symbol.asyncIterator]: async function* () {
        const result = await this.execute();
        const lines = result.stdout.split('\n');
        for (const line of lines) {
          yield line;
        }
      }.bind(this)
    };
  }
}
```

#### 方案 2: 使用 cross-spawn (中期)

```typescript
import spawn from 'cross-spawn';

// cross-spawn 自动处理 Windows/Unix 差异
```

#### 方案 3: 重构测试以减少对 Shell 的依赖 (长期)

将更多测试转换为使用 Node.js API 而非 shell 命令:

```typescript
// 不推荐
await $`rm ${file}`.quiet();

// 推荐
await fs.unlink(file).catch(() => {});
```

## 优先级建议

### P0 (立即修复)
1. 修复 `copilot-chat-model.test.ts` 的 mock 问题
2. 修复 `Snapshot.track()` 返回 undefined 的问题

### P1 (本周内)
1. 修复路径分隔符问题
2. 增加 LSP 测试超时时间
3. 修复 git worktree 相关测试

### P2 (本月内)
1. 完善 Bun 兼容层
2. 重构使用 shell 命令的测试
3. 添加 Windows CI 测试

## 结论

约 **30% 的失败测试与 Bun 迁移直接相关**，主要是:
1. Bun 特定 API 未完全模拟
2. Shell 命令执行差异

约 **50% 的失败测试与 Windows 平台相关**，这是迁移过程中暴露的平台兼容性问题，而非 Bun 本身的问题。

剩余的 **20%** 是测试基础设施和网络相关问题。

通过完成 P0 和 P1 的修复，预计可以将测试通过率提升到 **95%以上**。
