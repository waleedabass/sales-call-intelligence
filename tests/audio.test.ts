import { test } from "node:test";
import assert from "node:assert/strict";
import { getWavDurationSec } from "../src/lib/audio.ts";

test("malformed WAV chunks return null instead of throwing or looping", () => {
  const truncated = Buffer.alloc(20);
  truncated.write("RIFF", 0); truncated.write("WAVE", 8); truncated.write("fmt ", 12);
  truncated.writeUInt32LE(16, 16);
  assert.equal(getWavDurationSec(truncated), null);
  const negativeChunk = Buffer.from(truncated);
  negativeChunk.writeUInt32LE(0xffffffff, 16);
  assert.equal(getWavDurationSec(negativeChunk), null);
});

test("valid 16-bit PCM WAV duration is calculated", () => {
  const wav = Buffer.alloc(364);
  wav.write("RIFF", 0); wav.writeUInt32LE(356, 4); wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(16000, 24); wav.writeUInt32LE(32000, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write("data", 36); wav.writeUInt32LE(320, 40);
  assert.equal(getWavDurationSec(wav), 0.01);
});
