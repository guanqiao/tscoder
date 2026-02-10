import { promises as fs, type Stats } from "fs"
import path from "path"
import { glob as fastGlob, type Options as FastGlobOptions } from "fast-glob"
import { minimatch } from "minimatch"

export interface FileHandle {
  exists(): Promise<boolean>
  text(): Promise<string>
  json<T>(): Promise<T>
  stat(): Promise<Stats>
  write(data: string | Buffer, options?: { mode?: number }): Promise<void>
  size(): Promise<number>
  arrayBuffer(): Promise<ArrayBuffer>
}

export function file(filepath: string): FileHandle {
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
    stat: () => fs.stat(filepath),
    write: (data, options) => fs.writeFile(filepath, data, { mode: options?.mode }),
    size: async () => {
      try {
        const s = await fs.stat(filepath)
        return s.size
      } catch {
        return 0
      }
    },
    arrayBuffer: async () => {
      const buffer = await fs.readFile(filepath)
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    },
  }
}

export async function writeFile(
  filepath: string,
  data: string | Buffer,
  options?: { mode?: number }
): Promise<void> {
  // 确保目录存在
  const dir = path.dirname(filepath)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(filepath, data, { mode: options?.mode })
}

export interface GlobOptions {
  cwd?: string
  absolute?: boolean
  onlyFiles?: boolean
  followSymlinks?: boolean
  dot?: boolean
}

export class Glob {
  private pattern: string

  constructor(pattern: string) {
    this.pattern = pattern
  }

  /**
   * 检查文件路径是否匹配 glob 模式
   */
  match(filepath: string): boolean {
    return minimatch(filepath, this.pattern, { dot: true })
  }

  async* scan(options: GlobOptions = {}): AsyncGenerator<string> {
    const entries = await fastGlob(this.pattern, {
      cwd: options.cwd,
      absolute: options.absolute,
      onlyFiles: options.onlyFiles ?? true,
      followSymbolicLinks: options.followSymlinks ?? true,
      dot: options.dot ?? true,
    })
    for (const entry of entries) {
      yield entry
    }
  }
}

export async function* globScan(
  pattern: string,
  options: GlobOptions = {}
): AsyncGenerator<string> {
  const entries = await fastGlob(pattern, {
    cwd: options.cwd,
    absolute: options.absolute,
    onlyFiles: options.onlyFiles ?? true,
    followSymbolicLinks: options.followSymlinks ?? true,
    dot: options.dot ?? true,
  })
  for (const entry of entries) {
    yield entry
  }
}

export async function glob(
  pattern: string | string[],
  options: GlobOptions = {}
): Promise<string[]> {
  return fastGlob(pattern, {
    cwd: options.cwd,
    absolute: options.absolute,
    onlyFiles: options.onlyFiles ?? true,
    followSymbolicLinks: options.followSymlinks ?? true,
    dot: options.dot ?? true,
  })
}
