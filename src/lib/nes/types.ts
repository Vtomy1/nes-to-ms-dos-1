/**
 * NES ROM and iNES / NES 2.0 Header Types
 */

export interface INesHeader {
  raw: Uint8Array; // 16 bytes
  magic: string; // 'NES\x1A'
  isValid: boolean;
  isNes2: boolean;
  prgRomSizeKB: number;
  chrRomSizeKB: number;
  prgBanks16K: number;
  chrBanks8K: number;
  mapper: number;
  submapper: number;
  mirroring: 'Horizontal' | 'Vertical' | 'Four-Screen' | 'Single-Screen';
  hasBattery: boolean;
  hasTrainer: boolean;
  tvSystem: 'NTSC' | 'PAL' | 'Dual / Multi';
  prgRamSizeKB: number;
  chrRamSizeKB: number;
  vsUnisystem: boolean;
  playChoice10: boolean;
}

export interface NesRomData {
  fileName: string;
  fileSizeBytes: number;
  header: INesHeader;
  trainer: Uint8Array | null;
  prgRom: Uint8Array;
  chrRom: Uint8Array;
  crc32: string;
  md5: string;
}

export interface RgbColor {
  r: number; // 0 - 255
  g: number; // 0 - 255
  b: number; // 0 - 255
}

export interface VgaDacColor {
  r6: number; // 0 - 63 (VGA DAC port 0x3C9 format)
  g6: number; // 0 - 63
  b6: number; // 0 - 63
  rgb: RgbColor;
  hex: string;
}
