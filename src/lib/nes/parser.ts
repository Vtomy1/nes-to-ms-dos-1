/**
 * iNES / NES 2.0 ROM Header Parser and Binary Analyzer
 */
import { INesHeader, NesRomData } from './types';

// Simple fast CRC32 implementation
function calculateCrc32(data: Uint8Array): string {
  let crc = 0 ^ (-1);
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ crc32Table[(crc ^ data[i]) & 0xFF];
  }
  return ((crc ^ (-1)) >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

const crc32Table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crc32Table[i] = c;
}

// Simple fast 32-bit FNV-1a / hash generator for quick identification
function calculateQuickHash(data: Uint8Array): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < data.length; i++) {
    h1 = Math.imul(h1 ^ data[i], 0x01000193);
    h2 = Math.imul(h2 ^ data[i], 0x5bd1e995);
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

export function parseNesHeader(rawHeader: Uint8Array): INesHeader {
  const headerSlice = rawHeader.slice(0, 16);
  const magic = String.fromCharCode(headerSlice[0], headerSlice[1], headerSlice[2]);
  const isMagicValid = magic === 'NES' && headerSlice[3] === 0x1A;

  if (!isMagicValid) {
    return {
      raw: headerSlice,
      magic: isMagicValid ? 'NES\x1A' : 'INVALID',
      isValid: false,
      isNes2: false,
      prgRomSizeKB: 0,
      chrRomSizeKB: 0,
      prgBanks16K: 0,
      chrBanks8K: 0,
      mapper: 0,
      submapper: 0,
      mirroring: 'Horizontal',
      hasBattery: false,
      hasTrainer: false,
      tvSystem: 'NTSC',
      prgRamSizeKB: 0,
      chrRamSizeKB: 0,
      vsUnisystem: false,
      playChoice10: false,
    };
  }

  const isNes2 = (headerSlice[7] & 0x0C) === 0x08;

  const prgBanks16K = headerSlice[4];
  const chrBanks8K = headerSlice[5];
  const flags6 = headerSlice[6];
  const flags7 = headerSlice[7];
  const flags8 = headerSlice[8];
  const flags9 = headerSlice[9];

  // Mirroring
  let mirroring: 'Horizontal' | 'Vertical' | 'Four-Screen' | 'Single-Screen' = 'Horizontal';
  if (flags6 & 0x08) {
    mirroring = 'Four-Screen';
  } else if (flags6 & 0x01) {
    mirroring = 'Vertical';
  } else {
    mirroring = 'Horizontal';
  }

  const hasBattery = Boolean(flags6 & 0x02);
  const hasTrainer = Boolean(flags6 & 0x04);

  // Mapper calculation
  let mapper = (flags6 >> 4) | (flags7 & 0xF0);
  let submapper = 0;

  if (isNes2) {
    mapper |= (flags8 & 0x0F) << 8;
    submapper = (flags8 >> 4);
  }

  // PRG and CHR size
  const prgRomSizeKB = prgBanks16K * 16;
  const chrRomSizeKB = chrBanks8K * 8;

  // TV System
  let tvSystem: 'NTSC' | 'PAL' | 'Dual / Multi' = 'NTSC';
  if ((flags9 & 0x01) === 1) {
    tvSystem = 'PAL';
  }

  // PRG RAM size
  let prgRamSizeKB = 8; // standard 8KB default
  if (!isNes2 && flags8 > 0) {
    prgRamSizeKB = flags8 * 8;
  }

  const vsUnisystem = Boolean(flags7 & 0x01);
  const playChoice10 = Boolean(flags7 & 0x02);

  return {
    raw: headerSlice,
    magic: 'NES\x1A',
    isValid: true,
    isNes2,
    prgRomSizeKB,
    chrRomSizeKB,
    prgBanks16K,
    chrBanks8K,
    mapper,
    submapper,
    mirroring,
    hasBattery,
    hasTrainer,
    tvSystem,
    prgRamSizeKB,
    chrRamSizeKB: chrRomSizeKB === 0 ? 8 : chrRomSizeKB,
    vsUnisystem,
    playChoice10,
  };
}

export function parseNesRom(bytes: Uint8Array, fileName = 'game.nes'): NesRomData {
  if (bytes.length < 16) {
    throw new Error('File too small to be a valid NES ROM (less than 16 bytes).');
  }

  const header = parseNesHeader(bytes.subarray(0, 16));
  if (!header.isValid) {
    throw new Error('Invalid NES ROM magic header! Expected "NES\\x1A".');
  }

  let offset = 16;
  let trainer: Uint8Array | null = null;
  if (header.hasTrainer) {
    trainer = new Uint8Array(bytes.slice(offset, offset + 512));
    offset += 512;
  }

  const prgBytesCount = header.prgBanks16K * 16 * 1024;
  const prgRom = new Uint8Array(bytes.slice(offset, Math.min(bytes.length, offset + prgBytesCount)));
  offset += prgBytesCount;

  const chrBytesCount = header.chrBanks8K * 8 * 1024;
  let chrRom: Uint8Array;
  if (chrBytesCount > 0) {
    chrRom = new Uint8Array(bytes.slice(offset, Math.min(bytes.length, offset + chrBytesCount)));
  } else {
    // CHR-RAM game (e.g. Mega Man, Castlevania, etc.), allocate blank 8KB CHR-RAM
    chrRom = new Uint8Array(8 * 1024);
  }

  const crc32 = calculateCrc32(bytes);
  const md5 = calculateQuickHash(bytes);

  return {
    fileName,
    fileSizeBytes: bytes.length,
    header,
    trainer,
    prgRom,
    chrRom,
    crc32,
    md5,
  };
}

export function getMapperDescription(mapperId: number): string {
  switch (mapperId) {
    case 0: return 'NROM (Direct PRG/CHR, No Bank Switching - Super Mario Bros, Donkey Kong, Excitebike)';
    case 1: return 'MMC1 / SxROM (Nintendo Serial Bank Switcher - Zelda, Metroid, Mega Man 2)';
    case 2: return 'UNROM / UxROM (16KB PRG Switching, CHR-RAM - Castlevania, Contra, Duck Tales)';
    case 3: return 'CNROM (8KB CHR Bank Switching - Solomon\'s Key, Arkanoid, Paperboy)';
    case 4: return 'MMC3 / TxROM (Scanline IRQ, PRG/CHR Bank Switching - Super Mario Bros 3, Mega Man 3-6)';
    case 7: return 'AxROM (32KB PRG Switching, Single-screen - Battletoads, Marble Madness)';
    case 9: return 'MMC2 (Punch-Out!!)';
    case 10: return 'MMC4 (Fire Emblem)';
    case 19: return 'Namco 163 (Splatterhouse, Pac-Mania)';
    case 69: return 'FME-7 / Sunsoft 5B (Gimmick!, Batman: Return of the Joker)';
    default: return `Mapper ${mapperId} (Specialized ASIC / Discrete Logic)`;
  }
}
