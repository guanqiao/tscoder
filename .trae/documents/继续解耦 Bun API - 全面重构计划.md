## 解耦 Bun API 完整计划

### 当前状态
- ✅ 已完成 `lsp/server.ts` 解耦（29个 LSP 服务器）
- ⏳ 剩余 63 个文件需要解耦
- 📊 约 300+ 处 Bun API 调用需要替换

### 需要扩展的平台层功能

#### 1. 文件操作 (`platform/fs.ts` 已部分支持)
- ✅ `file()` - 已存在
- ✅ `writeFile()` - 已存在
- ✅ `Glob` - 需要添加实现
- ⏳ `Bun.file().stat()` - 需要添加
- ⏳ `Bun.file().size` - 需要添加
- ⏳ `Bun.file().json()` - 需要添加
- ⏳ `Bun.file().arrayBuffer()` - 需要添加

#### 2. Shell/进程操作 (`platform/shell.ts` 已部分支持)
- ✅ `spawn()` - 已存在
- ✅ `spawnAsync()` - 已存在
- ✅ `which()` - 已存在
- ✅ `$` - 已存在
- ⏳ `Bun.serve()` - HTTP 服务器，需要 Node.js 替代
- ⏳ `Bun.connect()` - Socket 连接，需要 Node.js 替代
- ⏳ `Bun.sleep()` - 可用 `setTimeout` 替代
- ⏳ `Bun.stdin` - 需要 Node.js 替代
- ⏳ `Bun.stderr` - 需要 Node.js 替代

#### 3. 工具函数
- ⏳ `Bun.stringWidth()` - 需要寻找替代库
- ⏳ `Bun.color()` - ANSI 颜色，需要替代
- ⏳ `Bun.hash.xxHash32()` - 需要替代哈希实现

### 分阶段解耦计划

#### Phase 1: 核心平台层扩展 (高优先级)
1. 扩展 `platform/fs.ts` - 添加缺失的文件操作方法
2. 创建 `platform/http.ts` - Bun.serve 替代
3. 创建 `platform/process.ts` - Bun.stdin/Bun.stderr 替代
4. 扩展 `platform/utils.ts` - Bun.sleep, Bun.stringWidth 等

#### Phase 2: 核心模块解耦 (高优先级)
按依赖关系从底层到上层：
1. `global/index.ts` - 全局配置（被大量模块依赖）
2. `util/log.ts` - 日志系统
3. `file/index.ts`, `file/time.ts`, `file/ripgrep.ts` - 文件操作
4. `config/config.ts`, `config/markdown.ts` - 配置系统

#### Phase 3: 功能模块解耦 (中优先级)
1. `format/formatter.ts`, `format/index.ts` - 代码格式化
2. `tool/*.ts` - 工具模块
3. `skill/*.ts` - Skill 系统
4. `session/*.ts` - 会话管理
5. `lsp/client.ts` - LSP 客户端

#### Phase 4: CLI 和 UI 模块解耦 (中优先级)
1. `cli/cmd/*.ts` - CLI 命令
2. `cli/cmd/tui/**/*.ts` - TUI 组件
3. `cli/ui.ts` - UI 工具

#### Phase 5: 网络和插件模块 (低优先级)
1. `server/server.ts` - HTTP 服务器
2. `plugin/*.ts` - 插件系统
3. `mcp/*.ts` - MCP 认证
4. `provider/*.ts` - Provider 配置

#### Phase 6: 其他模块 (低优先级)
1. `project/*.ts` - 项目管理
2. `worktree/index.ts` - 工作树
3. `snapshot/index.ts` - 快照
4. `auth/index.ts` - 认证
5. `acp/agent.ts` - ACP Agent

### 预计工作量
- **Phase 1**: 2-3 小时（平台层扩展）
- **Phase 2**: 3-4 小时（核心模块）
- **Phase 3**: 4-5 小时（功能模块）
- **Phase 4**: 3-4 小时（CLI/UI）
- **Phase 5**: 2-3 小时（网络/插件）
- **Phase 6**: 2-3 小时（其他模块）

**总计**: 约 16-22 小时

### 建议的下一步
建议从 **Phase 1** 开始，先扩展平台层以支持所有需要的 Bun API 替代。这样可以确保后续模块解耦时有完整的工具链支持。

是否开始执行 Phase 1？