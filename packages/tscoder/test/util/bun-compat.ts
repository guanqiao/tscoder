/**
 * Bun API 兼容性层 - 用于将 Bun 特定的 API 迁移到 Node.js
 * 这个文件提供了与 Bun.file 类似的 API，使用 Node.js 的 fs 模块实现
 */

import { promises as fs } from "fs"
import path from "path"

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

// 导出兼容的 Bun 对象
export const Bun = {
  file,
  write,
}

// 默认导出
export default Bun
