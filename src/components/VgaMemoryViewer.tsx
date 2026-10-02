import React, { useState } from 'react';
import { FileCode, Search, ArrowRight, CornerDownRight } from 'lucide-react';
import { VgaMode13hBuffer, VGA_WIDTH, VGA_HEIGHT, VGA_FRAMEBUFFER_BYTES } from '../lib/vga/mode13h';

interface VgaMemoryViewerProps {
  vgaBuffer: VgaMode13hBuffer;
}

export const VgaMemoryViewer: React.FC<VgaMemoryViewerProps> = ({ vgaBuffer }) => {
  const [currentOffset, setCurrentOffset] = useState<number>(0);
  const [jumpX, setJumpX] = useState<string>('0');
  const [jumpY, setJumpY] = useState<string>('0');
  const [jumpHex, setJumpHex] = useState<string>('0000');

  const rowsToShow = 16;
  const bytesPerRow = 16;
  const totalWindowBytes = rowsToShow * bytesPerRow; // 256 bytes

  const vram = vgaBuffer.vram;
  const palette = vgaBuffer.palette;

  const handleJumpCoords = (e: React.FormEvent) => {
    e.preventDefault();
    const x = Math.min(VGA_WIDTH - 1, Math.max(0, parseInt(jumpX, 10) || 0));
    const y = Math.min(VGA_HEIGHT - 1, Math.max(0, parseInt(jumpY, 10) || 0));
    const targetOffset = y * VGA_WIDTH + x;
    const alignedOffset = Math.floor(targetOffset / 16) * 16;
    setCurrentOffset(Math.min(VGA_FRAMEBUFFER_BYTES - totalWindowBytes, alignedOffset));
  };

  const handleJumpHex = (e: React.FormEvent) => {
    e.preventDefault();
    const targetOffset = parseInt(jumpHex, 16) || 0;
    const alignedOffset = Math.floor(Math.max(0, targetOffset) / 16) * 16;
    setCurrentOffset(Math.min(VGA_FRAMEBUFFER_BYTES - totalWindowBytes, alignedOffset));
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Top Banner & Jump Navigation */}
      <div className="bg-[#161c27] border border-gray-700/80 p-3.5 rounded-lg flex flex-wrap items-center justify-between gap-3 shadow">
        <div>
          <div className="flex items-center gap-2 text-base font-bold text-cyan-300">
            <FileCode className="w-5 h-5 text-cyan-400" />
            <span>0xA000:0000 Video RAM Linear Memory Map (64,000 Bytes)</span>
          </div>
          <p className="text-gray-400 mt-1 text-xs">
            Direct real-mode VGA Mode 13h video buffer. Each byte represents a single pixel (0xA0000 + Y*320 + X).
          </p>
        </div>

        {/* Quick Jump Forms */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Jump by (X, Y) */}
          <form onSubmit={handleJumpCoords} className="flex items-center gap-1 bg-[#10141e] border border-gray-700 px-2 py-1 rounded">
            <span className="text-gray-400 text-[11px]">X:</span>
            <input
              type="number"
              value={jumpX}
              onChange={(e) => setJumpX(e.target.value)}
              min={0}
              max={319}
              className="w-10 bg-transparent text-amber-300 font-bold focus:outline-none"
            />
            <span className="text-gray-400 text-[11px]">Y:</span>
            <input
              type="number"
              value={jumpY}
              onChange={(e) => setJumpY(e.target.value)}
              min={0}
              max={199}
              className="w-10 bg-transparent text-amber-300 font-bold focus:outline-none"
            />
            <button
              type="submit"
              className="text-cyan-400 hover:text-cyan-300 cursor-pointer p-0.5"
              title="Jump to pixel coordinate"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Jump by Hex Offset */}
          <form onSubmit={handleJumpHex} className="flex items-center gap-1 bg-[#10141e] border border-gray-700 px-2 py-1 rounded">
            <span className="text-gray-400 text-[11px]">Hex: 0x</span>
            <input
              type="text"
              value={jumpHex}
              onChange={(e) => setJumpHex(e.target.value)}
              maxLength={4}
              className="w-12 bg-transparent text-emerald-300 font-bold uppercase focus:outline-none"
            />
            <button
              type="submit"
              className="text-emerald-400 hover:text-emerald-300 cursor-pointer p-0.5"
              title="Jump to hex offset"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Hex Dump Table */}
      <div className="bg-[#151c27] border border-gray-700/80 rounded-lg p-3 shadow space-y-3">
        {/* Navigation Pager */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-700 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Current Window:</span>
            <span className="text-amber-300 font-bold">
              0xA000:0x{currentOffset.toString(16).toUpperCase().padStart(4, '0')} — 0xA000:0x
              {(currentOffset + totalWindowBytes - 1).toString(16).toUpperCase().padStart(4, '0')}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentOffset(Math.max(0, currentOffset - totalWindowBytes))}
              disabled={currentOffset === 0}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 rounded border border-gray-700 cursor-pointer"
            >
              ◀ Prev 256B
            </button>
            <button
              onClick={() =>
                setCurrentOffset(Math.min(VGA_FRAMEBUFFER_BYTES - totalWindowBytes, currentOffset + totalWindowBytes))
              }
              disabled={currentOffset >= VGA_FRAMEBUFFER_BYTES - totalWindowBytes}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 rounded border border-gray-700 cursor-pointer"
            >
              Next 256B ▶
            </button>
          </div>
        </div>

        {/* 16-Row Hex Window */}
        <div className="bg-black/85 p-3 rounded-lg border border-gray-800 overflow-x-auto text-[11px] font-mono leading-relaxed space-y-1">
          {Array.from({ length: rowsToShow }).map((_, rIdx) => {
            const rowOffset = currentOffset + rIdx * bytesPerRow;
            if (rowOffset >= VGA_FRAMEBUFFER_BYTES) return null;

            const rowBytes = Array.from(vram.subarray(rowOffset, rowOffset + bytesPerRow));
            const y = Math.floor(rowOffset / VGA_WIDTH);
            const x = rowOffset % VGA_WIDTH;

            return (
              <div key={rIdx} className="flex items-center justify-between hover:bg-gray-900/60 px-1 py-0.5 rounded">
                {/* Segment:Offset and Coord */}
                <div className="flex items-center gap-2 text-gray-500 mr-2 shrink-0">
                  <span className="text-cyan-400 font-bold">
                    A000:{rowOffset.toString(16).toUpperCase().padStart(4, '0')}
                  </span>
                  <span className="text-[10px] text-gray-600 hidden sm:inline">
                    ({x},{y})
                  </span>
                </div>

                {/* 16 Hex Bytes with Swatches */}
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {rowBytes.map((byteVal, bIdx) => {
                    const col = palette[byteVal] || palette[0];
                    return (
                      <span
                        key={bIdx}
                        className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-gray-800 cursor-pointer transition"
                        title={`Offset: 0x${(rowOffset + bIdx).toString(16).toUpperCase().padStart(4, '0')} | Val: ${byteVal} | ${col.hex}`}
                      >
                        <span
                          className="w-2 h-2 rounded-xs border border-white/20 shrink-0"
                          style={{ backgroundColor: col.hex }}
                        />
                        <span className="text-emerald-400 font-semibold">
                          {byteVal.toString(16).toUpperCase().padStart(2, '0')}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
