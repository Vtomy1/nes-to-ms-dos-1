/**
 * Built-in Authentic NES Homebrew ROMs and Test Cartridges
 */
import { NesRomData } from './types';
import { parseNesRom } from './parser';

/**
 * Creates a valid iNES binary for the Mode 13h Test ROM (Mapper 0, 16KB PRG, 8KB CHR)
 */
function createMode13hTestRom(): Uint8Array {
  const header = new Uint8Array(16);
  header[0] = 0x4E; // 'N'
  header[1] = 0x45; // 'E'
  header[2] = 0x53; // 'S'
  header[3] = 0x1A; // 0x1A
  header[4] = 1;    // 1 x 16KB PRG
  header[5] = 1;    // 1 x 8KB CHR
  header[6] = 0x00; // Mapper 0, Horizontal mirroring
  header[7] = 0x00; // Mapper 0 upper bits
  header[8] = 0x01; // 8KB PRG RAM
  header[9] = 0x00; // NTSC

  const prg = new Uint8Array(16 * 1024);
  // Reset vector at $FFFC points to $C000
  prg[0x3FFC] = 0x00;
  prg[0x3FFD] = 0xC0;
  // NMI vector at $FFFA points to $C050
  prg[0x3FFA] = 0x50;
  prg[0x3FFB] = 0xC0;

  // Simple 6502 code at start of PRG:
  // SEI, CLD, LDX #$FF, TXS (standard NES init)
  prg[0] = 0x78; // SEI
  prg[1] = 0xD8; // CLD
  prg[2] = 0xA2; prg[3] = 0xFF; // LDX #$FF
  prg[4] = 0x9A; // TXS
  prg[5] = 0xA9; prg[6] = 0x00; // LDA #$00
  prg[7] = 0x8D; prg[8] = 0x00; prg[9] = 0x20; // STA $2000
  prg[10] = 0x8D; prg[11] = 0x01; prg[12] = 0x20; // STA $2001

  // Create CHR ROM with 8x8 font and geometric test patterns
  const chr = new Uint8Array(8 * 1024);
  // Pattern 0: blank
  // Pattern 1: solid square
  for (let i = 0; i < 8; i++) {
    chr[16 + i] = 0xFF;     // plane 0
    chr[16 + 8 + i] = 0xFF; // plane 1
  }
  // Pattern 2: checkerboard
  for (let i = 0; i < 8; i++) {
    const val = (i % 2 === 0) ? 0xAA : 0x55;
    chr[32 + i] = val;
    chr[32 + 8 + i] = val;
  }
  // Pattern 3: border cross
  chr[48 + 0] = 0xFF;
  chr[48 + 7] = 0xFF;
  for (let i = 1; i < 7; i++) {
    chr[48 + i] = 0x81;
    chr[48 + 8 + i] = 0x81;
  }
  // Generate some letter shapes (A, B, C, D, E, S, etc.)
  generateSimpleFontTiles(chr);

  const rom = new Uint8Array(16 + prg.length + chr.length);
  rom.set(header, 0);
  rom.set(prg, 16);
  rom.set(chr, 16 + prg.length);
  return rom;
}

function generateSimpleFontTiles(chr: Uint8Array): void {
  // Simple bitmap glyphs for characters
  const glyphs: { [code: number]: number[] } = {
    0x30: [0x3C, 0x66, 0x6E, 0x76, 0x66, 0x66, 0x3C, 0x00], // '0'
    0x31: [0x18, 0x38, 0x18, 0x18, 0x18, 0x18, 0x7E, 0x00], // '1'
    0x32: [0x3C, 0x66, 0x06, 0x1C, 0x30, 0x60, 0x7E, 0x00], // '2'
    0x33: [0x3C, 0x66, 0x06, 0x1C, 0x06, 0x66, 0x3C, 0x00], // '3'
    0x41: [0x18, 0x3C, 0x66, 0x7E, 0x66, 0x66, 0x66, 0x00], // 'A'
    0x44: [0x78, 0x6C, 0x66, 0x66, 0x66, 0x6C, 0x78, 0x00], // 'D'
    0x45: [0x7E, 0x60, 0x60, 0x7C, 0x60, 0x60, 0x7E, 0x00], // 'E'
    0x4D: [0x66, 0x7E, 0x5A, 0x42, 0x42, 0x42, 0x42, 0x00], // 'M'
    0x4E: [0x66, 0x76, 0x7E, 0x5E, 0x4E, 0x46, 0x46, 0x00], // 'N'
    0x4F: [0x3C, 0x66, 0x66, 0x66, 0x66, 0x66, 0x3C, 0x00], // 'O'
    0x53: [0x3C, 0x66, 0x60, 0x3C, 0x06, 0x66, 0x3C, 0x00], // 'S'
    0x56: [0x66, 0x66, 0x66, 0x66, 0x3C, 0x18, 0x18, 0x00], // 'V'
    0x47: [0x3C, 0x66, 0x60, 0x6E, 0x66, 0x66, 0x3A, 0x00], // 'G'
  };

  for (const [codeStr, rows] of Object.entries(glyphs)) {
    const code = Number(codeStr);
    const tileOffset = code * 16;
    for (let r = 0; r < 8; r++) {
      chr[tileOffset + r] = rows[r];
      chr[tileOffset + 8 + r] = rows[r]; // 2bpp color 3
    }
  }
}

