// Platform abstraction layer for decoupling from Bun runtime
// This module provides cross-platform APIs that work with both Bun and Node.js

export { file, writeFile, Glob, glob, globScan, type FileHandle, type GlobOptions } from "./fs"
export { $, ShellCommand, spawnAsync, streamToText, type ShellOptions, type ShellResult } from "./shell"
export { serve, connect, type ServerOptions, type ServerInstance, type ConnectOptions } from "./server"
export { which, sleep, resolve, hash, semver, stringWidth, color } from "./utils"
export { stdio } from "./process"
