import { promises as fs, type Stats } from "fs"
import { glob } from "fast-glob"

export interface FileHandle {
  exists(): Promise<boolean>
  text(): Promise<string>
  json<T>(): Promise<T>
  stat(): Promise<Stats>
  write(data: string | Buffer, options?: { mode?: number }): Promise<void>
  size(): Promise<number>
  arrayBuffer(): Promise<ArrayBuffer>
}

export function file(path: string): FileHandle {
  return {
    exists: async () => {
      try {
        await fs.access(path)
        return true
      } catch {
        return false
      }
    },
    text: () => fs.readFile(path, "utf-8"),
    json: async <T>() => {
      const content = await fs.readFile(path, "utf-8")
      return JSON.parse(content) as T
    },
    stat: () => fs.stat(path),
    write: (data, options) => fs.writeFile(path, data, { mode: options?.mode }),
    size: async () => {
      try {
        const s = await fs.stat(path)
        return s.size
      } catch {
        return 0
      }
    },
    arrayBuffer: async () => {
      const buffer = await fs.readFile(path)
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    },
  }
}

export async function writeFile(
  path: string,
  data: string | Buffer,
  options?: { mode?: number }
): Promise<void> {
  await fs.writeFile(path, data, { mode: options?.mode })
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

  async* scan(options: GlobOptions = {}): AsyncGenerator<string> {
    const entries = await glob(this.pattern, {
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
  const entries = await glob(pattern, {
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
