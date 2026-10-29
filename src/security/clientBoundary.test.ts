import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(path));
    } else if (/\.(tsx?|css|svg)$/.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

function posix(path: string): string {
  return path.replaceAll("\\", "/");
}

describe("browser source boundary", () => {
  it("keeps secrets out of client code and storage APIs inside the repository adapter", () => {
    const files = walk("src");
    const llmKey = ["LLM", "API", "KEY"].join("_");
    const vitePrefix = ["VI", "TE_"].join("");
    const storage = ["local", "Storage"].join("");
    const envAccess = ["import", "meta", "env"].join(".");
    const allowedStorage = posix(join("src", "repositories", "storage.ts"));

    expect(files.length).toBeGreaterThan(10);

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toContain(llmKey);
      expect(source, file).not.toContain(vitePrefix);
      expect(source, file).not.toContain(envAccess);
      const isTestHarness = /\.test\.tsx?$/.test(file) || posix(file).includes("src/test/");
      if (!isTestHarness && posix(file) !== allowedStorage) {
        expect(source, file).not.toContain(storage);
      }
    }

    const adapter = readFileSync(join("src", "repositories", "storage.ts"), "utf8");
    expect(adapter).toContain(storage);
  });
});
