#!/usr/bin/env node

/**
 * Generates solid-color RGBA PNGs for the extension icon.
 * Color: #4F46E5 (indigo). Sizes: 16, 32, 48, 128.
 * No external dependencies — uses only Node built-ins (node:zlib, node:fs, node:path).
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'public', 'icon');

// Icon color: #4F46E5 (indigo) fully opaque
const R = 0x4f;
const G = 0x46;
const B = 0xe5;
const A = 0xff;

// ─── CRC32 ──────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ─── PNG helpers ─────────────────────────────────────────────────────────────

function uint32BE(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

function makeChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const dataBytes = data instanceof Buffer ? data : Buffer.from(data);
  const crcInput = Buffer.concat([typeBytes, dataBytes]);
  const checksum = crc32(crcInput);
  return Buffer.concat([uint32BE(dataBytes.length), typeBytes, dataBytes, uint32BE(checksum)]);
}

function makePNG(size) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk: width(4) height(4) bitDepth(1) colorType(1) compression(1) filter(1) interlace(1)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0); // width
  ihdrData.writeUInt32BE(size, 4); // height
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression: deflate
  ihdrData[11] = 0; // filter: adaptive
  ihdrData[12] = 0; // interlace: none
  const ihdr = makeChunk('IHDR', ihdrData);

  // Build scanlines: each row = filter byte (0 = None) + RGBA pixels
  const bytesPerRow = 1 + size * 4;
  const raw = Buffer.alloc(size * bytesPerRow);
  for (let row = 0; row < size; row++) {
    const offset = row * bytesPerRow;
    raw[offset] = 0; // filter byte: None
    for (let col = 0; col < size; col++) {
      const px = offset + 1 + col * 4;
      raw[px] = R;
      raw[px + 1] = G;
      raw[px + 2] = B;
      raw[px + 3] = A;
    }
  }

  const compressed = deflateSync(raw, { level: 9 });
  const idat = makeChunk('IDAT', compressed);

  // IEND chunk (empty data)
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// ─── Generate ────────────────────────────────────────────────────────────────

mkdirSync(OUTPUT_DIR, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const png = makePNG(size);
  const outPath = join(OUTPUT_DIR, `${size}.png`);
  writeFileSync(outPath, png);
  console.log(`Written: ${outPath} (${png.length} bytes)`);
}

console.log('Done.');
