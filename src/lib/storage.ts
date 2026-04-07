import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export function getUploadsRoot(): string {
  return path.join(process.cwd(), ".tmp", "uploads");
}

export function sanitizeFilename(name: string): string {
  const base = name.replaceAll("\\", "_").replaceAll("/", "_");
  return base
    .replaceAll(/[^a-zA-Z0-9._ -]/g, "_")
    .replaceAll(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export function joinRelativePath(...segments: string[]): string {
  return segments
    .flatMap((s) => s.split(/[\\/]+/g))
    .filter(Boolean)
    .join("/");
}

export async function saveUploadedFile(params: {
  relativePath: string;
  bytes: Uint8Array;
}): Promise<string> {
  const fullPath = path.join(getUploadsRoot(), params.relativePath);
  await ensureDir(path.dirname(fullPath));
  await writeFile(fullPath, params.bytes);
  return fullPath;
}

export async function loadUploadedFile(relativePath: string): Promise<Uint8Array> {
  const fullPath = path.join(getUploadsRoot(), relativePath);
  const buf = await readFile(fullPath);
  return new Uint8Array(buf);
}
