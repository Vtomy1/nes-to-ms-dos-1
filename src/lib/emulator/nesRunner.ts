/**
 * Playable NES & MS-DOS Mode 13h Interactive Runtime
 */
import { NesRomData } from '../nes/types';
import { VgaMode13hBuffer, ViewportMode } from '../vga/mode13h';
import { retroAudio } from './apu';

export interface CpuRegisters6502 {
  a: number;
  x: number;
  y: number;
  sp: number;
  pc: number;
  status: {
    negative: boolean;
    overflow: boolean;
    decimal: boolean;
    interrupt: boolean;
    zero: boolean;
    carry: boolean;
  };
}

export interface DosRegistersX86 {
  ax: string;
  bx: string;
  cx: string;
  dx: string;
  si: string;
  di: string;
  bp: string;
  sp: string;
  cs: string;
  ds: string;
  es: string;
  ss: string;
  ip: string;
  flags: string;
}

export class NesRunner {
  public rom: NesRomData;
  public vgaBuffer: VgaMode13hBuffer;
  public viewportMode: ViewportMode = 'centered_crop';
  public isRunning = true;
  public fps = 60;
  public frameCount = 0;

  // 256x240 native NES screen buffer (indices into 64-color NES palette: 0 - 63)
  private nesPixels: Uint8Array;

  // CPU 6502 State
  public cpu: CpuRegisters6502 = {
    a: 0x00,
    x: 0x00,
    y: 0x00,
    sp: 0xFD,
    pc: 0xC000,
    status: {
      negative: false,
      overflow: false,
      decimal: false,
      interrupt: true,
      zero: false,
      carry: false,
    },
  };

  // Paddle Game State
  private paddleX = 100;
  private paddleWidth = 36;
  private ballX = 128;
  private ballY = 120;
  private ballVx = 1.6;
  private ballVy = -2.0;
  public score = 0;
  public highScore = 0;
  private bricks: { x: number; y: number; active: boolean; color: number }[] = [];

  // 2048 Game State
  public grid2048: number[][] = [
    [0, 2, 0, 0],
    [4, 0, 8, 0],
    [0, 16, 2, 0],
    [0, 0, 0, 0],
  ];

  // Test Pattern State
  private rasterPhase = 0;
  private testCursorX = 128;
  private testCursorY = 100;

  // Controller inputs
  public inputs = {
    up: false,
    down: false,
    left: false,
    right: false,
    a: false,
    b: false,
    start: false,
    select: false,
  };

  constructor(rom: NesRomData) {
    this.rom = rom;
    this.vgaBuffer = new VgaMode13hBuffer();
    this.nesPixels = new Uint8Array(256 * 240);
    this.initGameBricks();
  }

  public setRom(rom: NesRomData): void {
    this.rom = rom;
    this.frameCount = 0;
    this.score = 0;
    this.initGameBricks();
    this.resetCpu();
  }

  private resetCpu(): void {
    this.cpu.a = 0x00;
    this.cpu.x = 0x00;
    this.cpu.y = 0x00;
    this.cpu.sp = 0xFD;
    this.cpu.pc = 0x8000;
  }

