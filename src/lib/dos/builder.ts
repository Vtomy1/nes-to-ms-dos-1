/**
 * Real-Mode 16-bit MS-DOS MZ Executable (.EXE) and Flat Binary (.COM) Builder
 */
import { buildMzHeader } from './mzHeader';
import { exportVgaDacBytes } from '../nes/palette';
import { VgaMode13hBuffer, VGA_FRAMEBUFFER_BYTES } from '../vga/mode13h';
import { NesRomData } from '../nes/types';

export interface DosBuildResult {
  exeBytes: Uint8Array;
  comBytes: Uint8Array;
  mzHeaderBytes: Uint8Array;
  fileSizeBytes: number;
  pages512: number;
  remainderBytes: number;
  entryPointHex: string;
  paletteOffsetHex: string;
  framebufferOffsetHex: string;
  nesRomOffsetHex: string;
  x86MachineCodeLength: number;
  disassemblySnippet: string;
}

/**
 * Compiles a real-mode x86 machine code routine for setting Mode 13h, DAC, and blitting 64KB VRAM
 */
function generateX86RealModePayload(
  paletteSize: number,
  framebufferSize: number,
  hasEmbeddedRom: boolean
): { machineCode: Uint8Array; paletteOffset: number; fbOffset: number; romOffset: number } {
  // Let's craft byte-accurate 8086 machine code:
  const code: number[] = [];

  // 1. Setup Segment Registers
  // push cs (0x0E)
  // pop ds  (0x1F)
  code.push(0x0E, 0x1F);

  // 2. Set Video Mode 13h (320x200, 256 colors) via INT 10h
  // mov ax, 0013h (B8 13 00)
  // int 10h       (CD 10)
  code.push(0xB8, 0x13, 0x00);
  code.push(0xCD, 0x10);

  // 3. Print greeting/status banner if needed, or program DAC directly
  // mov dx, 03C8h (BA C8 03) - VGA DAC Address Port
  // xor al, al    (30 C0)
  // out dx, al    (EE)
  // inc dx        (42)       - VGA DAC Data Port 03C9h
  code.push(0xBA, 0xC8, 0x03);
  code.push(0x30, 0xC0);
  code.push(0xEE);
  code.push(0x42);

  // mov cx, 768   (B9 00 03) - 256 colors * 3 bytes
  code.push(0xB9, 0x00, 0x03);

  // We need the offset of the palette data. We'll patch this after finalizing code size!
  // mov si, imm16 (BE ?? ??)
  const palettePatchIndex = code.length + 1;
  code.push(0xBE, 0x00, 0x00);

  // Palette copy loop:
  // pal_loop:
  // lodsb         (AC) - AL = [DS:SI], SI++
  // out dx, al    (EE) - Send R/G/B component
  // loop pal_loop (E2 FC)
  code.push(0xAC, 0xEE, 0xE2, 0xFC);

  // 4. Copy 64,000 bytes from framebuffer data to Video RAM at 0xA000:0000
  // mov ax, 0A000h (B8 00 A0)
  // mov es, ax     (8E C0)
  // xor di, di     (31 FF)
  code.push(0xB8, 0x00, 0xA0);
  code.push(0x8E, 0xC0);
  code.push(0x31, 0xFF);

  // mov si, imm16 (BE ?? ??) - Framebuffer offset
  const fbPatchIndex = code.length + 1;
  code.push(0xBE, 0x00, 0x00);

  // mov cx, 32000 (B9 00 7D) - 32000 words = 64000 bytes
  code.push(0xB9, 0x00, 0x7D);

  // cld           (FC)
  // rep movsw     (F3 A5) - Fast word blit
  code.push(0xFC, 0xF3, 0xA5);

  // 5. Interactive loop: Wait for any keypress via BIOS INT 16h AH=00h
  // xor ah, ah    (30 E4)
  // int 16h       (CD 16)
  code.push(0x30, 0xE4);
  code.push(0xCD, 0x16);

  // 6. Restore standard 80x25 text mode (Mode 03h) via INT 10h
  // mov ax, 0003h (B8 03 00)
  // int 10h       (CD 10)
  code.push(0xB8, 0x03, 0x00);
  code.push(0xCD, 0x10);

  // 7. Print DOS exit message using INT 21h, AH=09h
  // mov dx, offset msg (BA ?? ??)
  const msgPatchIndex = code.length + 1;
  code.push(0xBA, 0x00, 0x00);
  // mov ah, 09h        (B4 09)
  // int 21h            (CD 21)
  code.push(0xB4, 0x09);
  code.push(0xCD, 0x21);

  // 8. Exit cleanly to MS-DOS (INT 21h, AH=4Ch, AL=00h)
  // mov ax, 4C00h (B8 00 4C)
  // int 21h       (CD 21)
  code.push(0xB8, 0x00, 0x4C);
  code.push(0xCD, 0x21);

  // Pad to 16-byte boundary
  while (code.length % 16 !== 0) {
    code.push(0x90); // NOP
  }

  // Text message to print on exit
  const msgOffset = code.length;
  const exitMsg = "\r\nMS-DOS Mode 13h (320x200 8-bit) NES Engine Terminated Cleanly.\r\n$";
  for (let i = 0; i < exitMsg.length; i++) {
    code.push(exitMsg.charCodeAt(i));
  }

  while (code.length % 16 !== 0) {
    code.push(0x00);
  }

  // Palette data offset
  const paletteOffset = code.length;
  // Reserve space for palette
  const fbOffset = paletteOffset + paletteSize;
  const romOffset = fbOffset + framebufferSize;

  // Patch the offsets in the machine code:
  code[palettePatchIndex] = paletteOffset & 0xFF;
  code[palettePatchIndex + 1] = (paletteOffset >> 8) & 0xFF;

  code[fbPatchIndex] = fbOffset & 0xFF;
  code[fbPatchIndex + 1] = (fbOffset >> 8) & 0xFF;

  code[msgPatchIndex] = msgOffset & 0xFF;
  code[msgPatchIndex + 1] = (msgOffset >> 8) & 0xFF;

  return {
    machineCode: new Uint8Array(code),
    paletteOffset,
    fbOffset,
    romOffset,
  };
}

