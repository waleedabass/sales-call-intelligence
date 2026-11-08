// Reads just enough of a WAV header to get real duration — used to defend
// against Gemini's transcription timestamps (model-estimated from audio
// content, not decoded from a precise clock) occasionally drifting past
// the actual file length on long calls. See transcription/normalize.ts.
export function getWavDurationSec(buf: Buffer): number | null {
  if(buf.length<12)return null;
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") return null;

  let pos = 12;
  let sampleRate = 0, bitsPerSample = 0, channels = 0, dataLen = 0;
  while (pos + 8 <= buf.length) {
    const chunkId = buf.toString("ascii", pos, pos + 4);
    const chunkSize = buf.readUInt32LE(pos + 4);
    if(chunkSize>buf.length-pos-8)return null;
    if (chunkId === "fmt ") {
      if(chunkSize<16)return null;
      channels = buf.readUInt16LE(pos + 10);
      sampleRate = buf.readUInt32LE(pos + 12);
      bitsPerSample = buf.readUInt16LE(pos + 22);
    } else if (chunkId === "data") {
      dataLen = chunkSize;
    }
    pos += 8 + chunkSize + (chunkSize % 2);
  }

  if (!sampleRate || !bitsPerSample || !channels) return null;
  const bytesPerSample = bitsPerSample / 8;
  return dataLen / (sampleRate * channels * bytesPerSample);
}
