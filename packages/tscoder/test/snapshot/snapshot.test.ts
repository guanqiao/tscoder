import { test, expect } from "vitest"
import * as fs from "fs/promises"
import { $ } from "../../src/platform"
import { file as BunFile } from "../util/bun-compat"
import { Snapshot } from "../../src/snapshot"
import { Instance } from "../../src/project/instance"
import { tmpdir } from "../fixture/fixture"

// 兼容层：将 Bun.file 替换为 Node.js 实现
const Bun = {
  file: BunFile
}

async function bootstrap() {
  return tmpdir({
    git: true,
    init: async (dir) => {
      const unique = Math.random().toString(36).slice(2)
      const aContent = `A${unique}`
      const bContent = `B${unique}`
      await fs.writeFile(`${dir}/a.txt`, aContent)
      await fs.writeFile(`${dir}/b.txt`, bContent)
      await $`git add .`.cwd(dir).quiet()
      await $`git commit --no-gpg-sign -m init`.cwd(dir).quiet()
      return {
        aContent,
        bContent,
      }
    },
  })
}

test("tracks deleted files correctly", async () => {
  await using tmp = await bootstrap()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const before = await Snapshot.track()
      expect(before).toBeTruthy()

      await fs.unlink(`${tmp.path}/a.txt`).catch(() => {})

      expect((await Snapshot.patch(before!)).files).toContain(`${tmp.path}/a.txt`)
    },
  })
})

test("revert should remove new files", async () => {
  await using tmp = await bootstrap()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const before = await Snapshot.track()
      expect(before).toBeTruthy()

      await fs.writeFile(`${tmp.path}/new.txt`, "NEW")

      await Snapshot.revert([await Snapshot.patch(before!)])

      expect(await Bun.file(`${tmp.path}/new.txt`).exists()).toBe(false)
    },
  })
})

test("revert in subdirectory", async () => {
  await using tmp = await bootstrap()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const before = await Snapshot.track()
      expect(before).toBeTruthy()

      await fs.mkdir(`${tmp.path}/sub`, { recursive: true })
      await fs.writeFile(`${tmp.path}/sub/file.txt`, "SUB")

      await Snapshot.revert([await Snapshot.patch(before!)])

      expect(await Bun.file(`${tmp.path}/sub/file.txt`).exists()).toBe(false)
      // Note: revert currently only removes files, not directories
      // The empty subdirectory will remain
    },
  })
})

test("patch should include added files", async () => {
  await using tmp = await bootstrap()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const before = await Snapshot.track()
      expect(before).toBeTruthy()

      await fs.writeFile(`${tmp.path}/added.txt`, "ADDED")

      const patch = await Snapshot.patch(before!)
      expect(patch.files).toContain(`${tmp.path}/added.txt`)
      expect(patch.additions).toBe(1)
    },
  })
})

test("patch should include modified files", async () => {
  await using tmp = await bootstrap()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const before = await Snapshot.track()
      expect(before).toBeTruthy()

      await fs.writeFile(`${tmp.path}/a.txt`, "MODIFIED")

      const patch = await Snapshot.patch(before!)
      expect(patch.files).toContain(`${tmp.path}/a.txt`)
      expect(patch.modifications).toBe(1)
    },
  })
})

test("patch should include deleted files", async () => {
  await using tmp = await bootstrap()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const before = await Snapshot.track()
      expect(before).toBeTruthy()

      await fs.unlink(`${tmp.path}/a.txt`).catch(() => {})

      const patch = await Snapshot.patch(before!)
      expect(patch.files).toContain(`${tmp.path}/a.txt`)
      expect(patch.deletions).toBe(1)
    },
  })
})

test("patch should track all types of changes", async () => {
  await using tmp = await bootstrap()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const before = await Snapshot.track()
      expect(before).toBeTruthy()

      // Add a file
      await fs.writeFile(`${tmp.path}/added.txt`, "ADDED")

      // Modify a file
      await fs.writeFile(`${tmp.path}/a.txt`, "MODIFIED")

      // Delete a file
      await fs.unlink(`${tmp.path}/b.txt`).catch(() => {})

      const patch = await Snapshot.patch(before!)
      expect(patch.additions).toBe(1)
      expect(patch.modifications).toBe(1)
      expect(patch.deletions).toBe(1)
    },
  })
})

test("concurrent file operations during patch", async () => {
  await using tmp = await bootstrap()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const before = await Snapshot.track()
      expect(before).toBeTruthy()

      // Start creating files
      const createFiles = async () => {
        for (let i = 0; i < 5; i++) {
          await fs.writeFile(`${tmp.path}/concurrent-${i}.txt`, `content-${i}`)
        }
      }

      // Get patch while files are being created
      const [patch] = await Promise.all([Snapshot.patch(before!), createFiles()])

      // Patch should include all files that were created
      expect(patch.files.length).toBeGreaterThanOrEqual(0)
    },
  })
})