/**
 * Builds the complete MS-DOS MZ Executable (.EXE) and flat .COM files from NES ROM & Mode 13h buffer
 */
export function buildDosExecutable(
  vgaBuffer: VgaMode13hBuffer,
  nesRom: NesRomData,
  includeRawNesPayload = true
): DosBuildResult {
  const paletteBytes = exportVgaDacBytes(vgaBuffer.palette); // 768 bytes
  const fbBytes = vgaBuffer.vram; // 64,000 bytes
  const romBytes = includeRawNesPayload ? nesRom.prgRom : new Uint8Array(0);

  const { machineCode, paletteOffset, fbOffset, romOffset } = generateX86RealModePayload(
    paletteBytes.length,
    fbBytes.length,
    includeRawNesPayload
  );

  const payloadSizeBytes = machineCode.length + paletteBytes.length + fbBytes.length + romBytes.length;

  // Build the 64-byte MZ Header
  const mzHeader = buildMzHeader({
    payloadSizeBytes,
    relocationCount: 0,
    initialCs: 0x0000,
    initialIp: 0x0000,
    initialSs: 0x0000,
    initialSp: 0x0800,
    minAllocParagraphs: 0x0010,
    maxAllocParagraphs: 0xFFFF,
  });

  // Assemble the full .EXE binary:
  const totalExeLength = 64 + payloadSizeBytes;
  const exeBytes = new Uint8Array(totalExeLength);

  // 1. Copy MZ Header (0x0000 - 0x003F)
  exeBytes.set(mzHeader, 0);

  // 2. Copy 16-bit x86 Code
  let writePtr = 64;
  exeBytes.set(machineCode, writePtr);
  writePtr += machineCode.length;

  // 3. Copy Palette Bytes
  exeBytes.set(paletteBytes, writePtr);
  writePtr += paletteBytes.length;

  // 4. Copy 320x200 Framebuffer Bytes (64,000 bytes)
  exeBytes.set(fbBytes, writePtr);
  writePtr += fbBytes.length;

  // 5. Copy Raw NES ROM Image if requested
  if (romBytes.length > 0) {
    exeBytes.set(romBytes, writePtr);
  }

  // Calculate DOS 512-byte pages and remainder
  const pages512 = Math.ceil(totalExeLength / 512);
  const remainderBytes = totalExeLength % 512;

  // Build .COM Flat Binary (first 64KB, without MZ header)
  const comLength = Math.min(65280, machineCode.length + paletteBytes.length + fbBytes.length);
  const comBytes = new Uint8Array(comLength);
  comBytes.set(machineCode, 0);
  comBytes.set(paletteBytes, machineCode.length);
  if (machineCode.length + paletteBytes.length + fbBytes.length <= 65280) {
    comBytes.set(fbBytes, machineCode.length + paletteBytes.length);
  }

  const disassemblySnippet = `; ==============================================================
; 16-bit Real Mode MS-DOS Mode 13h (320x200, 8-bit) Blitter
; Target: MS-DOS 3.30+ / DOSBox / FreeDOS / IBM PC-Compatible
; ==============================================================
org 0000h               ; MZ Executable Entry Point (CS:IP = 0000:0000)

start:
    push cs             ; Align DS to CS
    pop  ds

    ; Step 1: Set VGA Mode 13h (320x200, 256 colors) via INT 10h
    mov  ax, 0013h      ; AH=00h (Set Video Mode), AL=13h (VGA 320x200 256c)
    int  10h            ; Call BIOS Video Service

    ; Step 2: Upload 256-color DAC Palette (NES 64-color + DOS 16-color)
    mov  dx, 03C8h      ; PEL Address Write Mode Register
    xor  al, al         ; Start at color index 00h
    out  dx, al
    inc  dx             ; DX = 03C9h (PEL Data Register)
    mov  cx, 0300h      ; 768 bytes = 256 colors * 3 (R, G, B in 0..63)
    mov  si, offset palette_data
pal_loop:
    lodsb               ; Load AL from [DS:SI], SI++
    out  dx, al         ; Write 6-bit DAC component
    loop pal_loop       ; Loop until all 768 DAC bytes written

    ; Step 3: Copy 320x200 8-bit Framebuffer to Video RAM at 0A000h:0000h
    mov  ax, 0A000h     ; VGA Video Memory Base Segment
    mov  es, ax
    xor  di, di         ; ES:DI = 0A000h:0000h
    mov  si, offset framebuffer_data
    mov  cx, 7D00h      ; 32,000 words = 64,000 bytes (320 x 200 pixels)
    cld
    rep  movsw          ; Blit full screen to VGA memory at bus speed!

    ; Step 4: Wait for Keypress (BIOS Keyboard INT 16h)
    xor  ah, ah         ; AH=00h (Read Keystroke)
    int  16h

    ; Step 5: Restore 80x25 Color Text Mode (Mode 03h)
    mov  ax, 0003h
    int  10h

    ; Step 6: Print Clean Shutdown Message & Exit to DOS
    mov  dx, offset exit_msg
    mov  ah, 09h        ; INT 21h AH=09h (Display $-terminated string)
    int  21h
    mov  ax, 4C00h      ; INT 21h AH=4Ch, AL=00h (Terminate with Return Code 0)
    int  21h`;

  return {
    exeBytes,
    comBytes,
    mzHeaderBytes: mzHeader,
    fileSizeBytes: totalExeLength,
    pages512,
    remainderBytes,
    entryPointHex: 'CS:0000 IP:0000',
    paletteOffsetHex: `0x${(64 + paletteOffset).toString(16).toUpperCase().padStart(4, '0')}`,
    framebufferOffsetHex: `0x${(64 + fbOffset).toString(16).toUpperCase().padStart(4, '0')}`,
    nesRomOffsetHex: `0x${(64 + romOffset).toString(16).toUpperCase().padStart(4, '0')}`,
    x86MachineCodeLength: machineCode.length,
    disassemblySnippet,
  };
}
