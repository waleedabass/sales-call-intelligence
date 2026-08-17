// Recordings are stored as bytes directly on Call.recordingData rather than
// on disk — the deployed runtime (Vercel serverless) has no persistent
// filesystem, and this avoids needing a separate object-storage service
// just for one file type.
export function generateSafeFilename(originalFilename: string): string {
  return `${Date.now()}-${originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
}