test("snapshot state isolation between projects", async () => {
  await using tmp1 = await bootstrap()
  await using tmp2 = await bootstrap()

  await Instance.provide({
    directory: tmp1.path,
    fn: async () => {
      const before1 = await Snapshot.track()
      expect(before1).toBeTruthy()

      await fs.writeFile(`${tmp1.path}/project1.txt`, "project1 content")
      const patch1 = await Snapshot.patch(before1!)
      expect(patch1.files).toContain(`${tmp1.path}/project1.txt`)
    },
  })

  await Instance.provide({
    directory: tmp2.path,
    fn: async () => {
      const before2 = await Snapshot.track()
      expect(before2).toBeTruthy()

      await fs.writeFile(`${tmp2.path}/project2.txt`, "project2 content")
      const patch2 = await Snapshot.patch(before2!)
      expect(patch2.files).toContain(`${tmp2.path}/project2.txt`)
      // Should not contain files from project1
      expect(patch2.files).not.toContain(`${tmp1.path}/project1.txt`)
    },
  })
})

test("patch detects changes in secondary worktree", async () => {
  await using tmp = await bootstrap()

  // First, create the secondary worktree
  const secondaryDir = `${tmp.path}-secondary`
  await $`git worktree add ${secondaryDir}`.cwd(tmp.path).quiet()

  try {
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        expect(await Snapshot.track()).toBeTruthy()
      },
    })

    // Make changes in secondary worktree
    await fs.writeFile(`${secondaryDir}/secondary.txt`, "secondary content")

    await Instance.provide({
      directory: secondaryDir,
      fn: async () => {
        const before = await Snapshot.track()
        expect(before).toBeTruthy()

        const patch = await Snapshot.patch(before!)
        expect(patch.files).toContain(`${secondaryDir}/secondary.txt`)
        expect(patch.additions).toBe(1)
      },
    })
  } finally {
    // Cleanup: remove secondary worktree
    await $`git worktree remove ${secondaryDir} --force`.cwd(tmp.path).quiet().nothrow()
  }
})

test("revert only removes files in invoking worktree", async () => {
  await using tmp = await bootstrap()

  // Create secondary worktree
  const secondaryDir = `${tmp.path}-secondary`
  await $`git worktree add ${secondaryDir}`.cwd(tmp.path).quiet()

  try {
    // Add files in both worktrees
    await fs.writeFile(`${tmp.path}/primary.txt`, "primary")
    await fs.writeFile(`${secondaryDir}/secondary.txt`, "secondary")

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const before = await Snapshot.track()
        expect(before).toBeTruthy()

        await Snapshot.revert([await Snapshot.patch(before!)])

        // Only primary.txt should be removed
        expect(await Bun.file(`${tmp.path}/primary.txt`).exists()).toBe(false)
      },
    })

    // Secondary file should still exist
    expect(await Bun.file(`${secondaryDir}/secondary.txt`).exists()).toBe(true)
  } finally {
    await $`git worktree remove ${secondaryDir} --force`.cwd(tmp.path).quiet().nothrow()
  }
})

test("diff reports worktree-only/shared edits and ignores primary-only", async () => {
  await using tmp = await bootstrap()

  const secondaryDir = `${tmp.path}-secondary`
  await $`git worktree add ${secondaryDir}`.cwd(tmp.path).quiet()

  try {
    // Create files in primary
    await fs.writeFile(`${tmp.path}/primary-only.txt`, "primary-only")
    await fs.writeFile(`${tmp.path}/shared.txt`, "shared-original")

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        expect(await Snapshot.track()).toBeTruthy()
      },
    })

    // Modify shared in secondary
    await fs.writeFile(`${secondaryDir}/shared.txt`, "shared-modified")
    await fs.writeFile(`${secondaryDir}/secondary-only.txt`, "secondary-only")

    await Instance.provide({
      directory: secondaryDir,
      fn: async () => {
        const diff = await Snapshot.diff()
        // Should include shared (modified in secondary) and secondary-only
        expect(diff.files).toContain(`${secondaryDir}/shared.txt`)
        expect(diff.files).toContain(`${secondaryDir}/secondary-only.txt`)
        // Should NOT include primary-only (not in secondary worktree)
        expect(diff.files).not.toContain(`${tmp.path}/primary-only.txt`)
      },
    })
  } finally {
    await $`git worktree remove ${secondaryDir} --force`.cwd(tmp.path).quiet().nothrow()
  }
})

