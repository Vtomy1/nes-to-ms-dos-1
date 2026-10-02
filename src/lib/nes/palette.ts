/**
 * NES 64-Color Master Palette and VGA Mode 13h DAC Converter
 */
import { RgbColor, VgaDacColor } from './types';
export type { RgbColor, VgaDacColor };

// Canonical 64-color NTSC NES master palette (RGB 8-bit)
export const NES_MASTER_PALETTE_HEX: string[] = [
  '#666666', '#002A88', '#1412A7', '#3B00A4', '#5C007E', '#6E0040', '#6C0600', '#561D00',
  '#333500', '#0B4800', '#005200', '#004F08', '#00404D', '#000000', '#000000', '#000000',
  '#ADADAD', '#155FD9', '#4240FF', '#7527FE', '#A01ACC', '#B71E7B', '#B53120', '#994E00',
  '#6B6D00', '#388700', '#0C9300', '#008F32', '#007C8D', '#000000', '#000000', '#000000',
  '#FFFFFF', '#64B0FF', '#9290FF', '#C676FF', '#F36AFF', '#FE6ECC', '#FE8170', '#EA9E22',
  '#BCBE00', '#88D800', '#5CE430', '#45E082', '#48CDDE', '#4F4F4F', '#000000', '#000000',
  '#FFFFFF', '#C0DFFF', '#D3D2FF', '#E8C8FF', '#FBC2FF', '#FEC4EA', '#FECCC5', '#F7D8A5',
  '#E4E594', '#CFEF96', '#BDF4AB', '#B3F3CC', '#B5EBF2', '#B8B8B8', '#000000', '#000000'
];

// Standard 16-color IBM PC / MS-DOS CGA/EGA/VGA Palette
export const DOS_DEFAULT_16_PALETTE_HEX: string[] = [
  '#000000', // 0: Black
  '#0000AA', // 1: Blue
  '#00AA00', // 2: Green
  '#00AAAA', // 3: Cyan
  '#AA0000', // 4: Red
  '#AA00AA', // 5: Magenta
  '#AA5500', // 6: Brown
  '#AAAAAA', // 7: Light Gray
  '#555555', // 8: Dark Gray
  '#5555FF', // 9: Light Blue
  '#55FF55', // 10: Light Green
  '#55FFFF', // 11: Light Cyan
  '#FF5555', // 12: Light Red
  '#FF55FF', // 13: Light Magenta
  '#FFFF55', // 14: Yellow
  '#FFFFFF', // 15: Bright White
];

export function hexToRgb(hex: string): RgbColor {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return { r, g, b };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const to2 = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${to2(r)}${to2(g)}${to2(b)}`.toUpperCase();
}

/**
 * Convert 8-bit RGB (0-255) to 6-bit VGA DAC hardware register values (0-63)
 */
export function rgbToVgaDac(r: number, g: number, b: number): VgaDacColor {
  const r6 = Math.min(63, Math.max(0, Math.round((r / 255) * 63)));
  const g6 = Math.min(63, Math.max(0, Math.round((g / 255) * 63)));
  const b6 = Math.min(63, Math.max(0, Math.round((b / 255) * 63)));
  // convert back to approximate displayed 8-bit RGB
  const rgb: RgbColor = {
    r: Math.round((r6 / 63) * 255),
    g: Math.round((g6 / 63) * 255),
    b: Math.round((b6 / 63) * 255),
  };
  return {
    r6,
    g6,
    b6,
    rgb,
    hex: rgbToHex(rgb.r, rgb.g, rgb.b),
  };
}

/**
 * Generate the 256-color VGA Mode 13h DAC Palette table (256 entries x 3 bytes: R6, G6, B6)
 * Layout:
 * - 0x00 to 0x3F (64 entries): NES Master Palette
 * - 0x40 to 0x4F (16 entries): Standard MS-DOS 16-color ANSI/CGA/EGA
 * - 0x50 to 0xBF (112 entries): Classic VGA 6x6x6 color cube / gradients
 * - 0xC0 to 0xFF (64 entries): Grayscale & custom ramps
 */
export function buildVgaMode13hPalette(): VgaDacColor[] {
  const palette: VgaDacColor[] = [];

  // 1. 0x00 - 0x3F (64 colors): NES Master Palette
  for (let i = 0; i < 64; i++) {
    const hex = NES_MASTER_PALETTE_HEX[i];
    const rgb = hexToRgb(hex);
    palette.push(rgbToVgaDac(rgb.r, rgb.g, rgb.b));
  }

  // 2. 0x40 - 0x4F (16 colors): Standard MS-DOS 16 colors
  for (let i = 0; i < 16; i++) {
    const hex = DOS_DEFAULT_16_PALETTE_HEX[i];
    const rgb = hexToRgb(hex);
    palette.push(rgbToVgaDac(rgb.r, rgb.g, rgb.b));
  }

  // 3. 0x50 - 0xCF (128 colors): Mode 13h Color Ramps (Red, Green, Blue, Cyan, Magenta, Yellow, Orange, Purple)
  const ramps = [
    { r: 1, g: 0.2, b: 0.2 },
    { r: 0.2, g: 1, b: 0.2 },
    { r: 0.2, g: 0.4, b: 1 },
    { r: 1, g: 1, b: 0.2 },
    { r: 0.2, g: 1, b: 1 },
    { r: 1, g: 0.2, b: 1 },
    { r: 1, g: 0.5, b: 0 },
    { r: 0.6, g: 0.2, b: 0.9 },
  ];
  for (let rIdx = 0; rIdx < ramps.length; rIdx++) {
    const ramp = ramps[rIdx];
    for (let step = 0; step < 16; step++) {
      const intensity = (step + 1) / 16;
      palette.push(rgbToVgaDac(
        Math.round(ramp.r * intensity * 255),
        Math.round(ramp.g * intensity * 255),
        Math.round(ramp.b * intensity * 255)
      ));
    }
  }

  // 4. 0xD0 - 0xFF (48 colors): Grayscale Ramp (0 - 63)
  for (let i = 0; i < 48; i++) {
    const val = Math.round((i / 47) * 255);
    palette.push(rgbToVgaDac(val, val, val));
  }

  return palette;
}

/**
 * Returns a 768-byte Uint8Array of VGA DAC palette data (R6, G6, B6 for all 256 colors)
 * Ready to be written to VGA hardware ports 0x3C8 and 0x3C9!
 */
export function exportVgaDacBytes(palette: VgaDacColor[]): Uint8Array {
  const bytes = new Uint8Array(768);
  for (let i = 0; i < 256; i++) {
    const color = palette[i] || { r6: 0, g6: 0, b6: 0 };
    bytes[i * 3 + 0] = color.r6 & 0x3F;
    bytes[i * 3 + 1] = color.g6 & 0x3F;
    bytes[i * 3 + 2] = color.b6 & 0x3F;
  }
  return bytes;
}