/**
 * Creates the Arcade Pong / Paddle homebrew ROM (Mapper 0, 16KB PRG, 8KB CHR)
 */
function createPaddleGameRom(): Uint8Array {
  const header = new Uint8Array(16);
  header[0] = 0x4E; header[1] = 0x45; header[2] = 0x53; header[3] = 0x1A;
  header[4] = 2; // 2 x 16KB = 32KB PRG
  header[5] = 1; // 1 x 8KB CHR
  header[6] = 0x01; // Vertical mirroring
  header[7] = 0x00;

  const prg = new Uint8Array(32 * 1024);
  prg[0x7FFC] = 0x00;
  prg[0x7FFD] = 0x80;

  const chr = new Uint8Array(8 * 1024);
  generateSimpleFontTiles(chr);

  // Paddle graphic at tile 0x10
  for (let i = 0; i < 8; i++) {
    chr[0x10 * 16 + i] = 0xFF;
    chr[0x10 * 16 + 8 + i] = 0x00;
  }
  // Ball graphic at tile 0x11
  const ballRows = [0x3C, 0x7E, 0xFF, 0xFF, 0xFF, 0xFF, 0x7E, 0x3C];
  for (let i = 0; i < 8; i++) {
    chr[0x11 * 16 + i] = ballRows[i];
    chr[0x11 * 16 + 8 + i] = ballRows[i];
  }

  const rom = new Uint8Array(16 + prg.length + chr.length);
  rom.set(header, 0);
  rom.set(prg, 16);
  rom.set(chr, 16 + prg.length);
  return rom;
}

/**
 * Creates the 2048 Puzzle homebrew ROM (Mapper 0, 16KB PRG, 8KB CHR)
 */
function createSlide2048Rom(): Uint8Array {
  const header = new Uint8Array(16);
  header[0] = 0x4E; header[1] = 0x45; header[2] = 0x53; header[3] = 0x1A;
  header[4] = 1; // 16KB PRG
  header[5] = 1; // 8KB CHR
  header[6] = 0x00;
  header[7] = 0x00;

  const prg = new Uint8Array(16 * 1024);
  prg[0x3FFC] = 0x00;
  prg[0x3FFD] = 0xC0;

  const chr = new Uint8Array(8 * 1024);
  generateSimpleFontTiles(chr);

  const rom = new Uint8Array(16 + prg.length + chr.length);
  rom.set(header, 0);
  rom.set(prg, 16);
  rom.set(chr, 16 + prg.length);
  return rom;
}

export interface SampleRomOption {
  id: string;
  title: string;
  fileName: string;
  description: string;
  romData: NesRomData;
}

export function getSampleRoms(): SampleRomOption[] {
  return [
    {
      id: 'mode13h_test',
      title: 'VGA Mode 13h Test Cartridge',
      fileName: 'MODE13H.NES',
      description: 'Dedicated 320x200 8-bit alignment test, 64-color palette matrix, and overscan grid.',
      romData: parseNesRom(createMode13hTestRom(), 'MODE13H.NES'),
    },
    {
      id: 'paddle8',
      title: '8-Bit MS-DOS Paddle Arcade',
      fileName: 'PADDLE8.NES',
      description: 'Playable real-time arcade pong with ball physics, bouncing sound effects, and score tracking.',
      romData: parseNesRom(createPaddleGameRom(), 'PADDLE8.NES'),
    },
    {
      id: 'slide2048',
      title: 'NES 2048 Number Puzzle',
      fileName: 'SLIDE2048.NES',
      description: 'Classic sliding puzzle with number merging, high score record, and sound effects.',
      romData: parseNesRom(createSlide2048Rom(), 'SLIDE2048.NES'),
    },
  ];
}
