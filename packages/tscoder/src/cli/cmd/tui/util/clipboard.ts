import { platform, release } from "os"
import clipboardy from "clipboardy"
import { lazy } from "../../../../util/lazy.js"
import { tmpdir } from "os"
import path from "path"
import { spawn } from "node:child_process"
import { file } from "@/platform"
import { which } from "@/platform"

/**
 * Writes text to clipboard via OSC 52 escape sequence.
 * This allows clipboard operations to work over SSH by having
 * the terminal emulator handle the clipboard locally.
 */
function writeOsc52(text: string): void {
  if (!process.stdout.isTTY) return
  const base64 = Buffer.from(text).toString("base64")
  const osc52 = `\x1b]52;c;${base64}\x07`
  const passthrough = process.env["TMUX"] || process.env["STY"]
  const sequence = passthrough ? `\x1bPtmux;\x1b${osc52}\x1b\\` : osc52
  process.stdout.write(sequence)
}

export namespace Clipboard {
  export interface Content {
    data: string
    mime: string
  }

  export async function read(): Promise<Content | undefined> {
    const os = platform()

    if (os === "darwin") {
      const tmpfile = path.join(tmpdir(), "opencode-clipboard.png")
      try {
        await new Promise<void>((resolve, reject) => {
          const proc = spawn("osascript", [
            "-e",
            `set imageData to the clipboard as "PNGf"`,
            "-e",
            `set fileRef to open for access POSIX file "${tmpfile}" with write permission`,
            "-e",
            "set eof fileRef to 0",
            "-e",
            "write imageData to fileRef",
            "-e",
            "close access fileRef",
          ])
          proc.on("exit", (code) => (code === 0 ? resolve() : reject()))
          proc.on("error", reject)
        })
        const f = file(tmpfile)
        const buffer = await f.arrayBuffer()
        return { data: Buffer.from(buffer).toString("base64"), mime: "image/png" }
      } catch {
      } finally {
        await new Promise<void>((resolve) => {
          spawn("rm", ["-f", tmpfile]).on("exit", () => resolve())
        })
      }
    }

    if (os === "win32" || release().includes("WSL")) {
      const script =
        "Add-Type -AssemblyName System.Windows.Forms; $img = [System.Windows.Forms.Clipboard]::GetImage(); if ($img) { $ms = New-Object System.IO.MemoryStream; $img.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); [System.Convert]::ToBase64String($ms.ToArray()) }"
      const base64 = await new Promise<string>((resolve) => {
        let output = ""
        const proc = spawn("powershell.exe", ["-NonInteractive", "-NoProfile", "-command", script])
        proc.stdout.on("data", (data) => (output += data))
        proc.on("exit", () => resolve(output.trim()))
        proc.on("error", () => resolve(""))
      })
      if (base64) {
        const imageBuffer = Buffer.from(base64.trim(), "base64")
        if (imageBuffer.length > 0) {
          return { data: imageBuffer.toString("base64"), mime: "image/png" }
        }
      }
    }

    if (os === "linux") {
      const wayland = await new Promise<Buffer | null>((resolve) => {
        let output = Buffer.alloc(0)
        const proc = spawn("wl-paste", ["-t", "image/png"])
        proc.stdout.on("data", (data) => (output = Buffer.concat([output, data])))
        proc.on("exit", (code) => resolve(code === 0 ? output : null))
        proc.on("error", () => resolve(null))
      })
      if (wayland && wayland.length > 0) {
        return { data: wayland.toString("base64"), mime: "image/png" }
      }
      const x11 = await new Promise<Buffer | null>((resolve) => {
        let output = Buffer.alloc(0)
        const proc = spawn("xclip", ["-selection", "clipboard", "-t", "image/png", "-o"])
        proc.stdout.on("data", (data) => (output = Buffer.concat([output, data])))
        proc.on("exit", (code) => resolve(code === 0 ? output : null))
        proc.on("error", () => resolve(null))
      })
      if (x11 && x11.length > 0) {
        return { data: x11.toString("base64"), mime: "image/png" }
      }
    }

    const text = await clipboardy.read().catch(() => {})
    if (text) {
      return { data: text, mime: "text/plain" }
    }
  }

  const getCopyMethod = lazy(() => {
    const os = platform()

    if (os === "darwin" && which("osascript")) {
      console.log("clipboard: using osascript")
      return async (text: string) => {
        const escaped = text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
        await new Promise<void>((resolve) => {
          const proc = spawn("osascript", ["-e", `set the clipboard to "${escaped}"`])
          proc.on("exit", () => resolve())
          proc.on("error", () => resolve())
        })
      }
    }

    if (os === "linux") {
      if (process.env["WAYLAND_DISPLAY"] && which("wl-copy")) {
        console.log("clipboard: using wl-copy")
        return async (text: string) => {
          await new Promise<void>((resolve) => {
            const proc = spawn("wl-copy", [], { stdio: ["pipe", "ignore", "ignore"] })
            proc.stdin?.write(text)
            proc.stdin?.end()
            proc.on("exit", () => resolve())
            proc.on("error", () => resolve())
          })
        }
      }
      if (which("xclip")) {
        console.log("clipboard: using xclip")
        return async (text: string) => {
          await new Promise<void>((resolve) => {
            const proc = spawn("xclip", ["-selection", "clipboard"], { stdio: ["pipe", "ignore", "ignore"] })
            proc.stdin?.write(text)
            proc.stdin?.end()
            proc.on("exit", () => resolve())
            proc.on("error", () => resolve())
          })
        }
      }
      if (which("xsel")) {
        console.log("clipboard: using xsel")
        return async (text: string) => {
          await new Promise<void>((resolve) => {
            const proc = spawn("xsel", ["--clipboard", "--input"], { stdio: ["pipe", "ignore", "ignore"] })
            proc.stdin?.write(text)
            proc.stdin?.end()
            proc.on("exit", () => resolve())
            proc.on("error", () => resolve())
          })
        }
      }
    }

    if (os === "win32") {
      console.log("clipboard: using powershell")
      return async (text: string) => {
        // Pipe via stdin to avoid PowerShell string interpolation ($env:FOO, $(), etc.)
        await new Promise<void>((resolve) => {
          const proc = spawn(
            "powershell.exe",
            [
              "-NonInteractive",
              "-NoProfile",
              "-Command",
              "[Console]::InputEncoding = [System.Text.Encoding]::UTF8; Set-Clipboard -Value ([Console]::In.ReadToEnd())",
            ],
            { stdio: ["pipe", "ignore", "ignore"] }
          )
          proc.stdin?.write(text)
          proc.stdin?.end()
          proc.on("exit", () => resolve())
          proc.on("error", () => resolve())
        })
      }
    }

    console.log("clipboard: no native support")
    return async (text: string) => {
      await clipboardy.write(text).catch(() => {})
    }
  })

  export async function copy(text: string): Promise<void> {
    writeOsc52(text)
    await getCopyMethod()(text)
  }
}
