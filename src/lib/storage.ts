import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const RECORDINGS_DIR = path.join(process.cwd(), "recordings");

export async function saveRecording(buffer: Buffer, originalFilename: string): Promise<string> {
  await mkdir(RECORDINGS_DIR, { recursive: true });
  const safeName = `${Date.now()}-${originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  await writeFile(path.join(RECORDINGS_DIR, safeName), buffer);
  return safeName; // relative path, stored on Call.recordingPath
}

export function recordingsDir(): string {
  return RECORDINGS_DIR;
}
