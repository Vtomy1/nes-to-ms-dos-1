import React, { useState } from 'react';
import { Palette, Download, Info, Check, Copy } from 'lucide-react';
import { VgaMode13hBuffer } from '../lib/vga/mode13h';
import { exportVgaDacBytes } from '../lib/nes/palette';

interface VgaPaletteInspectorProps {
  vgaBuffer: VgaMode13hBuffer;
}

export const VgaPaletteInspector: React.FC<VgaPaletteInspectorProps> = ({ vgaBuffer }) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0x16); // Default to NES Red
  const [copied, setCopied] = useState(false);

  const palette = vgaBuffer.palette;
  const activeColor = palette[selectedIndex] || palette[0];

  const getColorSection = (idx: number): { label: string; tagColor: string } => {
    if (idx < 64) {
      return { label: `NES Master Palette ($${idx.toString(16).toUpperCase().padStart(2, '0')})`, tagColor: 'text-amber-400' };
    } else if (idx < 80) {
      return { label: `Standard MS-DOS 16 Colors (ANSI #${idx - 64})`, tagColor: 'text-cyan-400' };
    } else if (idx < 208) {
      return { label: `VGA Mode 13h Color Ramps (Ramp #${Math.floor((idx - 80) / 16)})`, tagColor: 'text-purple-400' };
    } else {
      return { label: 'VGA Grayscale Intensity Ramp', tagColor: 'text-gray-300' };
    }
  };

  const section = getColorSection(selectedIndex);

  const handleDownloadPal = () => {
    const rawBytes = exportVgaDacBytes(palette);
    const blob = new Blob([rawBytes as unknown as BlobPart], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'VGA_DAC_256.PAL';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyAsmDac = () => {
    const asmCode = `; Write Color #${selectedIndex} (0x${selectedIndex.toString(16).toUpperCase().padStart(2, '0')}) to VGA DAC
mov dx, 03C8h        ; PEL Address Write Mode Register
mov al, ${selectedIndex}          ; Palette Index
out dx, al
inc dx               ; DX = 03C9h (PEL Data Register)
mov al, ${activeColor.r6}          ; Red (0..63)
out dx, al
mov al, ${activeColor.g6}          ; Green (0..63)
out dx, al
mov al, ${activeColor.b6}          ; Blue (0..63)
out dx, al`;

    navigator.clipboard.writeText(asmCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Top Banner */}
      <div className="bg-[#161c27] border border-gray-700/80 p-3.5 rounded-lg flex flex-wrap items-center justify-between gap-3 shadow">
        <div>
          <div className="flex items-center gap-2 text-base font-bold text-amber-300">
            <Palette className="w-5 h-5 text-amber-400" />
            <span>VGA Mode 13h 256-Color DAC Hardware Palette (Ports 0x3C8 & 0x3C9)</span>
          </div>
          <p className="text-gray-400 mt-1 text-xs">
            18-bit DAC RAM (6 bits per channel: Red 0..63, Green 0..63, Blue 0..63) mapping NES colors directly to VGA.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyAsmDac}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#20293a] hover:bg-[#2a374e] text-gray-200 border border-gray-600 rounded cursor-pointer transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied ASM Out!' : 'Copy DAC ASM Out'}</span>
          </button>
          <button
            onClick={handleDownloadPal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded cursor-pointer transition border border-blue-500"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download 768B .PAL</span>
          </button>
        </div>
      </div>

      {/* 256-Color Palette Grid & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 8 Cols: Full 256-Color Swatch Matrix */}
        <div className="lg:col-span-8 bg-[#151c27] border border-gray-700/80 rounded-lg p-3 shadow space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-gray-700 text-cyan-300 font-bold">
            <span>256-Color Mode 13h Swatch Grid (16 × 16)</span>
            <span className="text-[10px] text-gray-400">Click any color to inspect DAC registers</span>
          </div>

          <div className="grid grid-cols-16 gap-1 bg-black/80 p-2 rounded border border-gray-800">
            {palette.map((col, idx) => {
              const isSelected = selectedIndex === idx;
              const isNesRange = idx < 64;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedIndex(idx)}
                  className={`w-full aspect-square rounded-xs transition relative cursor-pointer group ${
                    isSelected ? 'ring-2 ring-white scale-110 z-10 shadow-lg' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: col.hex }}
                  title={`Color #${idx} (0x${idx.toString(16).toUpperCase().padStart(2, '0')}): ${col.hex}`}
                >
                  {isNesRange && idx % 16 === 0 && (
                    <span className="absolute -top-1 -left-1 w-1.5 h-1.5 bg-amber-400 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Section Legends */}
          <div className="flex flex-wrap items-center gap-4 text-[10px] pt-1 text-gray-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-xs"></span>
              <span>Colors 0-63: NES Master Palette</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-xs"></span>
              <span>Colors 64-79: MS-DOS 16 Colors</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-purple-500 rounded-xs"></span>
              <span>Colors 80-207: Color Ramps</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-gray-400 rounded-xs"></span>
              <span>Colors 208-255: Grayscale</span>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Selected Color Hardware Inspection Card */}
        <div className="lg:col-span-4 bg-[#151c27] border border-gray-700/80 rounded-lg p-3 shadow space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-gray-700 text-amber-300 font-bold">
            <span>DAC Hardware Inspection</span>
            <span className="text-[10px] text-gray-400">Port 0x3C8 / 0x3C9</span>
          </div>

          {/* Large Color Swatch Preview */}
          <div className="flex items-center gap-3 p-3 bg-gray-950 rounded-lg border border-gray-800">
            <div
              className="w-16 h-16 rounded-md border-2 border-white shadow-lg shrink-0"
              style={{ backgroundColor: activeColor.hex }}
            />
            <div className="space-y-0.5">
              <div className="text-sm font-bold text-white">Color #{selectedIndex}</div>
              <div className="text-cyan-400 font-mono">
                Hex: 0x{selectedIndex.toString(16).toUpperCase().padStart(2, '0')}
              </div>
              <div className="text-emerald-400 font-bold">{activeColor.hex}</div>
              <div className={`text-[10px] font-semibold ${section.tagColor}`}>{section.label}</div>
            </div>
          </div>

          {/* 6-bit DAC Register Breakdown */}
          <div className="space-y-1.5 text-xs">
            <div className="text-gray-300 font-bold pb-1 border-b border-gray-800">
              VGA 6-bit DAC Levels (0 - 63):
            </div>
            <div className="flex justify-between p-1.5 bg-red-950/40 border border-red-800/60 rounded">
              <span className="text-red-300 font-semibold">Red (PEL Data):</span>
              <span className="text-white font-bold font-mono">
                {activeColor.r6} / 63 (8-bit: {activeColor.rgb.r})
              </span>
            </div>
            <div className="flex justify-between p-1.5 bg-emerald-950/40 border border-emerald-800/60 rounded">
              <span className="text-emerald-300 font-semibold">Green (PEL Data):</span>
              <span className="text-white font-bold font-mono">
                {activeColor.g6} / 63 (8-bit: {activeColor.rgb.g})
              </span>
            </div>
            <div className="flex justify-between p-1.5 bg-blue-950/40 border border-blue-800/60 rounded">
              <span className="text-blue-300 font-semibold">Blue (PEL Data):</span>
              <span className="text-white font-bold font-mono">
                {activeColor.b6} / 63 (8-bit: {activeColor.rgb.b})
              </span>
            </div>
          </div>

          {/* Hardware Port Protocol Explanation */}
          <div className="p-2.5 bg-black/60 rounded border border-gray-800 text-[11px] text-gray-300 space-y-1">
            <div className="font-bold text-amber-300">VGA DAC Programming Protocol:</div>
            <ol className="list-decimal list-inside space-y-0.5 text-gray-400 text-[10px]">
              <li>Write index to port <code className="text-cyan-300">0x3C8</code></li>
              <li>Write Red value (0..63) to port <code className="text-cyan-300">0x3C9</code></li>
              <li>Write Green value (0..63) to port <code className="text-cyan-300">0x3C9</code></li>
              <li>Write Blue value (0..63) to port <code className="text-cyan-300">0x3C9</code></li>
              <li>Auto-increments to next palette register!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
