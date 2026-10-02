import React from 'react';
import { X, Download, FileCode, CheckCircle2, ShieldAlert, Cpu } from 'lucide-react';
import { DosBuildResult } from '../lib/dos/builder';
import { NesRomData } from '../lib/nes/types';
import { VgaMode13hBuffer } from '../lib/vga/mode13h';
import { exportVgaDacBytes } from '../lib/nes/palette';
import { generateNasmSource, generateTurboCSource } from '../lib/dos/sourceGenerators';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildResult: DosBuildResult;
  rom: NesRomData;
  vgaBuffer: VgaMode13hBuffer;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  buildResult,
  rom,
  vgaBuffer,
}) => {
  if (!isOpen) return null;

  const downloadFile = (bytes: Uint8Array | string, filename: string, mime: string) => {
    const blob = typeof bytes === 'string'
      ? new Blob([bytes], { type: mime })
      : new Blob([bytes as unknown as BlobPart], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const baseName = rom.fileName.replace(/\.[^/.]+$/, '').toUpperCase();

  const exportOptions = [
    {
      title: `${baseName}.EXE (MS-DOS MZ Executable)`,
      desc: 'Full 16-bit real-mode MS-DOS executable with genuine 64-byte MZ header, INT 10h Mode 13h blitter, and DAC palette.',
      size: `${buildResult.fileSizeBytes.toLocaleString()} bytes`,
      badge: 'Primary Output',
      badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-600',
      action: () => downloadFile(buildResult.exeBytes, `${baseName}.EXE`, 'application/x-msdos-program'),
    },
    {
      title: `${baseName}.COM (DOS Flat Binary)`,
      desc: 'Compact 64KB DOS flat executable for direct execution at offset 0x0100 (no relocation headers).',
      size: `${buildResult.comBytes.length.toLocaleString()} bytes`,
      badge: 'Flat Binary',
      badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-600',
      action: () => downloadFile(buildResult.comBytes, `${baseName}.COM`, 'application/octet-stream'),
    },
    {
      title: 'DOS_NES.ASM (x86 Assembly Source)',
      desc: 'Clean, documented 16-bit NASM / TASM source code with Mode 13h init, DAC ports 0x3C8/0x3C9, and rep movsw blit.',
      size: 'Text Source',
      badge: 'NASM / TASM',
      badgeColor: 'bg-amber-950 text-amber-300 border-amber-600',
      action: () =>
        downloadFile(
          generateNasmSource(rom, vgaBuffer.palette, vgaBuffer.vram),
          'DOS_NES.ASM',
          'text/plain'
        ),
    },
    {
      title: 'DOS_NES.C (Turbo C / Watcom C Source)',
      desc: 'C source code for Borland Turbo C++ 3.0 / OpenWatcom with int86 BIOS calls and far pointer VGA framebuffer.',
      size: 'C Source',
      badge: 'Turbo C 3.0',
      badgeColor: 'bg-blue-950 text-blue-300 border-blue-600',
      action: () => downloadFile(generateTurboCSource(rom), 'DOS_NES.C', 'text/plain'),
    },
    {
      title: 'VGA_DAC_256.PAL (256-Color DAC Palette)',
      desc: 'Raw 768-byte VGA DAC hardware palette (R, G, B in 0..63 range) compatible with Deluxe Paint II & DOS tools.',
      size: '768 bytes',
      badge: 'Hardware DAC',
      badgeColor: 'bg-purple-950 text-purple-300 border-purple-600',
      action: () =>
        downloadFile(exportVgaDacBytes(vgaBuffer.palette), 'VGA_DAC.PAL', 'application/octet-stream'),
    },
    {
      title: 'SCREEN_320X200.BIN (Mode 13h VRAM Dump)',
      desc: 'Direct 64,000-byte linear 8-bit framebuffer memory snapshot as written to 0xA000:0000.',
      size: '64,000 bytes',
      badge: 'Linear VRAM',
      badgeColor: 'bg-gray-800 text-gray-300 border-gray-600',
      action: () => downloadFile(vgaBuffer.vram, 'SCREEN.BIN', 'application/octet-stream'),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs font-mono text-xs">
      <div className="bg-[#151c27] border-2 border-amber-500/70 rounded-xl shadow-2xl max-w-2xl w-full p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-700">
          <div className="flex items-center gap-2 text-base font-bold text-amber-300">
            <Cpu className="w-5 h-5 text-amber-400" />
            <span>Export MS-DOS MZ Executables & Source Files</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Compatibility Notice */}
        <div className="p-3 bg-blue-950/40 border border-blue-700/60 rounded-lg text-blue-200 text-[11px] leading-relaxed flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <strong>MS-DOS & DOSBox Ready:</strong> All exported executables contain a valid 64-byte MZ header
            with calculated 512-byte pages, CS:IP entry points, and x86 real-mode VGA Mode 13h machine code.
            They can be run directly in <strong>DOSBox, DOSBox-Staging, FreeDOS, 86Box, PCem</strong>, or original MS-DOS 3.30+ hardware!
          </div>
        </div>

        {/* Export Items List */}
        <div className="space-y-2">
          {exportOptions.map((opt, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 bg-gray-900/90 border border-gray-800 rounded-lg hover:border-gray-700 transition gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-xs">{opt.title}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${opt.badgeColor}`}>
                    {opt.badge}
                  </span>
                </div>
                <p className="text-gray-400 text-[11px] max-w-md">{opt.desc}</p>
                <div className="text-[10px] text-cyan-400 font-semibold">{opt.size}</div>
              </div>

              <button
                onClick={opt.action}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold cursor-pointer transition shrink-0 shadow border border-emerald-400"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded cursor-pointer transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
