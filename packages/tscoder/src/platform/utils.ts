import { execSync } from "child_process"
import { createHash } from "crypto"

// ANSI color codes
const ANSI_COLORS: Record<string, string> = {
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  grey: "\x1b[90m",
  reset: "\x1b[0m",
}

export function stringWidth(str: string): number {
  // Strip ANSI escape codes and calculate visible width
  const stripped = str.replace(/\x1b\[[0-9;]*m/g, "")
  let width = 0
  for (const char of stripped) {
    const code = char.codePointAt(0) ?? 0
    // Check for full-width characters (CJK, etc.)
    if (
      (code >= 0x1100 && code <= 0x115f) || // Hangul Jamo
      (code >= 0x2e80 && code <= 0xa4cf) || // CJK
      (code >= 0xac00 && code <= 0xd7a3) || // Hangul Syllables
      (code >= 0xf900 && code <= 0xfaff) || // CJK Compatibility Ideographs
      (code >= 0xfe10 && code <= 0xfe19) || // Vertical forms
      (code >= 0xfe30 && code <= 0xfe6f) || // CJK Compatibility Forms
      (code >= 0xff00 && code <= 0xff60) || // Fullwidth Forms
      (code >= 0xffe0 && code <= 0xffe6) || // Fullwidth Symbols
      (code >= 0x1f300 && code <= 0x1f64f) // Emojis
    ) {
      width += 2
    } else {
      width += 1
    }
  }
  return width
}

export function color(colorName: string, format: "ansi"): string | null {
  if (format !== "ansi") return null
  return ANSI_COLORS[colorName.toLowerCase()] ?? null
}

export function which(command: string, options?: { cwd?: string; PATH?: string }): string | null {
  const isWindows = process.platform === "win32"
  const pathExt = isWindows ? ".exe;.cmd;.bat;.com" : ""
  const pathSep = isWindows ? ";" : ":"
  
  const searchPaths = options?.PATH
    ? options.PATH.split(pathSep)
    : process.env.PATH?.split(pathSep) ?? []
  
  const extensions = isWindows ? pathExt.split(";") : [""]
  
  for (const dir of searchPaths) {
    for (const ext of extensions) {
      const fullPath = `${dir}/${command}${ext}`
      try {
        // Check if file exists and is executable
        const stats = require("fs").statSync(fullPath)
        if (stats.isFile()) {
          return fullPath
        }
      } catch {
        // File doesn't exist or can't be accessed
      }
    }
  }
  
  return null
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function resolve(moduleId: string, from?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const resolved = require.resolve(moduleId, from ? { paths: [from] } : undefined)
      resolve(resolved)
    } catch (error) {
      reject(error)
    }
  })
}

export namespace hash {
  export function xxHash32(input: string | Buffer): number {
    // Use Node.js crypto as a fallback for xxHash32
    // Note: This is not exactly xxHash32, but provides similar functionality
    const hash = createHash("md5")
    hash.update(input)
    const hex = hash.digest("hex")
    // Convert first 8 chars of hex to number (similar to 32-bit hash)
    return parseInt(hex.slice(0, 8), 16)
  }
}

export namespace semver {
  export function satisfies(version: string, range: string): boolean {
    // Simple semver satisfies implementation
    // For production use, consider using the 'semver' npm package
    const [ver] = version.split("-")
    const [major, minor, patch] = ver.split(".").map(Number)
    
    // Handle ^x.y.z
    if (range.startsWith("^")) {
      const [rMajor, rMinor, rPatch] = range.slice(1).split(".").map(Number)
      if (major !== rMajor) return false
      if (minor < rMinor) return false
      if (minor === rMinor && patch < rPatch) return false
      return true
    }
    
    // Handle ~x.y.z
    if (range.startsWith("~")) {
      const [rMajor, rMinor, rPatch] = range.slice(1).split(".").map(Number)
      if (major !== rMajor) return false
      if (minor !== rMinor) return false
      if (patch < rPatch) return false
      return true
    }
    
    // Handle exact version
    return version === range
  }
  
  export function order(a: string, b: string): number {
    const parse = (v: string) => {
      const [ver] = v.split("-")
      return ver.split(".").map(Number)
    }
    
    const [aMajor, aMinor, aPatch] = parse(a)
    const [bMajor, bMinor, bPatch] = parse(b)
    
    if (aMajor !== bMajor) return aMajor < bMajor ? -1 : 1
    if (aMinor !== bMinor) return aMinor < bMinor ? -1 : 1
    if (aPatch !== bPatch) return aPatch < bPatch ? -1 : 1
    return 0
  }
}
