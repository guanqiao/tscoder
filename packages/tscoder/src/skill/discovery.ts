import path from "path"
import { mkdir } from "fs/promises"
import { Log } from "../util/log"
import { Global } from "../global"
import { existsSync } from "fs"
import fs from "fs/promises"
import { file } from "@/platform"

export namespace Discovery {
  const log = Log.create({ service: "skill-discovery" })

  export function dir() {
    return path.join(Global.Path.config, "skills")
  }

  export async function pull(): Promise<string[]> {
    const result: string[] = []
    const skillsDir = dir()

    if (!existsSync(skillsDir)) {
      log.debug("skills directory does not exist", { path: skillsDir })
      return result
    }

    log.info("scanning local skills", { path: skillsDir })

    const entries = await fs.readdir(skillsDir, { withFileTypes: true }).catch(() => [])

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(skillsDir, entry.name)
        const skillMd = path.join(skillPath, "SKILL.md")

        if (await file(skillMd).exists()) {
          result.push(skillPath)
          log.debug("found local skill", { name: entry.name, path: skillPath })
        } else {
          log.warn("skill directory missing SKILL.md", { name: entry.name, path: skillPath })
        }
      }
    }

    log.info("loaded local skills", { count: result.length })
    return result
  }
}
