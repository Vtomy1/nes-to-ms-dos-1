import React, { useState } from 'react';
import { Cpu, Info, Check, Copy, Download, Layers, ShieldCheck, FileText } from 'lucide-react';
import { parseMzHeader, MzHeaderInfo, MzHeaderField } from '../lib/dos/mzHeader';
import { DosBuildResult } from '../lib/dos/builder';

interface MzHeaderInspectorProps {
  buildResult: DosBuildResult;
}

export const MzHeaderInspector: React.FC<MzHeaderInspectorProps> = ({ buildResult }) => {
  const [selectedField, setSelectedField] = useState<MzHeaderField | null>(null);
  const [copied, setCopied] = useState(false);

  const mzInfo: MzHeaderInfo = parseMzHeader(buildResult.mzHeaderBytes);

  const handleCopyStruct = () => {
    const structDef = `/* Standard 16-bit MS-DOS MZ Executable Header (64 bytes) */
typedef struct {
    unsigned short e_magic;    /* 0x00: Magic number (0x5A4D "MZ") */
    unsigned short e_cblp;     /* 0x02: Bytes on last 512-byte page (0x${mzInfo.cblp.toString(16).padStart(4, '0')}) */
    unsigned short e_cp;       /* 0x04: Pages in file (0x${mzInfo.cp.toString(16).padStart(4, '0')} = ${mzInfo.cp} pages) */
    unsigned short e_crlc;     /* 0x06: Relocations (0x${mzInfo.crlc.toString(16).padStart(4, '0')}) */
    unsigned short e_cparhdr;  /* 0x08: Size of header in paragraphs (0x${mzInfo.cparhdr.toString(16).padStart(4, '0')} = ${mzInfo.cparhdr * 16} bytes) */
    unsigned short e_minalloc; /* 0x0A: Minimum extra paragraphs (0x${mzInfo.minalloc.toString(16).padStart(4, '0')}) */
    unsigned short e_maxalloc; /* 0x0C: Maximum extra paragraphs (0x${mzInfo.maxalloc.toString(16).padStart(4, '0')}) */
    unsigned short e_ss;       /* 0x0E: Initial relative SS (0x${mzInfo.ss.toString(16).padStart(4, '0')}) */
    unsigned short e_sp;       /* 0x10: Initial SP (0x${mzInfo.sp.toString(16).padStart(4, '0')}) */
    unsigned short e_csum;     /* 0x12: Checksum (0x${mzInfo.csum.toString(16).padStart(4, '0')}) */
    unsigned short e_ip;       /* 0x14: Initial IP (0x${mzInfo.ip.toString(16).padStart(4, '0')}) */
    unsigned short e_cs;       /* 0x16: Initial relative CS (0x${mzInfo.cs.toString(16).padStart(4, '0')}) */
    unsigned short e_lfarlc;   /* 0x18: File address of relocation table (0x${mzInfo.lfarlc.toString(16).padStart(4, '0')}) */
    unsigned short e_ovno;     /* 0x1A: Overlay number (0x${mzInfo.ovno.toString(16).padStart(4, '0')}) */
    unsigned short e_res[18];  /* 0x1C: Reserved words (extended / 64-byte padding) */
} IMAGE_DOS_HEADER;`;

    navigator.clipboard.writeText(structDef);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadHeaderBin = () => {
    const blob = new Blob([buildResult.mzHeaderBytes as unknown as BlobPart], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'DOS_MZ_HEADER.BIN';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Overview Banner */}
      <div className="bg-[#161c27] border border-gray-700/80 p-4 rounded-lg flex flex-wrap items-center justify-between gap-4 shadow">
        <div>
          <div className="flex items-center gap-2 text-base font-bold text-amber-300">
            <Cpu className="w-5 h-5 text-amber-400" />
            <span>16-bit MS-DOS MZ Executable (.EXE) Header Architecture</span>
          </div>
          <p className="text-gray-400 mt-1 text-xs">
            Standard 64-byte header parsed by MS-DOS 2.0+ EXEC system call (INT 21h, AH=4Bh)
            to relocate and launch real-mode x86 binaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyStruct}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#20293a] hover:bg-[#2a374e] text-gray-200 border border-gray-600 rounded cursor-pointer transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied C Struct!' : 'Copy C Struct'}</span>
          </button>
          <button
            onClick={handleDownloadHeaderBin}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded cursor-pointer transition border border-blue-500"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download 64B .BIN</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Header Fields List & Live Hex Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: 14 Header Fields Table (Col 1-7) */}
        <div className="lg:col-span-7 bg-[#151c27] border border-gray-700/80 rounded-lg p-3 shadow">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-700 text-amber-300 font-bold">
            <span>MZ Header Struct Fields (IMAGE_DOS_HEADER)</span>
            <span className="text-[10px] text-gray-400">Total: 14 Fields (64 Bytes)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="py-1 px-1.5">Offset</th>
                  <th className="py-1 px-1.5">Member</th>
                  <th className="py-1 px-1.5">Value (Hex)</th>
                  <th className="py-1 px-1.5">Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {mzInfo.fields.map((f) => {
                  const isSelected = selectedField?.shortName === f.shortName;
                  return (
                    <tr
                      key={f.shortName}
                      onClick={() => setSelectedField(f)}
                      className={`cursor-pointer transition hover:bg-[#1f2838] ${
                        isSelected ? 'bg-amber-950/40 text-amber-200' : 'text-gray-300'
                      }`}
                    >
                      <td className="py-1.5 px-1.5 text-cyan-400 font-bold">
                        +0x{f.offset.toString(16).toUpperCase().padStart(2, '0')}
                      </td>
                      <td className="py-1.5 px-1.5 text-yellow-300 font-bold">{f.shortName}</td>
                      <td className="py-1.5 px-1.5 text-emerald-400 font-mono font-semibold">
                        {f.hex}
                      </td>
                      <td className="py-1.5 px-1.5 text-gray-400">{f.description}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Selected Field Explanation Box */}
          {selectedField && (
            <div className="mt-3 p-2.5 bg-gray-900/90 border border-amber-500/40 rounded text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <Info className="w-3.5 h-3.5" />
                <span>
                  {selectedField.name} ({selectedField.shortName})
                </span>
              </div>
              <p className="text-gray-300 text-[11px]">{selectedField.explanation}</p>
            </div>
          )}
        </div>

        {/* Right Column: 64-byte Hex Matrix & Memory Segment Map (Col 8-12) */}
        <div className="lg:col-span-5 space-y-4">
          {/* 64-Byte MZ Header Hex Viewer */}
          <div className="bg-[#151c27] border border-gray-700/80 rounded-lg p-3 shadow">
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-gray-700 text-cyan-300 font-bold">
              <span>Raw MZ Header Hex Dump (0x0000 - 0x003F)</span>
              <span className="text-[10px] text-gray-400">4 Paragraphs (64B)</span>
            </div>

            <div className="bg-black/80 p-2.5 rounded border border-gray-800 text-[11px] font-mono leading-relaxed space-y-1">
              {Array.from({ length: 4 }).map((_, row) => {
                const rowOffset = row * 16;
                const rowBytes = Array.from(buildResult.mzHeaderBytes.subarray(rowOffset, rowOffset + 16));
                const ascii = rowBytes
                  .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
                  .join('');

                return (
                  <div key={row} className="flex items-center justify-between hover:bg-gray-800/40 px-1 rounded">
                    <span className="text-gray-500 mr-2">
                      0x{rowOffset.toString(16).toUpperCase().padStart(4, '0')}
                    </span>
                    <div className="flex gap-1.5 text-emerald-400">
                      {rowBytes.map((b, col) => {
                        const byteIndex = rowOffset + col;
                        const isSelected =
                          selectedField &&
                          byteIndex >= selectedField.offset &&
                          byteIndex < selectedField.offset + selectedField.size;
                        const isMagic = byteIndex === 0 || byteIndex === 1;

                        return (
                          <span
                            key={col}
                            className={`px-0.5 rounded ${
                              isSelected
                                ? 'bg-amber-500 text-black font-bold'
                                : isMagic
                                ? 'text-amber-400 font-bold'
                                : ''
                            }`}
                          >
                            {b.toString(16).toUpperCase().padStart(2, '0')}
                          </span>
                        );
                      })}
                    </div>
                    <span className="text-purple-300 tracking-widest pl-2">|{ascii}|</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real-Mode Conventional Memory Map Diagram */}
          <div className="bg-[#151c27] border border-gray-700/80 rounded-lg p-3 shadow">
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-gray-700 text-emerald-300 font-bold">
              <span>MS-DOS Real-Mode Memory Layout</span>
              <span className="text-[10px] text-gray-400">0KB - 640KB Conventional</span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between p-1.5 bg-gray-900 border border-gray-800 rounded">
                <span className="text-yellow-400 font-bold">0xA000:0000 - 0xA000:FA00</span>
                <span className="text-gray-300">VGA Mode 13h Framebuffer (64KB)</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-gray-900/70 border border-gray-800 rounded">
                <span className="text-purple-400 font-bold">SS:SP (Stack Segment)</span>
                <span className="text-gray-300">Initial Stack (e_sp = 0x0800)</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-gray-900/70 border border-gray-800 rounded">
                <span className="text-cyan-400 font-bold">DS:0000 (Data Segment)</span>
                <span className="text-gray-300">NES Palette, Screen Buffer, ROM</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-gray-900/70 border border-gray-800 rounded">
                <span className="text-emerald-400 font-bold">CS:IP = 0000:0000</span>
                <span className="text-gray-300">x86 Real Mode Entry Point (INT 10h)</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-gray-900/50 border border-gray-800 rounded">
                <span className="text-gray-400">PSP (Program Segment Prefix)</span>
                <span className="text-gray-400">256-byte Command Tail & FCBs</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-gray-900/30 border border-gray-800 rounded">
                <span className="text-gray-500">0000:0000 - 0050:0000</span>
                <span className="text-gray-500">IVT (Interrupt Table) & BIOS Data</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
