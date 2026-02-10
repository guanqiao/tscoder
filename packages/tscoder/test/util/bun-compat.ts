/**
 * Bun API 兼容性层 - 用于将 Bun 特定的 API 迁移到 Node.js
 * 这个文件提供了与 Bun 类似的 API，使用 Node.js 实现
 */

import { promises as fs } from "fs"
import path from "path"
import http from "http"
import type { AddressInfo } from "net"

export interface BunFileHandle {
  exists(): Promise<boolean>
  text(): Promise<string>
  json<T>(): Promise<T>
  arrayBuffer(): Promise<ArrayBuffer>
}

export function file(filepath: string): BunFileHandle {
  return {
    exists: async () => {
      try {
        await fs.access(filepath)
        return true
      } catch {
        return false
      }
    },
    text: () => fs.readFile(filepath, "utf-8"),
    json: async <T>() => {
      const content = await fs.readFile(filepath, "utf-8")
      return JSON.parse(content) as T
    },
    arrayBuffer: async () => {
      const buffer = await fs.readFile(filepath)
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    },
  }
}

export async function write(fileHandle: BunFileHandle | string, data: string | Buffer | Uint8Array): Promise<void> {
  const filepath = typeof fileHandle === "string" ? fileHandle : ""
  if (filepath) {
    await fs.writeFile(filepath, data)
  }
}

// Server 类型定义
interface BunServer {
  url: URL
  stop(): void
}

interface ServeOptions {
  port?: number
  idleTimeout?: number
  fetch(req: Request): Response | Promise<Response>
}

// 模拟 Bun.serve - 使用 Node.js http 模块
function serve(options: ServeOptions): BunServer {
  const server = http.createServer(async (req, res) => {
    // 将 Node.js 请求转换为 Fetch API Request
    const url = `http://localhost${req.url}`
    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        headers.set(key, Array.isArray(value) ? value.join(", ") : value)
      }
    }

    const chunks: Buffer[] = []
    for await (const chunk of req) {
      chunks.push(chunk)
    }
    const body = Buffer.concat(chunks)

    const request = new Request(url, {
      method: req.method,
      headers,
      body: req.method !== "GET" && req.method !== "HEAD" ? body : undefined,
    })

    try {
      const response = await options.fetch(request)
      res.statusCode = response.status
      res.statusMessage = response.statusText

      response.headers.forEach((value, key) => {
        res.setHeader(key, value)
      })

      if (response.body) {
        const reader = response.body.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          res.write(value)
        }
      }
      res.end()
    } catch (error) {
      res.statusCode = 500
      res.end(String(error))
    }
  })

  const port = options.port || 0
  server.listen(port)

  const address = server.address() as AddressInfo

  return {
    url: new URL(`http://localhost:${address.port}`),
    stop: () => {
      server.close()
    },
  }
}

// 模拟 Bun.gc - Node.js 中调用 gc
function gc(force?: boolean): void {
  if (global.gc) {
    global.gc()
  }
}

// 模拟 Bun.sleep
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 模拟 Bun.sleepSync
function sleepSync(ms: number): void {
  const start = Date.now()
  while (Date.now() - start < ms) {
    // 忙等待
  }
}

// 导出兼容的 Bun 对象
export const Bun = {
  file,
  write,
  serve,
  gc,
  sleep,
  sleepSync,
}

// 默认导出
export default Bun
