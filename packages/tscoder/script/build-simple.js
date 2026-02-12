#!/usr/bin/env node

import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import { exec } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dir = path.resolve(__dirname, "..");

async function runCommand(cmd, options = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, options, (error, stdout, stderr) => {
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

async function main() {
  try {
    console.log("Building tscoder core functionality...");
    
    // Create dist directory
    const distDir = path.join(dir, "dist");
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    
    // Create bin directory
    const binDir = path.join(distDir, "bin");
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }
    
    // Use TypeScript compiler to compile core functionality
    console.log("Compiling TypeScript files...");
    await runCommand(`npx tsc --project tsconfig.json --outDir dist/bin`);
    
    // Copy package.json and bin script
    console.log("Copying configuration files...");
    await fsPromises.copyFile(
      path.join(dir, "package.json"),
      path.join(distDir, "package.json")
    );
    
    await fsPromises.copyFile(
      path.join(dir, "bin/tscoder"),
      path.join(binDir, "tscoder")
