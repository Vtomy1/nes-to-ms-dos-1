/**
 * MS-DOS VGA Mode 13h (320x200, 256 Colors, 8-bit Linear Framebuffer) Engine
 */
import { buildVgaMode13hPalette, VgaDacColor } from '../nes/palette';

export const VGA_WIDTH = 320;
export const VGA_HEIGHT = 200;
export const VGA_FRAMEBUFFER_BYTES = VGA_WIDTH * VGA_HEIGHT; // 64,000 bytes
export const VGA_BASE_SEGMENT = 0xA000;

export type ViewportMode = 'centered_crop' | 'stretched_full' | 'hud_split';
export type CrtColorMode = 'color_vga' | 'amber_crt' | 'green_crt';

export interface VgaPixelInfo {
  x: number;
  y: number;
  linearOffset: number;
  hexOffset: string;
  paletteIndex: number;
  dacR: number; // 0-63
  dacG: number; // 0-63
  dacB: number; // 0-63
  hexColor: string;
}

export class VgaMode13hBuffer {
  // Raw 64,000-byte 8-bit linear framebuffer (representing 0xA000:0000 memory)
  public readonly vram: Uint8Array;
  public readonly palette: VgaDacColor[];

  constructor() {
    this.vram = new Uint8Array(VGA_FRAMEBUFFER_BYTES);
    this.palette = buildVgaMode13hPalette();
    this.clear(0);
  }

  public clear(colorIndex = 0): void {
    this.vram.fill(colorIndex & 0xFF);
  }

  public setPixel(x: number, y: number, colorIndex: number): void {
    if (x >= 0 && x < VGA_WIDTH && y >= 0 && y < VGA_HEIGHT) {
      this.vram[y * VGA_WIDTH + x] = colorIndex & 0xFF;
    }
  }

  public getPixel(x: number, y: number): number {
    if (x >= 0 && x < VGA_WIDTH && y >= 0 && y < VGA_HEIGHT) {
      return this.vram[y * VGA_WIDTH + x];
    }
    return 0;
  }

  public getPixelInfo(x: number, y: number): VgaPixelInfo | null {
    if (x < 0 || x >= VGA_WIDTH || y < 0 || y >= VGA_HEIGHT) return null;
    const offset = y * VGA_WIDTH + x;
    const idx = this.vram[offset];
    const color = this.palette[idx] || this.palette[0];
    return {
      x,
      y,
      linearOffset: offset,
      hexOffset: `0x${offset.toString(16).toUpperCase().padStart(4, '0')}`,
      paletteIndex: idx,
      dacR: color.r6,
      dacG: color.g6,
      dacB: color.b6,
      hexColor: color.hex,
    };
  }

  /**
   * Blits a 256x240 NES screen buffer (indices 0-63) into the 320x200 Mode 13h buffer
   */
  public blitNesFrame(
    nesPixels: Uint8Array, // 256 * 240 indices into NES palette
    mode: ViewportMode = 'centered_crop',
    hudData?: { score?: number; fps?: number; frameCount?: number; mapper?: number }
  ): void {
    if (mode === 'centered_crop') {
      // Centered 256x200 (crop 20 lines top and bottom, 32px left/right borders)
      const xMargin = 32; // (320 - 256) / 2
      const nesYStart = 20; // skip 20 top overscan lines

      // Clear borders to dark DOS blue (color 0x41) or black (0x00)
      for (let y = 0; y < 200; y++) {
        const rowOffset = y * VGA_WIDTH;
        // Left border
        for (let x = 0; x < xMargin; x++) {
          this.vram[rowOffset + x] = 0x00;
        }
        // Game pixels
        const nesRowOffset = (y + nesYStart) * 256;
        for (let x = 0; x < 256; x++) {
          this.vram[rowOffset + xMargin + x] = nesPixels[nesRowOffset + x] & 0x3F;
        }
        // Right border
        for (let x = xMargin + 256; x < VGA_WIDTH; x++) {
          this.vram[rowOffset + x] = 0x00;
        }
      }
    } else if (mode === 'stretched_full') {
      // Scale 256x240 to 320x200
      for (let y = 0; y < VGA_HEIGHT; y++) {
        const nesY = Math.min(239, Math.floor((y * 240) / VGA_HEIGHT));
        const vramRow = y * VGA_WIDTH;
        const nesRow = nesY * 256;
        for (let x = 0; x < VGA_WIDTH; x++) {
          const nesX = Math.min(255, Math.floor((x * 256) / VGA_WIDTH));
          this.vram[vramRow + x] = nesPixels[nesRow + nesX] & 0x3F;
        }
      }
    } else if (mode === 'hud_split') {
      // Left 256x200: NES frame. Right 64x200: DOS HUD
      const nesYStart = 20;
      for (let y = 0; y < 200; y++) {
        const rowOffset = y * VGA_WIDTH;
        const nesRowOffset = (y + nesYStart) * 256;
        for (let x = 0; x < 256; x++) {
          this.vram[rowOffset + x] = nesPixels[nesRowOffset + x] & 0x3F;
        }
        // Right margin divider line at x = 256
        this.vram[rowOffset + 256] = 0x47; // DOS light gray line
        // HUD area (x = 257 to 319)
        for (let x = 257; x < VGA_WIDTH; x++) {
          this.vram[rowOffset + x] = 0x48; // DOS dark gray background
        }
      }

      // Draw mini visual indicators in right HUD
      this.drawHudStatus(hudData);
    }
  }