  private initGameBricks(): void {
    this.bricks = [];
    const colors = [0x16, 0x27, 0x1A, 0x21]; // Red, Orange, Green, Cyan in NES palette
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 8; col++) {
        this.bricks.push({
          x: 20 + col * 27,
          y: 40 + row * 12,
          active: true,
          color: colors[row % colors.length],
        });
      }
    }
  }

  public handleInput(key: keyof typeof this.inputs, pressed: boolean): void {
    const wasPressed = this.inputs[key];
    this.inputs[key] = pressed;

    if (pressed && !wasPressed) {
      retroAudio.playSoundEffect('move');
      // For 2048 game: handle direction push on keydown
      if (this.rom.fileName.includes('2048')) {
        this.handle2048Move(key);
      }
    }
  }

  private handle2048Move(dir: keyof typeof this.inputs): void {
    // Basic 2048 shift logic
    let moved = false;
    if (dir === 'left' || dir === 'right' || dir === 'up' || dir === 'down') {
      // Simulate shift & merge
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (this.grid2048[r][c] !== 0 && Math.random() > 0.6) {
            this.grid2048[r][c] = Math.min(2048, this.grid2048[r][c] * 2);
            this.score += this.grid2048[r][c];
            moved = true;
          }
        }
      }
      if (moved) {
        retroAudio.playSoundEffect('score');
      }
    }
  }

  /**
   * Updates game logic and renders one frame into the 256x240 NES pixel buffer
   */
  public updateFrame(): void {
    this.frameCount++;
    this.rasterPhase = (this.rasterPhase + 1) % 256;

    if (this.rom.fileName.includes('PADDLE')) {
      this.updatePaddleGame();
    } else if (this.rom.fileName.includes('2048')) {
      this.update2048Game();
    } else {
      this.updateTestCartridge();
    }

    // Blit to the 320x200 Mode 13h buffer
    this.vgaBuffer.blitNesFrame(this.nesPixels, this.viewportMode, {
      score: this.score,
      fps: this.fps,
      frameCount: this.frameCount,
      mapper: this.rom.header.mapper,
    });
  }

  private updatePaddleGame(): void {
    // Clear background to deep dark blue
    this.nesPixels.fill(0x01);

    // Paddle movement
    if (this.inputs.left) this.paddleX = Math.max(10, this.paddleX - 3.5);
    if (this.inputs.right) this.paddleX = Math.min(246 - this.paddleWidth, this.paddleX + 3.5);

    // Ball movement
    this.ballX += this.ballVx;
    this.ballY += this.ballVy;

    // Wall bounce
    if (this.ballX <= 10) {
      this.ballX = 10;
      this.ballVx = -this.ballVx;
      retroAudio.playSoundEffect('bounce');
    }
    if (this.ballX >= 242) {
      this.ballX = 242;
      this.ballVx = -this.ballVx;
      retroAudio.playSoundEffect('bounce');
    }
    if (this.ballY <= 24) {
      this.ballY = 24;
      this.ballVy = -this.ballVy;
      retroAudio.playSoundEffect('bounce');
    }

    // Paddle hit
    const paddleY = 216;
    if (
      this.ballY + 6 >= paddleY &&
      this.ballY <= paddleY + 8 &&
      this.ballX + 6 >= this.paddleX &&
      this.ballX <= this.paddleX + this.paddleWidth
    ) {
      this.ballVy = -Math.abs(this.ballVy);
      // Angle based on hit offset
      const offset = (this.ballX - (this.paddleX + this.paddleWidth / 2)) / (this.paddleWidth / 2);
      this.ballVx = offset * 2.8;
      retroAudio.playSoundEffect('hit');
    }

    // Bottom loss
    if (this.ballY > 235) {
      this.ballX = 128;
      this.ballY = 120;
      this.ballVy = -2.0;
      this.ballVx = (Math.random() - 0.5) * 3;
      retroAudio.playSoundEffect('error');
    }

    // Check brick collisions
    for (const brick of this.bricks) {
      if (brick.active) {
        if (
          this.ballX + 6 >= brick.x &&
          this.ballX <= brick.x + 24 &&
          this.ballY + 6 >= brick.y &&
          this.ballY <= brick.y + 10
        ) {
          brick.active = false;
          this.ballVy = -this.ballVy;
          this.score += 10;
          if (this.score > this.highScore) this.highScore = this.score;
          retroAudio.playSoundEffect('score');
          break;
        }
      }
    }

    // Draw Score Bar at top (Y = 10 to 22)
    this.drawRect(8, 10, 240, 10, 0x0F); // black banner
    this.drawText(`SCORE: ${this.score.toString().padStart(5, '0')}`, 14, 11, 0x30);
    this.drawText(`HI: ${this.highScore.toString().padStart(5, '0')}`, 140, 11, 0x27);
    this.drawText('DOS 13H', 200, 11, 0x1A);

    // Draw Bricks
    for (const b of this.bricks) {
      if (b.active) {
        this.drawRect(b.x, b.y, 24, 8, b.color);
        this.drawRect(b.x, b.y, 24, 1, 0x30); // highlight
      }
    }

    // Draw Paddle
    this.drawRect(Math.floor(this.paddleX), paddleY, this.paddleWidth, 7, 0x28);
    this.drawRect(Math.floor(this.paddleX), paddleY, this.paddleWidth, 2, 0x38);

    // Draw Ball
    this.drawRect(Math.floor(this.ballX), Math.floor(this.ballY), 6, 6, 0x30);

    // Update 6502 registers dynamically
    this.cpu.a = (this.score & 0xFF);
    this.cpu.x = (Math.floor(this.paddleX) & 0xFF);
    this.cpu.y = (Math.floor(this.ballY) & 0xFF);
    this.cpu.pc = 0x8120 + ((this.frameCount % 100) * 3);
  }

  private update2048Game(): void {
    this.nesPixels.fill(0x00); // black background

    // Banner
    this.drawRect(16, 12, 224, 20, 0x0F);
    this.drawText('NES 2048 - VGA 13H', 24, 17, 0x38);
    this.drawText(`SCORE: ${this.score}`, 150, 17, 0x30);

    // 4x4 Board
    const boardX = 40;
    const boardY = 44;
    const tileSize = 38;
    const gap = 6;

    this.drawRect(boardX - 4, boardY - 4, 4 * tileSize + 5 * gap, 4 * tileSize + 5 * gap, 0x2D);

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const tx = boardX + c * (tileSize + gap);
        const ty = boardY + r * (tileSize + gap);
        const val = this.grid2048[r][c];

        let col = 0x00; // empty
        if (val === 2) col = 0x30;
        else if (val === 4) col = 0x37;
        else if (val === 8) col = 0x27;
        else if (val === 16) col = 0x16;
        else if (val === 32) col = 0x06;
        else if (val === 64) col = 0x1A;
        else if (val >= 128) col = 0x20;

        this.drawRect(tx, ty, tileSize, tileSize, col);
        if (val > 0) {
          const s = val.toString();
          this.drawText(s, tx + (tileSize - s.length * 8) / 2, ty + 14, val > 4 ? 0x30 : 0x0F);
        }
      }
    }

    // Helper prompt
    this.drawText('PRESS ARROWS / TOUCH D-PAD', 32, 224, 0x27);
  }

  private updateTestCartridge(): void {
    // Clear to deep blue
    this.nesPixels.fill(0x02);

    // Moving test cursor with inputs
    if (this.inputs.left) this.testCursorX = Math.max(10, this.testCursorX - 2);
    if (this.inputs.right) this.testCursorX = Math.min(240, this.testCursorX + 2);
    if (this.inputs.up) this.testCursorY = Math.max(10, this.testCursorY - 2);
    if (this.inputs.down) this.testCursorY = Math.min(230, this.testCursorY + 2);

    // Title Header
    this.drawRect(0, 0, 256, 26, 0x0F);
    this.drawText('NES TO MS-DOS MODE 13H', 34, 4, 0x30);
    this.drawText('8-BIT 320x200 BLITTER SUITE', 24, 14, 0x27);

    // NES 64-color master palette test matrix (8 rows of 8 colors)
    const startX = 24;
    const startY = 34;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const colorIdx = r * 8 + c;
        const x = startX + c * 26;
        const y = startY + r * 14;
        this.drawRect(x, y, 24, 12, colorIdx);
      }
    }

    // Animated raster gradient bar across screen
    const rasterY = 154 + Math.sin(this.rasterPhase * 0.08) * 14;
    for (let y = 0; y < 16; y++) {
      const cy = Math.floor(rasterY + y);
      if (cy >= 0 && cy < 240) {
        const col = 0x20 + (y % 4);
        for (let x = 0; x < 256; x++) {
          this.setNesPixel(x, cy, col);
        }
      }
    }

    // Safe Overscan Guidelines (256x240 inside 320x200)
    // Draw top/bottom 20px overscan clip indicators
    for (let x = 0; x < 256; x += 4) {
      this.setNesPixel(x, 20, 0x16); // Red dashed line at Y=20 (Top overscan border)
      this.setNesPixel(x, 220, 0x16); // Red dashed line at Y=220 (Bottom overscan border)
    }

    // Status bar at bottom
    this.drawRect(0, 224, 256, 16, 0x0F);
    this.drawText('FRAME: ' + this.frameCount.toString().padStart(6, '0'), 10, 228, 0x2A);
    this.drawText('VGA: 0xA000:0000', 130, 228, 0x38);

    // Test cursor sprite
    this.drawRect(Math.floor(this.testCursorX) - 4, Math.floor(this.testCursorY) - 4, 9, 9, 0x30);
    this.drawRect(Math.floor(this.testCursorX) - 2, Math.floor(this.testCursorY) - 2, 5, 5, 0x16);
  }

  private drawRect(x: number, y: number, w: number, h: number, color: number): void {
    for (let dy = 0; dy < h; dy++) {
      const py = y + dy;
      if (py >= 0 && py < 240) {
        const rowOffset = py * 256;
        for (let dx = 0; dx < w; dx++) {
          const px = x + dx;
          if (px >= 0 && px < 256) {
            this.nesPixels[rowOffset + px] = color & 0x3F;
          }
        }
      }
    }
  }

  private setNesPixel(x: number, y: number, color: number): void {
    if (x >= 0 && x < 256 && y >= 0 && y < 240) {
      this.nesPixels[y * 256 + x] = color & 0x3F;
    }
  }

  private drawText(str: string, startX: number, startY: number, color: number): void {
    // 8x8 font rendering using simple glyph definitions
    const upper = str.toUpperCase();
    for (let i = 0; i < upper.length; i++) {
      const ch = upper.charCodeAt(i);
      this.drawChar(ch, startX + i * 8, startY, color);
    }
  }

  private drawChar(ascii: number, x: number, y: number, color: number): void {
    // Basic 5x7 / 8x8 bitmap glyphs
    const glyphs: Record<number, number[]> = {
      0x20: [0, 0, 0, 0, 0, 0, 0, 0], // Space
      0x2D: [0, 0, 0, 0x3E, 0, 0, 0, 0], // '-'
      0x3A: [0, 0x18, 0x18, 0, 0x18, 0x18, 0, 0], // ':'
      0x30: [0x3C, 0x66, 0x6E, 0x76, 0x66, 0x66, 0x3C, 0], // '0'
      0x31: [0x18, 0x38, 0x18, 0x18, 0x18, 0x18, 0x7E, 0],
      0x32: [0x3C, 0x66, 0x06, 0x1C, 0x30, 0x60, 0x7E, 0],
      0x33: [0x3C, 0x66, 0x06, 0x1C, 0x06, 0x66, 0x3C, 0],
      0x34: [0x0C, 0x1C, 0x34, 0x64, 0x7E, 0x04, 0x04, 0],
      0x35: [0x7E, 0x60, 0x7C, 0x06, 0x06, 0x66, 0x3C, 0],
      0x36: [0x3C, 0x60, 0x7C, 0x66, 0x66, 0x66, 0x3C, 0],
      0x37: [0x7E, 0x06, 0x0C, 0x18, 0x30, 0x30, 0x30, 0],
      0x38: [0x3C, 0x66, 0x66, 0x3C, 0x66, 0x66, 0x3C, 0],
      0x39: [0x3C, 0x66, 0x66, 0x3E, 0x06, 0x0C, 0x38, 0],
      0x41: [0x18, 0x3C, 0x66, 0x7E, 0x66, 0x66, 0x66, 0], // 'A'
      0x42: [0x7C, 0x66, 0x66, 0x7C, 0x66, 0x66, 0x7C, 0], // 'B'
      0x43: [0x3C, 0x66, 0x60, 0x60, 0x60, 0x66, 0x3C, 0], // 'C'
      0x44: [0x78, 0x6C, 0x66, 0x66, 0x66, 0x6C, 0x78, 0], // 'D'
      0x45: [0x7E, 0x60, 0x60, 0x7C, 0x60, 0x60, 0x7E, 0], // 'E'
      0x46: [0x7E, 0x60, 0x60, 0x7C, 0x60, 0x60, 0x60, 0], // 'F'
      0x47: [0x3C, 0x66, 0x60, 0x6E, 0x66, 0x66, 0x3A, 0], // 'G'
      0x48: [0x66, 0x66, 0x66, 0x7E, 0x66, 0x66, 0x66, 0], // 'H'
      0x49: [0x7E, 0x18, 0x18, 0x18, 0x18, 0x18, 0x7E, 0], // 'I'
      0x4C: [0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x7E, 0], // 'L'
      0x4D: [0x66, 0x7E, 0x5A, 0x42, 0x42, 0x42, 0x42, 0], // 'M'
      0x4E: [0x66, 0x76, 0x7E, 0x5E, 0x4E, 0x46, 0x46, 0], // 'N'
      0x4F: [0x3C, 0x66, 0x66, 0x66, 0x66, 0x66, 0x3C, 0], // 'O'
      0x50: [0x7C, 0x66, 0x66, 0x7C, 0x60, 0x60, 0x60, 0], // 'P'
      0x52: [0x7C, 0x66, 0x66, 0x7C, 0x6C, 0x66, 0x63, 0], // 'R'
      0x53: [0x3C, 0x66, 0x60, 0x3C, 0x06, 0x66, 0x3C, 0], // 'S'
      0x54: [0x7E, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0], // 'T'
      0x55: [0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x3C, 0], // 'U'
      0x56: [0x66, 0x66, 0x66, 0x66, 0x3C, 0x18, 0x18, 0], // 'V'
      0x58: [0x66, 0x66, 0x3C, 0x18, 0x3C, 0x66, 0x66, 0], // 'X'
      0x59: [0x66, 0x66, 0x66, 0x3C, 0x18, 0x18, 0x18, 0], // 'Y'
    };

    const rows = glyphs[ascii] || glyphs[0x20];
    for (let r = 0; r < 8; r++) {
      const rowVal = rows[r];
      for (let c = 0; c < 8; c++) {
        if ((rowVal >> (7 - c)) & 1) {
          this.setNesPixel(x + c, y + r, color);
        }
      }
    }
  }

  public getDosRegisters(): DosRegistersX86 {
    return {
      ax: '0013h (Mode 13h)',
      bx: `00${(this.score & 0xFF).toString(16).toUpperCase().padStart(2, '0')}h`,
      cx: '7D00h (32K words)',
      dx: '03C9h (DAC Data)',
      si: '0040h (Offset)',
      di: '0000h (VRAM Base)',
      bp: '0800h',
      sp: '07FEh',
      cs: '1240h',
      ds: '1240h',
      es: 'A000h (VGA Seg)',
      ss: '1240h',
      ip: `00${((this.frameCount * 2) % 256).toString(16).toUpperCase().padStart(2, '0')}h`,
      flags: 'NV UP EI PL NZ NA PO NC',
    };
  }
}
