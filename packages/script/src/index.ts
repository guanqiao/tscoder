import { exec } from "child_process";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootPkgPath = path.resolve(__dirname, "../../../package.json");
const rootPkg = JSON.parse(await fs.readFile(rootPkgPath, "utf8"));

// Skip Bun version check since we're not using Bun

const env = {
  OPENCODE_CHANNEL: process.env["OPENCODE_CHANNEL"],
  OPENCODE_BUMP: process.env["OPENCODE_BUMP"],
  OPENCODE_VERSION: process.env["OPENCODE_VERSION"],
  OPENCODE_RELEASE: process.env["OPENCODE_RELEASE"],
};

function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error running command: ${cmd}`);
        console.error(stderr);
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

const CHANNEL = await (async () => {
  if (env.OPENCODE_CHANNEL) return env.OPENCODE_CHANNEL;
  if (env.OPENCODE_BUMP) return "latest";
  if (env.OPENCODE_VERSION && !env.OPENCODE_VERSION.startsWith("0.0.0-")) return "latest";
  try {
    return await runCommand("git branch --show-current").then((x) => x.trim());
  } catch (error) {
    console.error("Error getting git branch:", error);
    return "latest";
  }
})();

const IS_PREVIEW = CHANNEL !== "latest";

const VERSION = await (async () => {
  if (env.OPENCODE_VERSION) return env.OPENCODE_VERSION;
  if (IS_PREVIEW) return `0.0.0-${CHANNEL}-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}`;
  try {
    const version = await fetch("https://registry.npmjs.org/opencode-ai/latest")
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((data) => data.version);
    const [major, minor, patch] = version.split(".").map((x) => Number(x) || 0);
    const t = env.OPENCODE_BUMP?.toLowerCase();
    if (t === "major") return `${major + 1}.0.0`;
    if (t === "minor") return `${major}.${minor + 1}.0`;
    return `${major}.${minor}.${patch + 1}`;
  } catch (error) {
    console.error("Error getting latest version:", error);
    return "1.0.0";
  }
})();

const team = [
  "actions-user",
  "opencode",
  "rekram1-node",
  "thdxr",
  "kommander",
  "jayair",
  "fwang",
  "adamdotdevin",
  "iamdavidhill",
  "opencode-agent[bot]",
  "R44VC0RP",
];

export const Script = {
  get channel() {
    return CHANNEL;
  },
  get version() {
    return VERSION;
  },
  get preview() {
    return IS_PREVIEW;
  },
  get release(): boolean {
    return !!env.OPENCODE_RELEASE;
  },
  get team() {
    return team;
  },
};

console.log(`opencode script`, JSON.stringify(Script, null, 2));
