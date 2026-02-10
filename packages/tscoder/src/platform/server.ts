import { createServer, type Server, type IncomingMessage, type ServerResponse } from "http"
import { type Socket } from "net"

export interface ServerOptions {
  port?: number
  hostname?: string
  fetch: (request: Request) => Response | Promise<Response>
}

export interface ServerInstance {
  port: number
  hostname: string
  stop(): Promise<void>
}

export function serve(options: ServerOptions): ServerInstance {
  const hostname = options.hostname ?? "0.0.0.0"
  const port = options.port ?? 0

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const url = `http://${req.headers.host}${req.url}`
      const method = req.method ?? "GET"
      
      // Convert IncomingMessage to Request
      const headers = new Headers()
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) {
          if (Array.isArray(value)) {
            value.forEach(v => headers.append(key, v))
          } else {
            headers.set(key, value)
          }
        }
      }

      // Read body
      const chunks: Buffer[] = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      const body = Buffer.concat(chunks)

      const request = new Request(url, {
        method,
        headers,
        body: body.length > 0 ? body : undefined,
      })

      const response = await options.fetch(request)

      // Convert Response to ServerResponse
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
      console.error("Server error:", error)
      res.statusCode = 500
      res.end("Internal Server Error")
    }
  })

  let actualPort = port
  
  server.listen(port, hostname, () => {
    const address = server.address()
    if (address && typeof address === "object") {
      actualPort = address.port
    }
  })

  return {
    get port() {
      return actualPort
    },
    get hostname() {
      return hostname
    },
    stop(): Promise<void> {
      return new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err)
          else resolve()
        })
      })
    },
  }
}

export interface ConnectOptions {
  hostname: string
  port: number
}

export function connect(options: ConnectOptions): Socket {
  const { createConnection } = require("net")
  return createConnection({ host: options.hostname, port: options.port })
}
