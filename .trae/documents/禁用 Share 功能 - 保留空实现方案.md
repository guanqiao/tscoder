## 方案 2：保留空实现（推荐）实施计划

### 目标
禁用分享会话到 opencode.ai 的功能，但保留所有 API 接口和 UI 组件，使其以空实现方式运行，确保向后兼容。

### 现有状态分析
通过代码分析发现：
1. **Share/ShareNext 模块** 已经支持 `OPENCODE_DISABLE_SHARE` 环境变量，会返回空值
2. **Config** 已定义 `share: "manual" | "auto" | "disabled"` 配置项
3. **Session 模块** 的 `share()` 方法已检查 `cfg.share === "disabled"` 并抛出错误
4. **桌面应用** 已根据 `sync.data.config.share !== "disabled"` 控制分享按钮显示

### 需要修改的文件清单

#### 1. 核心模块（已部分支持，需完善）
| 文件路径 | 修改内容 | 优先级 |
|---------|---------|--------|
| `packages/opencode/src/share/share-next.ts` | 添加 `isDisabled()` 公开方法 | 高 |
| `packages/opencode/src/share/share.ts` | 添加 `isDisabled()` 公开方法 | 高 |
| `packages/opencode/src/session/index.ts` | 修改 `createNext()` 自动分享逻辑，避免报错 | 高 |

#### 2. CLI 模块
| 文件路径 | 修改内容 | 优先级 |
|---------|---------|--------|
| `packages/opencode/src/cli/cmd/run.ts` | 修改 `share()` 函数，添加分享禁用提示 | 中 |

#### 3. 服务器路由
| 文件路径 | 修改内容 | 优先级 |
|---------|---------|--------|
| `packages/opencode/src/server/routes/session.ts` | 修改 share/unshare 路由，返回空实现而非错误 | 中 |

#### 4. 桌面应用（已支持，验证即可）
| 文件路径 | 修改内容 | 优先级 |
|---------|---------|--------|
| `packages/app/src/components/session/session-header.tsx` | 验证分享按钮根据配置正确显示/隐藏 | 低 |

### 详细修改方案

#### 修改 1: ShareNext 模块添加状态查询方法
```typescript
// packages/opencode/src/share/share-next.ts
export namespace ShareNext {
  // ... 现有代码 ...
  
  export function isDisabled(): boolean {
    return disabled
  }
  
  export async function create(sessionID: string) {
    if (disabled) {
      log.info("share is disabled, skipping create", { sessionID })
      return { id: "", url: "", secret: "" }
    }
    // ... 现有代码 ...
  }
  
  // ... 其他方法保持不变 ...
}
```

#### 修改 2: Session 模块优化自动分享逻辑
```typescript
// packages/opencode/src/session/index.ts
export async function createNext(input: {...}) {
  // ... 现有代码 ...
  
  const cfg = await Config.get()
  // 修改：当 share 为 disabled 时，不执行自动分享
  if (!result.parentID && cfg.share !== "disabled") {
    if (Flag.OPENCODE_AUTO_SHARE || cfg.share === "auto") {
      share(result.id)
        .then((share) => {
          if (share.url) {  // 只有当有 URL 时才更新
            update(result.id, (draft) => {
              draft.share = share
            })
          }
        })
        .catch(() => {
          // Silently ignore sharing errors during session creation
        })
    }
  }
  
  // ... 现有代码 ...
}
```

#### 修改 3: CLI run 命令优化分享提示
```typescript
// packages/opencode/src/cli/cmd/run.ts
async function share(sdk: OpencodeClient, sessionID: string) {
  const cfg = await sdk.config.get()
  if (!cfg.data) return
  
  // 添加：检查分享是否被禁用
  if (cfg.data.share === "disabled") {
    log.info("sharing is disabled in configuration")
    return
  }
  
  if (cfg.data.share !== "auto" && !Flag.OPENCODE_AUTO_SHARE && !args.share) return
  
  const res = await sdk.session.share({ sessionID }).catch((error) => {
    if (error instanceof Error && error.message.includes("disabled")) {
      UI.println(UI.Style.TEXT_DANGER_BOLD + "!  " + error.message)
    }
    return { error }
  })
  
  if (!res.error && "data" in res && res.data?.share?.url) {
    UI.println(UI.Style.TEXT_INFO_BOLD + "~  " + res.data.share.url)
  }
}
```

#### 修改 4: 服务器路由返回空实现
```typescript
// packages/opencode/src/server/routes/session.ts
.post(
  "/:sessionID/share",
  describeRoute({...}),
  async (c) => {
    const sessionID = c.req.valid("param").sessionID
    const cfg = await Config.get()
    
    // 当分享被禁用时，返回会话信息但不执行分享
    if (cfg.share === "disabled") {
      const session = await Session.get(sessionID)
      return c.json(session)
    }
    
    await Session.share(sessionID)
    const session = await Session.get(sessionID)
    return c.json(session)
  },
)
```

### 配置使用方式

用户可以通过以下方式禁用分享功能：

1. **配置文件方式**（推荐）：
```json
// opencode.json
{
  "share": "disabled"
}
```

2. **环境变量方式**：
```bash
export OPENCODE_DISABLE_SHARE=true
```

### 预期行为

当 `share: "disabled"` 时：
- ✅ CLI `run` 命令不会尝试自动分享会话
- ✅ 桌面应用的分享按钮不会显示
- ✅ SDK `session.share()` 返回空对象而非报错
- ✅ 服务器 API 返回会话信息但不创建分享链接
- ✅ 所有分享相关的后台同步操作被跳过
- ✅ 不调用 opencode.ai 的任何 API

### 测试计划

1. 设置 `share: "disabled"` 配置
2. 运行 `opencode run` 命令，验证无分享链接生成
3. 验证桌面应用分享按钮隐藏
4. 验证 SDK 调用返回空值
5. 验证服务器 API 正常响应

### 风险评估

- **低风险**：所有修改都是向后兼容的
- **低风险**：现有功能不受影响，只是添加空实现分支
- **无风险**：不会删除任何代码，只是优化禁用逻辑