#!/usr/bin/env node

import fs from "fs";
import path from "path";
import chalk from "chalk";
import { select } from "@inquirer/prompts";

// Supported languages and file extensions
type Language = "All" | "TypeScript" | "JavaScript" | "Python" | "Java";
const langToExt: Record<Language, string[] | null> = {
  All: null,
  TypeScript: [".ts", ".tsx"],
  JavaScript: [".js", ".jsx"],
  Python: [".py"],
  Java: [".java"],
};

// Parse CLI flags (e.g. --typescript, --javascript, etc.)
export function parseFlags(): Language | null {
  const args = process.argv.slice(2);
  for (const arg of args) {
    if (arg.startsWith("--")) {
      const key = arg.slice(2).toLowerCase();
      switch (key) {
        case "typescript":
          return "TypeScript";
        case "javascript":
          return "JavaScript";
        case "python":
          return "Python";
        case "java":
          return "Java";
        case "all":
          return "All";
        default:
          console.warn(chalk.red(`Unknown flag: ${arg}`));
          process.exit(1);
      }
    }
  }
  return null;
}

// Recursively gather files, ignoring node_modules and hidden folders
export function getAllFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

// Count lines in a single file, ignoring comment lines based on extension
export function countLines(file: string, ext: string): number {
  let content = fs.readFileSync(file, "utf8");

  // JavaScript/TypeScript/Java: remove block comments and filter out single-line comments
  if ([".js", ".jsx", ".ts", ".tsx", ".java"].includes(ext)) {
    // strip multiline comments
    content = content.replace(/\/\*[\s\S]*?\*\//g, "");
    const lines = content.split("\n");

    return lines.filter((line) => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith("//");
    }).length;
  }

  // Python: filter out lines starting with '#'
  if (ext === ".py") {
    content = content.replace(/(^\s*(?!.*=\s*)('{3}|"{3})[\s\S]*?\2)/gm, "");

    const lines = content.split("\n");
    return lines.filter((line) => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith("#");
    }).length;
  }

  // Default: count all lines
  return content.split("\n").length;
}

// Perform the line counting based on selected extensions
export function performCount(exts: string[] | null): void {
  const startDir = process.cwd();
  const files = getAllFiles(startDir);
  let total = 0;
  let scanned = 0;

  for (const file of files) {
    const ext = path.extname(file);
    if (!exts || exts.includes(ext)) {
      try {
        total += countLines(file, ext);
        scanned++;
      } catch {
        // skip unreadable files
      }
    }
  }

  console.log(chalk.blue("\nResults:"));
  console.log(chalk.green(`• Files scanned: ${scanned}`));
  console.log(chalk.yellow(`• Total lines of code: ${total}\n`));
}

// Interactive prompt flow using @inquirer/prompts
export async function interactiveFlow(): Promise<void> {
  console.log(chalk.cyan.bold("Welcome to Count-Lines!"));
  console.log(chalk.gray("Let's count your lines of code interactively.\n"));

  const language = (await select<Language>({
    message: "Select a language to count (or All):",
    choices: Object.keys(langToExt) as Language[],
    default: Object.keys(langToExt).indexOf("All"),
  })) as Language;

  console.log(chalk.magenta(`\nCounting ${language} files...`));
  performCount(langToExt[language]);
}

// Main entry
export async function main() {
  const flagLang = parseFlags();
  if (flagLang) {
    console.log(chalk.magenta(`\nCounting ${flagLang} files...`));
    performCount(langToExt[flagLang]);
  } else {
    await interactiveFlow();
  }
}
main().catch((err: unknown) => {
  console.error(chalk.red("Error:"), err);
  process.exit(1);
});