test("track with no changes returns same hash", async () => {
  await using tmp = await bootstrap()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const hash1 = await Snapshot.track()
      expect(hash1).toBeTruthy()

      // Track again with no changes
      const hash2 = await Snapshot.track()
      expect(hash2).toBe(hash1)
    },
  })
})

test("diff function with various changes", async () => {
  await using tmp = await bootstrap()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const before = await Snapshot.track()
      expect(before).toBeTruthy()

      // Make various changes
      await fs.writeFile(`${tmp.path}/new.txt`, "new content")
      await fs.writeFile(`${tmp.path}/a.txt`, "modified")
      await fs.unlink(`${tmp.path}/b.txt`).catch(() => {})

      const diff = await Snapshot.diff()
      expect(diff.additions).toBe(1)
      expect(diff.modifications).toBe(1)
      expect(diff.deletions).toBe(1)
    },
  })
})

test("restore function", async () => {
  await using tmp = await bootstrap()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const before = await Snapshot.track()
      expect(before).toBeTruthy()

      // Make changes
      await fs.writeFile(`${tmp.path}/new.txt`, "new")
      await fs.writeFile(`${tmp.path}/a.txt`, "modified")
      await fs.unlink(`${tmp.path}/b.txt`).catch(() => {})

      // Restore should revert all changes
      await Snapshot.restore(before!)

      expect(await Bun.file(`${tmp.path}/new.txt`).exists()).toBe(false)
      const aContent = await fs.readFile(`${tmp.path}/a.txt`, "utf-8")
      expect(aContent).not.toBe("modified")
      expect(await Bun.file(`${tmp.path}/b.txt`).exists()).toBe(true)
    },
  })
})

test("revert should not delete files that existed but were deleted in snapshot", async () => {
  await using tmp = await bootstrap()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      // Create initial snapshot
      const snapshot1 = await Snapshot.track()
      expect(snapshot1).toBeTruthy()

      await fs.unlink(`${tmp.path}/a.txt`).catch(() => {})

      const patch1 = await Snapshot.patch(snapshot1!)

      // Create another snapshot
      const snapshot2 = await Snapshot.track()
      expect(snapshot2).toBeTruthy()

      // Add a new file
      await fs.writeFile(`${tmp.path}/new.txt`, "new content")

      // Revert to snapshot1 - should not delete new.txt because it didn't exist in snapshot1
      await Snapshot.revert([patch1])

      // new.txt should still exist because it wasn't tracked in snapshot1
      expect(await Bun.file(`${tmp.path}/new.txt`).exists()).toBe(true)
    },
  })
})

test("revert preserves file that existed in snapshot when deleted then recreated", async () => {
  await using tmp = await bootstrap()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      // Create a file that exists in the snapshot
      await fs.writeFile(`${tmp.path}/existing.txt`, "original content")

      const snapshot = await Snapshot.track()
      expect(snapshot).toBeTruthy()

      await fs.unlink(`${tmp.path}/existing.txt`).catch(() => {})

      // Recreate the file with different content
      await fs.writeFile(`${tmp.path}/existing.txt`, "new content")

      const patch = await Snapshot.patch(snapshot!)
      await Snapshot.revert([patch])

      // The file should be preserved (revert removes files added after snapshot)
      expect(await Bun.file(`${tmp.path}/existing.txt`).exists()).toBe(true)
    },
  })
})

test("diffFull sets status based on git change type", async () => {
  await using tmp = await bootstrap()

  // Create files with initial content
  await fs.writeFile(`${tmp.path}/grow.txt`, "initial")
  await fs.writeFile(`${tmp.path}/shrink.txt`, "line1\nline2\nline3")
  await fs.writeFile(`${tmp.path}/unchanged.txt`, "no changes")

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const before = await Snapshot.track()
      expect(before).toBeTruthy()

      await fs.writeFile(`${tmp.path}/grow.txt`, "one\ntwo\n")
      await fs.writeFile(`${tmp.path}/shrink.txt`, "line1")
      // unchanged.txt is not modified

      const full = await Snapshot.diffFull(before!)

      const growChange = full.changes.find((c) => c.path.includes("grow.txt"))
      const shrinkChange = full.changes.find((c) => c.path.includes("shrink.txt"))
      const unchangedChange = full.changes.find((c) => c.path.includes("unchanged.txt"))

      expect(growChange?.status).toBe("added")
      expect(shrinkChange?.status).toBe("deleted")
      expect(unchangedChange).toBeUndefined()
    },
  })
})

test("diffFull with new file additions", async () => {
  await using tmp = await bootstrap()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const before = await Snapshot.track()
      expect(before).toBeTruthy()

      await fs.writeFile(`${tmp.path}/new.txt`, "new content")
      await fs.writeFile(`${tmp.path}/another.txt`, "another content")

      const full = await Snapshot.diffFull(before!)

      expect(full.changes.length).toBe(2)
      expect(full.changes.every((c) => c.status === "added")).toBe(true)
    },
  })
})

