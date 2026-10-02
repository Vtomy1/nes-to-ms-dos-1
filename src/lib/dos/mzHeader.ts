/**
 * MS-DOS MZ Executable (EXE) Header Definitions and Relocation Table Management
 */

export interface MzHeaderField {
  name: string;
  shortName: string;
  offset: number;
  size: number;
  value: number;
  hex: string;
  description: string;
  explanation: string;
}

export interface MzRelocationEntry {
  offset: number;  // 16-bit offset within segment
  segment: number; // 16-bit segment relative to load segment
}

export interface MzHeaderInfo {
  magic: number; // 0x5A4D ('MZ')
  cblp: number;  // bytes on last page
  cp: number;    // pages in file
  crlc: number;  // relocations count
  cparhdr: number; // header size in paragraphs (16-byte units)
  minalloc: number; // min extra paragraphs
  maxalloc: number; // max extra paragraphs
  ss: number;    // initial relative SS
  sp: number;    // initial SP
  csum: number;  // checksum
  ip: number;    // initial IP
  cs: number;    // initial relative CS
  lfarlc: number;// offset of relocation table
  ovno: number;  // overlay number
  rawBytes: Uint8Array;
  fields: MzHeaderField[];
  relocations: MzRelocationEntry[];
}

/**
 * Parses a 64-byte DOS MZ header from a binary array
 */
export function parseMzHeader(bytes: Uint8Array): MzHeaderInfo {
  const view = new DataView(bytes.buffer, bytes.byteOffset, Math.min(bytes.byteLength, 64));

  const magic = view.getUint16(0x00, true);
  const cblp = view.getUint16(0x02, true);
  const cp = view.getUint16(0x04, true);
  const crlc = view.getUint16(0x06, true);
  const cparhdr = view.getUint16(0x08, true);
  const minalloc = view.getUint16(0x0a, true);
  const maxalloc = view.getUint16(0x0c, true);
  const ss = view.getUint16(0x0e, true);
  const sp = view.getUint16(0x10, true);
  const csum = view.getUint16(0x12, true);
  const ip = view.getUint16(0x14, true);
  const cs = view.getUint16(0x16, true);
  const lfarlc = view.getUint16(0x18, true);
  const ovno = view.getUint16(0x1a, true);

  const fields: MzHeaderField[] = [
    {
      name: 'Magic Number (Signature)',
      shortName: 'e_magic',
      offset: 0x00,
      size: 2,
      value: magic,
      hex: `0x${magic.toString(16).toUpperCase().padStart(4, '0')} ('${String.fromCharCode(magic & 0xff, (magic >> 8) & 0xff)}')`,
      description: 'Mark Zbikowski signature (0x5A4D / "MZ")',
      explanation: 'Identifies the file as an MS-DOS 16-bit executable to COMMAND.COM / DOS kernel.',
    },
    {
      name: 'Bytes on Last 512-byte Page',
      shortName: 'e_cblp',
      offset: 0x02,
      size: 2,
      value: cblp,
      hex: `0x${cblp.toString(16).toUpperCase().padStart(4, '0')} (${cblp} bytes)`,
      description: 'Length of the partial final 512-byte block',
      explanation: 'If 0, the last block is a full 512 bytes. Used with e_cp to compute exact file size.',
    },
    {
      name: 'Total 512-byte Pages in File',
      shortName: 'e_cp',
      offset: 0x04,
      size: 2,
      value: cp,
      hex: `0x${cp.toString(16).toUpperCase().padStart(4, '0')} (${cp} pages = ${cp * 512} bytes)`,
      description: 'File size in 512-byte blocks (rounded up)',
      explanation: 'DOS loader uses this to allocate file image space in memory.',
    },
    {
      name: 'Relocation Items Count',
      shortName: 'e_crlc',
      offset: 0x06,
      size: 2,
      value: crlc,
      hex: `0x${crlc.toString(16).toUpperCase().padStart(4, '0')} (${crlc} items)`,
      description: 'Number of entries in relocation table',
      explanation: 'List of pointers in code/data that DOS must fix up with the actual runtime segment.',
    },
    {
      name: 'Header Size in 16-byte Paragraphs',
      shortName: 'e_cparhdr',
      offset: 0x08,
      size: 2,
      value: cparhdr,
      hex: `0x${cparhdr.toString(16).toUpperCase().padStart(4, '0')} (${cparhdr * 16} bytes)`,
      description: 'Offset to executable load image',
      explanation: 'DOS skips this many 16-byte paragraphs to find the start of the code/data payload.',
    },
    {
      name: 'Minimum Extra Paragraphs',
      shortName: 'e_minalloc',
      offset: 0x0a,
      size: 2,
      value: minalloc,
      hex: `0x${minalloc.toString(16).toUpperCase().padStart(4, '0')} (${minalloc * 16} bytes)`,
      description: 'Min memory required beyond program image',
      explanation: 'Program fails to launch with "Program too big to fit in memory" if unavailable.',
    },
    {
      name: 'Maximum Extra Paragraphs',
      shortName: 'e_maxalloc',
      offset: 0x0c,
      size: 2,
      value: maxalloc,
      hex: `0x${maxalloc.toString(16).toUpperCase().padStart(4, '0')}`,
      description: 'Max memory DOS can allocate (0xFFFF = all free conventional RAM)',
      explanation: 'Usually 0xFFFF to grant all available conventional memory up to 640KB limit.',
    },
    {
      name: 'Initial Relative SS (Stack Segment)',
      shortName: 'e_ss',
      offset: 0x0e,
      size: 2,
      value: ss,
      hex: `0x${ss.toString(16).toUpperCase().padStart(4, '0')}`,
      description: 'Stack Segment relative to program load segment',
      explanation: 'Loaded into CPU SS register on startup: SS = LoadSegment + e_ss.',
    },
    {
      name: 'Initial SP (Stack Pointer)',
      shortName: 'e_sp',
      offset: 0x10,
      size: 2,
      value: sp,
      hex: `0x${sp.toString(16).toUpperCase().padStart(4, '0')} (${sp} bytes)`,
      description: 'Initial stack pointer offset',
      explanation: 'Loaded into CPU SP register on startup (points to top of stack segment).',
    },
    {
      name: 'Checksum',
      shortName: 'e_csum',
      offset: 0x12,
      size: 2,
      value: csum,
      hex: `0x${csum.toString(16).toUpperCase().padStart(4, '0')}`,
      description: 'Ones\' complement checksum (often 0)',
      explanation: 'Unchecked by MS-DOS versions 2.0+ (typically left 0x0000).',
    },
    {
      name: 'Initial IP (Instruction Pointer)',
      shortName: 'e_ip',
      offset: 0x14,
      size: 2,
      value: ip,
      hex: `0x${ip.toString(16).toUpperCase().padStart(4, '0')}`,
      description: 'Entry point offset in code segment',
      explanation: 'Loaded into CPU IP register on startup. Execution begins here.',
    },
    {
      name: 'Initial Relative CS (Code Segment)',
      shortName: 'e_cs',
      offset: 0x16,
      size: 2,
      value: cs,
      hex: `0x${cs.toString(16).toUpperCase().padStart(4, '0')}`,
      description: 'Code Segment relative to program load segment',
      explanation: 'Loaded into CPU CS register on startup: CS = LoadSegment + e_cs.',
    },
    {
      name: 'Relocation Table File Offset',
      shortName: 'e_lfarlc',
      offset: 0x18,
      size: 2,
      value: lfarlc,
      hex: `0x${lfarlc.toString(16).toUpperCase().padStart(4, '0')} (${lfarlc} bytes)`,
      description: 'File offset to relocation entries array',
      explanation: 'Points to where the relocation table begins (typically 0x001E or 0x0040).',
    },
    {
      name: 'Overlay Number',
      shortName: 'e_ovno',
      offset: 0x1a,
      size: 2,
      value: ovno,
      hex: `0x${ovno.toString(16).toUpperCase().padStart(4, '0')}`,
      description: 'Overlay number (0 = root executable)',
      explanation: 'Used by DOS overlay managers. 0 indicates the main executable module.',
    },
  ];

  // Parse relocations if any
  const relocations: MzRelocationEntry[] = [];
  if (crlc > 0 && lfarlc < bytes.length) {
    const rView = new DataView(bytes.buffer, bytes.byteOffset + lfarlc);
    for (let i = 0; i < crlc; i++) {
      if ((i * 4 + 4) <= (bytes.byteLength - lfarlc)) {
        const offset = rView.getUint16(i * 4, true);
        const segment = rView.getUint16(i * 4 + 2, true);
        relocations.push({ offset, segment });
      }
    }
  }

  return {
    magic,
    cblp,
    cp,
    crlc,
    cparhdr,
    minalloc,
    maxalloc,
    ss,
    sp,
    csum,
    ip,
    cs,
    lfarlc,
    ovno,
    rawBytes: bytes.slice(0, 64),
    fields,
    relocations,
  };
}

