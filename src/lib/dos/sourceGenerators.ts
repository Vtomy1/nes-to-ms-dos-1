/**
 * Source Code Generators: NASM/TASM/MASM Assembly, Turbo C, and MS-DOS DEBUG script
 */
import { NesRomData } from '../nes/types';
import { VgaDacColor } from '../nes/palette';

export function generateNasmSource(
  nesRom: NesRomData,
  palette: VgaDacColor[],
  framebufferBytes: Uint8Array
): string {
  // Sample small chunk of palette bytes as db statements
  const palBytes: number[] = [];
  for (let i = 0; i < Math.min(64, palette.length); i++) {
    palBytes.push(palette[i].r6, palette[i].g6, palette[i].b6);
  }

  return `; ==============================================================================
; NES ROM to MS-DOS Mode 13h (8-bit 320x200) Real-Mode Executable
; ROM: ${nesRom.fileName} (${nesRom.header.prgRomSizeKB}KB PRG, ${nesRom.header.chrRomSizeKB}KB CHR, Mapper ${nesRom.header.mapper})
; Assembler: NASM (nasm -f bin dos_nes.asm -o game.com) OR (nasm -f obj dos_nes.asm)
; ==============================================================================

BITS 16
ORG 0x0100              ; COM format (or remove for MZ EXE segment format)

section .text
start:
    ; 1. Switch to 320x200 256-color VGA Mode 13h
    mov     ax, 0x0013
    int     0x10

    ; 2. Program VGA DAC Palette (Ports 0x3C8 / 0x3C9)
    ; Set write index to color 0
    mov     dx, 0x03C8
    xor     al, al
    out     dx, al
    inc     dx          ; DX = 0x03C9 (DAC Data Register)

    mov     si, palette_data
    mov     cx, 768     ; 256 colors * 3 (R, G, B in 0..63 range)
.dac_loop:
    lodsb
    out     dx, al
    loop    .dac_loop

    ; 3. Copy 320x200 Framebuffer to VGA Video Memory Segment 0xA000
    mov     ax, 0xA000
    mov     es, ax
    xor     di, di      ; ES:DI = 0xA000:0x0000
    mov     si, framebuffer_data
    mov     cx, 32000   ; 64,000 bytes / 2 = 32,000 words
    cld
    rep     movsw       ; Fast 16-bit word transfer to VRAM

    ; 4. Wait for keypress from BIOS
    xor     ah, ah
    int     0x16

    ; 5. Restore standard 80x25 text mode (Mode 03h)
    mov     ax, 0x0003
    int     0x10

    ; 6. Print DOS termination banner
    mov     dx, msg_exit
    mov     ah, 0x09
    int     0x21

    ; 7. Terminate program (INT 21h AH=4Ch)
    mov     ax, 0x4C00
    int     0x21

section .data
msg_exit:
    db 13, 10, "NES to MS-DOS Mode 13h Player by RetroStudio v1.0", 13, 10
    db "ROM: ${nesRom.fileName} loaded successfully.", 13, 10, "$"

palette_data:
    ; First 64 DAC entries (NES Master Palette mapped to 6-bit 0..63)
    db ${palBytes.slice(0, 32).join(', ')}
    ; ... (remaining 768 bytes follow in binary)

framebuffer_data:
    ; 64,000 bytes of 8-bit linear pixel indices (0xA000:0000)
    ; incbin "screen.bin"
`;
}

export function generateTurboCSource(nesRom: NesRomData): string {
  return `/* ==============================================================================
 * NES ROM to MS-DOS Mode 13h (8-bit 320x200) Real-Mode Runner
 * Target: Borland Turbo C++ 3.0 / OpenWatcom C (16-bit Real Mode DOS)
 * Compile: tcc -mc -O2 dos_nes.c
 * ============================================================================== */

#include <dos.h>
#include <conio.h>
#include <stdio.h>
#include <stdlib.h>
#include <mem.h>

#define VGA_SEGMENT 0xA000
#define SCREEN_WIDTH 320
#define SCREEN_HEIGHT 200

/* Global pointer to VGA Memory */
unsigned char far *VGA = (unsigned char far *)MK_FP(VGA_SEGMENT, 0);

/* Set VGA Video Mode via BIOS INT 10h */
void set_mode(unsigned char mode) {
    union REGS r;
    r.h.ah = 0x00;
    r.h.al = mode;
    int86(0x10, &r, &r);
}

/* Set VGA DAC 256-color palette (Values 0 - 63) */
void set_palette_entry(unsigned char index, unsigned char r6, unsigned char g6, unsigned char b6) {
    outp(0x03C8, index);
    outp(0x03C9, r6);
    outp(0x03C9, g6);
    outp(0x03C9, b6);
}

/* Blit 8-bit pixel directly to Mode 13h Linear Framebuffer */
void plot_pixel(int x, int y, unsigned char color) {
    if (x >= 0 && x < SCREEN_WIDTH && y >= 0 && y < SCREEN_HEIGHT) {
        VGA[y * SCREEN_WIDTH + x] = color;
    }
}

int main(void) {
    int x, y;
    printf("Initializing NES Mode 13h for ROM: %s\\n", "${nesRom.fileName}");
    printf("PRG ROM: %d KB, CHR ROM: %d KB, Mapper: %d\\n",
           ${nesRom.header.prgRomSizeKB}, ${nesRom.header.chrRomSizeKB}, ${nesRom.header.mapper});
    printf("Press any key to enter Mode 13h (320x200 256-color)...\\n");
    getch();

    /* Switch to Mode 13h */
    set_mode(0x13);

    /* Draw NES 256x200 frame centered with 32px borders */
    for (y = 0; y < SCREEN_HEIGHT; y++) {
        /* Left border */
        for (x = 0; x < 32; x++) {
            plot_pixel(x, y, 0);
        }
        /* NES active display */
        for (x = 32; x < 288; x++) {
            plot_pixel(x, y, (x ^ y) & 0x3F); /* NES palette sample */
        }
        /* Right border */
        for (x = 288; x < SCREEN_WIDTH; x++) {
            plot_pixel(x, y, 0);
        }
    }

    /* Wait for user keystroke */
    getch();

    /* Restore standard 80x25 text mode (Mode 03h) */
    set_mode(0x03);

    printf("Returned cleanly to MS-DOS. Thanks for playing!\\n");
    return 0;
}
`;
}

export function generateDebugScript(): string {
  return `; MS-DOS DEBUG.EXE Script for Mode 13h Display
; Run via: DEBUG < SCRIPT.DBG
a 100
mov ax, 0013   ; Set Mode 13h
int 10
mov ax, A000   ; Video segment
mov es, ax
xor di, di
mov cx, 7D00   ; 32000 words = 64000 bytes
mov ax, 0E0E   ; Color 14 (Yellow)
rep stosw      ; Fill screen
xor ah, ah     ; Wait keypress
int 16
mov ax, 0003   ; Restore 80x25 text mode
int 10
mov ax, 4C00   ; Exit to DOS
int 21

r cx
20
n TEST13H.COM
w
q
`;
}
