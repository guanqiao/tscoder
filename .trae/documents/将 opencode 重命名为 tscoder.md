## 任务概述

将项目中所有的 "opencode" 替换为 "tscoder"，包括文件目录、图标、代码内容等。

## 影响范围统计

* **代码出现次数**: 约 1170 处跨 100+ 文件

* **文件/目录名包含 opencode**: 约 40+ 个

* **包名**: `@opencode-ai/*` 需要改为 `@tscoder/*`

## 详细执行计划

### 第一阶段：目录和文件重命名

1. 重命名 `packages/opencode/` → `packages/tscoder/`
2. 重命名 `packages/opencode/bin/opencode` → `packages/tscoder/bin/tscoder`
3. 重命名 `.opencode/` → `.tscoder/`
4. 重命名 `.github/workflows/opencode.yml` → `.github/workflows/tscoder.yml`
5. 重命名 `nix/opencode.nix` → `nix/tscoder.nix`
6. 重命名所有品牌资源文件（logo、图标等）

### 第二阶段：package.json 文件更新

1. 根目录 `package.json`:

   * 修改 `name` 字段

   * 更新 `workspaces` 中的引用

   * 更新依赖包名 `@opencode-ai/*` → `@tscoder/*`

2. 各子包 `package.json`:

   * `packages/tscoder/package.json`: 修改 name 为 `tscoder`，bin 指向 `./bin/tscoder`

   * `packages/util/package.json`: 修改 name 为 `@tscoder/util`

   * `packages/ui/package.json`: 修改 name 为 `@tscoder/ui`

   * `packages/script/package.json`: 修改 name 为 `@tscoder/script`

   * `packages/sdk/js/package.json`: 修改 name 为 `@tscoder/sdk`

   * `packages/plugin/package.json`: 修改 name 为 `@tscoder/plugin`

   * `packages/slack/package.json`: 修改 name 为 `@tscoder/slack`

   * 更新所有包之间的 workspace 依赖引用

### 第三阶段：代码内容替换

1. 替换所有 `import` 语句中的 `@opencode-ai/*` → `@tscoder/*`
2. 替换 CLI 命令名 `opencode` → `tscoder`
3. 替换配置文件中的键名（如 `OPENCODE_*` 环境变量 → `TSCODER_*`）
4. 替换文档中的所有提及
5. 替换代码字符串中的品牌名

### 第四阶段：图标和品牌资源

1. 更新 `packages/identity/` 中的图标
2. 更新 `packages/console/app/src/asset/` 中的品牌资源
3. 更新 `packages/ui/src/assets/icons/` 中的图标
4. 更新 `packages/extensions/zed/icons/` 中的图标
5. 更新 `packages/web/src/assets/` 中的资源

### 第五阶段：配置文件更新

1. 更新 `sst.config.ts` 中的项目名
2. 更新 `turbo.json` 中的配置
3. 更新 `.opencode/opencode.jsonc` → `.tscoder/tscoder.jsonc`
4. 更新所有主题文件中的引用
5. 更新 CI/CD 工作流文件

### 第六阶段：文档更新

1. 更新根目录 `README.md` 及所有语言版本
2. 更新 `packages/web/src/content/docs/` 中的所有文档
3. 更新各包的 `README.md`
4. 更新 `CONTRIBUTING.md`、`SECURITY.md` 等

### 第七阶段：验证和测试

1. 运行 `bun install` 验证依赖
2. 运行 `bun run typecheck` 检查类型
3. 运行测试确保功能正常
4. 验证 CLI 命令 `tscoder` 可正常执行

## 注意事项

* 这是一个破坏性变更，需要全面测试

* 某些硬编码的 URL（如 opencode.ai）可能需要保留或单独处理

* GitHub 仓库地址可能需要更新

* Docker

