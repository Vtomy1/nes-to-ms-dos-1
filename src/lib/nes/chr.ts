/**
 * NES CHR 2bpp Tile Decoder and Pattern Table Visualizer
 */
import { NES_MASTER_PALETTE_HEX, hexToRgb } from './palette';

export interface DecodedTile {
  tileIndex: number;
  pixels: Uint8Array; // 64 entries (8x8), values 0, 1, 2, 3
}

/**
 * Decode a single 16-byte NES tile into an 8x8 pixel array (values 0-3)
 */
export function decodeChrTile(tileBytes: Uint8Array, tileIndex: number): DecodedTile {
  const pixels = new Uint8Array(64);
  for (let y = 0; y < 8; y++) {
    const plane0 = tileBytes[y] || 0;
    const plane1 = tileBytes[y + 8] || 0;
    for (let x = 0; x < 8; x++) {
      const bit0 = (plane0 >> (7 - x)) & 1;
      const bit1 = (plane1 >> (7 - x)) & 1;
      const val = (bit1 << 1) | bit0;
      pixels[y * 8 + x] = val;
    }
  }
  return { tileIndex, pixels };
}

/**
 * Decodes an entire 4KB pattern table (256 tiles, 4096 bytes)
 */
export function decodePatternTable(patternBytes: Uint8Array): DecodedTile[] {
  const tiles: DecodedTile[] = [];
  const count = Math.min(256, Math.floor(patternBytes.length / 16));
  for (let i = 0; i < count; i++) {
    const tileSlice = patternBytes.subarray(i * 16, i * 16 + 16);
    tiles.push(decodeChrTile(tileSlice, i));
  }
  return tiles;
}

/**
 * Render a 256-tile pattern table into a 128x128 pixel RGBA canvas buffer (16x16 tiles of 8x8 px)
 */
export function renderPatternTableToRgba(
  tiles: DecodedTile[],
  paletteNesIndices: [number, number, number, number] = [0x0F, 0x16, 0x27, 0x30]
): Uint8ClampedArray {
  const width = 128;
  const height = 128;
  const rgba = new Uint8ClampedArray(width * height * 4);

  // Pre-calculate RGB for the 4 colors in the sub-palette
  const rgbList = paletteNesIndices.map(idx => {
    const hex = NES_MASTER_PALETTE_HEX[idx & 0x3F] || '#000000';
    return hexToRgb(hex);
  });

  for (let t = 0; t < tiles.length; t++) {
    const tile = tiles[t];
    const tileX = (t % 16) * 8;
    const tileY = Math.floor(t / 16) * 8;

    for (let py = 0; py < 8; py++) {
      for (let px = 0; px < 8; px++) {
        const colorVal = tile.pixels[py * 8 + px];
        const rgb = rgbList[colorVal] || rgbList[0];
        const screenX = tileX + px;
        const screenY = tileY + py;
        const offset = (screenY * width + screenX) * 4;

        rgba[offset + 0] = rgb.r;
        rgba[offset + 1] = rgb.g;
        rgba[offset + 2] = rgb.b;
        rgba[offset + 3] = 255;
      }
    }
  }

  return rgba;
}
