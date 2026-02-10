## 实施计划

### 目标
实现简化版 LLM 配置，支持：
1. 配置多个 LLM 供 model 命令选择
2. 每个 LLM 包含5个必填项：name, endpoint, apiKey, model, caCert
3. 所有 HTTPS 请求使用自定义 CA 证书

### 修改文件清单
1. `packages/opencode/src/config/config.ts` - 添加 LLM Schema 和配置项
2. `packages/opencode/src/provider/provider.ts` - 使用 CA 证书创建 HTTPS Agent
3. `packages/opencode/src/cli/cmd/models.ts` - 从 llm 配置读取模型列表
4. 更新相关文档

### 配置示例
```json
{
  "llm": [
    {
      "name": "OpenAI GPT-4",
      "endpoint": "https://api.openai.com/v1",
      "apiKey": "sk-...",
      "model": "gpt-4",
      "caCert": "~/.certs/ca.pem"
    }
  ]
}
```

### 实施步骤
1. 修改 config.ts 添加 LLM Schema
2. 修改 provider.ts 支持 CA 证书
3. 修改 models.ts 命令
4. 验证测试
5. 更新文档
6. Commit and push