  private drawHudStatus(hudData?: { score?: number; fps?: number; frameCount?: number; mapper?: number }): void {
    // Fill subtle decorative patterns in HUD area
    const startX = 260;
    // Draw 16 DOS color swatches
    for (let c = 0; c < 16; c++) {
      const swX = startX + (c % 4) * 14;
      const swY = 160 + Math.floor(c / 4) * 8;
      for (let py = 0; py < 6; py++) {
        for (let px = 0; px < 12; px++) {
          this.setPixel(swX + px, swY + py, 0x40 + c);
        }
      }
    }
  }

  /**
   * Render the 64,000-byte VRAM into an HTML Canvas 2D ImageData buffer with CRT/palette styling
   */
  public renderToCanvas(
    ctx: CanvasRenderingContext2D,
    colorMode: CrtColorMode = 'color_vga',
    enableScanlines = false
  ): void {
    const imgData = ctx.createImageData(VGA_WIDTH, VGA_HEIGHT);
    const data = imgData.data;

    for (let y = 0; y < VGA_HEIGHT; y++) {
      const rowOffset = y * VGA_WIDTH;
      const isScanlineRow = enableScanlines && (y % 2 === 1);
      const dimFactor = isScanlineRow ? 0.75 : 1.0;

      for (let x = 0; x < VGA_WIDTH; x++) {
        const offset = rowOffset + x;
        const colorIdx = this.vram[offset];
        const color = this.palette[colorIdx] || this.palette[0];
        const outOffset = offset * 4;

        if (colorMode === 'color_vga') {
          data[outOffset + 0] = Math.round(color.rgb.r * dimFactor);
          data[outOffset + 1] = Math.round(color.rgb.g * dimFactor);
          data[outOffset + 2] = Math.round(color.rgb.b * dimFactor);
        } else if (colorMode === 'amber_crt') {
          // Monochrome amber CRT: weighted luminance mapped to amber #FFB000
          const lum = (0.299 * color.rgb.r + 0.587 * color.rgb.g + 0.114 * color.rgb.b) / 255;
          data[outOffset + 0] = Math.round(255 * lum * dimFactor);
          data[outOffset + 1] = Math.round(176 * lum * dimFactor);
          data[outOffset + 2] = 0;
        } else if (colorMode === 'green_crt') {
          // Monochrome green phosphor CRT: mapped to P1 phosphor #33FF33
          const lum = (0.299 * color.rgb.r + 0.587 * color.rgb.g + 0.114 * color.rgb.b) / 255;
          data[outOffset + 0] = Math.round(51 * lum * dimFactor);
          data[outOffset + 1] = Math.round(255 * lum * dimFactor);
          data[outOffset + 2] = Math.round(51 * lum * dimFactor);
        }
        data[outOffset + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }
}
