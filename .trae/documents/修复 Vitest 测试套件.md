## 修复计划

### 阶段 1: 核心兼容性问题修复

#### 1.1 修复 Bun 兼容性问题
- **文件**: `test/util/bun-compat.ts`
- **操作**: 扩展 Bun 兼容层，添加 `Bun.serve()`, `Bun.gc()`, `Bun.sleep()`, `Bun.sleepSync()` 的 Node.js 实现
- **影响测试**: `test/session/retry.test.ts`, `test/memory/abort-leak.test.ts`

#### 1.2 修复 fs 未定义问题
- **文件**: `test/session/instruction.test.ts`, `test/tool/grep.test.ts`
- **操作**: 添加 `import fs from "fs/promises"`

#### 1.3 修复 glob.match 问题
- **文件**: `src/platform/fs.ts`
- **操作**: 为 `Glob` 类添加 `match(filepath: string): boolean` 方法，使用 `minimatch` 或类似库

### 阶段 2: Mock 和测试基础设施修复

#### 2.1 修复 Mock 函数问题
- **文件**: `test/config/config.test.ts`, `test/tool/question.test.ts`, `test/provider/copilot/copilot-chat-model.test.ts`
- **操作**: 
  - 确保正确从 `vitest` 导入 `mock`, `spyOn`
  - 将 `mock.module()` 替换为 `vi.mock()` (Vitest 标准语法)
  - 或者使用 `beforeEach` 中的 `vi.stubGlobal()`

#### 2.2 修复 MCP Mock 问题
- **文件**: `test/mcp/headers.test.ts`, `test/mcp/oauth-browser.test.ts`
- **操作**: 重构 mock 声明，确保在模块导入之前设置

### 阶段 3: 平台特定问题修复

#### 3.1 修复 Windows 路径问题
- **文件**: `test/patch/patch.test.ts`, `test/tool/apply_patch.test.ts`
- **操作**: 使用 `path.normalize()` 和 `path.sep` 确保跨平台兼容

#### 3.2 修复缺少依赖
- **操作**: `npm install @standard-community/standard-json`

### 阶段 4: 配置和验证问题修复

#### 4.1 修复 MCP 配置验证错误
- **文件**: `test/config/config.test.ts`
- **操作**: 更新测试用例以匹配新的配置 Schema

#### 4.2 修复 ESBuild 转换错误
- **文件**: `src/cli/logo.ts`, `src/util/locale.ts`
- **操作**: 检查并修复特殊字符问题

### 阶段 5: 验证
- 运行完整测试套件验证修复结果

## 预期结果
- 测试通过率从当前的约 30% 提升到 90%+
- 所有核心功能测试通过
- 跨平台兼容性得到改善