/**
 * Creates a raw 64-byte MS-DOS MZ header given parameters
 */
export function buildMzHeader(params: {
  payloadSizeBytes: number;
  relocationCount?: number;
  initialCs?: number;
  initialIp?: number;
  initialSs?: number;
  initialSp?: number;
  minAllocParagraphs?: number;
  maxAllocParagraphs?: number;
}): Uint8Array {
  const headerSize = 64; // 4 paragraphs
  const cparhdr = 4;
  const relCount = params.relocationCount || 0;
  const totalFileSize = headerSize + (relCount * 4) + params.payloadSizeBytes;

  const cp = Math.ceil(totalFileSize / 512);
  const cblp = totalFileSize % 512;

  const header = new Uint8Array(64);
  const view = new DataView(header.buffer);

  // 0x00: 'MZ' (0x5A4D)
  view.setUint16(0x00, 0x5A4D, true);
  // 0x02: e_cblp
  view.setUint16(0x02, cblp, true);
  // 0x04: e_cp
  view.setUint16(0x04, cp, true);
  // 0x06: e_crlc
  view.setUint16(0x06, relCount, true);
  // 0x08: e_cparhdr (4 paragraphs = 64 bytes)
  view.setUint16(0x08, cparhdr, true);
  // 0x0A: e_minalloc (16 paragraphs = 256 bytes minimum)
  view.setUint16(0x0A, params.minAllocParagraphs ?? 0x0010, true);
  // 0x0C: e_maxalloc (0xFFFF = all memory)
  view.setUint16(0x0C, params.maxAllocParagraphs ?? 0xFFFF, true);
  // 0x0E: e_ss (Stack segment relative to load segment)
  view.setUint16(0x0E, params.initialSs ?? 0x0000, true);
  // 0x10: e_sp (Stack pointer)
  view.setUint16(0x10, params.initialSp ?? 0x0800, true);
  // 0x12: e_csum
  view.setUint16(0x12, 0x0000, true);
  // 0x14: e_ip (Entry point IP)
  view.setUint16(0x14, params.initialIp ?? 0x0000, true);
  // 0x16: e_cs (Entry point CS)
  view.setUint16(0x16, params.initialCs ?? 0x0000, true);
  // 0x18: e_lfarlc (Relocation table offset = 0x0040, right after 64-byte header)
  view.setUint16(0x18, 0x0040, true);
  // 0x1A: e_ovno
  view.setUint16(0x1A, 0x0000, true);

  return header;
}