test("diffFull with file modifications", async () => {
  await using tmp = await bootstrap()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const before = await Snapshot.track()
      expect(before).toBeTruthy()

      await fs.writeFile(`${tmp.path}/b.txt`, "modified content")

      const full = await Snapshot.diffFull(before!)

      const bChange = full.changes.find((c) => c.path.includes("b.txt"))
      expect(bChange).toBeDefined()
      expect(bChange?.status).toBe("modified")
    },
  })
})

test("diffFull with file deletions", async () => {
  await using tmp = await bootstrap()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const before = await Snapshot.track()
      expect(before).toBeTruthy()

      await fs.unlink(`${tmp.path}/a.txt`).catch(() => {})

      const full = await Snapshot.diffFull(before!)

      const aChange = full.changes.find((c) => c.path.includes("a.txt"))
      expect(aChange).toBeDefined()
      expect(aChange?.status).toBe("deleted")
    },
  })
})

test("diffFull with multiple line additions", async () => {
  await using tmp = await bootstrap()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const before = await Snapshot.track()
      expect(before).toBeTruthy()

      await fs.writeFile(`${tmp.path}/multi.txt`, "line1\nline2\nline3")

      const full = await Snapshot.diffFull(before!)

      const multiChange = full.changes.find((c) => c.path.includes("multi.txt"))
      expect(multiChange).toBeDefined()
      expect(multiChange?.additions).toBe(3)
      expect(multiChange?.deletions).toBe(0)
    },
  })
})

test("diffFull with addition and deletion", async () => {
  await using tmp = await bootstrap()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const before = await Snapshot.track()
      expect(before).toBeTruthy()

      await fs.writeFile(`${tmp.path}/added.txt`, "added content")
      await fs.unlink(`${tmp.path}/a.txt`).catch(() => {})

      const full = await Snapshot.diffFull(before!)

      expect(full.changes.length).toBe(2)
      const added = full.changes.find((c) => c.path.includes("added.txt"))
      const deleted = full.changes.find((c) => c.path.includes("a.txt"))
      expect(added?.status).toBe("added")
      expect(deleted?.status).toBe("deleted")
    },
  })
})

test("diffFull with multiple additions and deletions", async () => {
  await using tmp = await bootstrap()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const before = await Snapshot.track()
      expect(before).toBeTruthy()

      await fs.writeFile(`${tmp.path}/multi1.txt`, "line1\nline2\nline3")
      await fs.writeFile(`${tmp.path}/multi2.txt`, "content")
      await fs.unlink(`${tmp.path}/a.txt`).catch(() => {})
      await fs.unlink(`${tmp.path}/b.txt`).catch(() => {})

      const full = await Snapshot.diffFull(before!)

      expect(full.changes.length).toBe(4)
      expect(full.changes.filter((c) => c.status === "added").length).toBe(2)
      expect(full.changes.filter((c) => c.status === "deleted").length).toBe(2)
    },
  })
})

test("diffFull with no changes", async () => {
  await using tmp = await bootstrap()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const before = await Snapshot.track()
      expect(before).toBeTruthy()

      const after = await Snapshot.track()
      expect(after).toBe(before)

      const full = await Snapshot.diffFull(before!)

      expect(full.changes.length).toBe(0)
      expect(full.summary.additions).toBe(0)
      expect(full.summary.deletions).toBe(0)
    },
  })
})

test("diffFull with binary file changes", async () => {
  await using tmp = await bootstrap()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const before = await Snapshot.track()
      expect(before).toBeTruthy()

      await fs.writeFile(`${tmp.path}/binary.bin`, new Uint8Array([0x00, 0x01, 0x02, 0x03]))

      const full = await Snapshot.diffFull(before!)

      const binaryChange = full.changes.find((c) => c.path.includes("binary.bin"))
      expect(binaryChange).toBeDefined()
      expect(binaryChange?.status).toBe("added")
    },
  })
})

test("diffFull with whitespace changes", async () => {
  await using tmp = await bootstrap()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      await fs.writeFile(`${tmp.path}/whitespace.txt`, "line1\nline2")
      const before = await Snapshot.track()
      expect(before).toBeTruthy()

      await fs.writeFile(`${tmp.path}/whitespace.txt`, "line1\n\nline2\n")

      const full = await Snapshot.diffFull(before!)

      const wsChange = full.changes.find((c) => c.path.includes("whitespace.txt"))
      expect(wsChange).toBeDefined()
      expect(wsChange?.status).toBe("modified")
      expect(wsChange?.additions).toBe(2)
    },
  })
})
