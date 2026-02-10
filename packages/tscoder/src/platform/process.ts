// Process I/O abstraction for decoupling from Bun runtime
import { stdin, stderr } from "process"

export const stdio = {
  get stdin() {
    return {
      async text(): Promise<string> {
        const chunks: Buffer[] = []
        return new Promise((resolve, reject) => {
          stdin.on("data", (chunk) => chunks.push(Buffer.from(chunk)))
          stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")))
          stdin.on("error", reject)
        })
      },
      get isTTY() {
        return stdin.isTTY
      },
    }
  },
  get stderr() {
    return {
      write(data: string | Buffer): void {
        stderr.write(data)
      },
    }
  },
}
