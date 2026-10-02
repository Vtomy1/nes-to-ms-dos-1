import React, { useState, useEffect, useRef } from 'react';
import { Grid3X3, Eye, ZoomIn, Palette } from 'lucide-react';
import { NesRomData } from '../lib/nes/types';
import { decodePatternTable, renderPatternTableToRgba, DecodedTile } from '../lib/nes/chr';
import { NES_MASTER_PALETTE_HEX } from '../lib/nes/palette';

interface ChrTileViewerProps {
  rom: NesRomData;
}

export const ChrTileViewer: React.FC<ChrTileViewerProps> = ({ rom }) => {
  const canvasBank0Ref = useRef<HTMLCanvasElement>(null);
  const canvasBank1Ref = useRef<HTMLCanvasElement>(null);

  const [selectedBank, setSelectedBank] = useState<0 | 1>(0);
  const [selectedTileIndex, setSelectedTileIndex] = useState<number>(0);
  const [showGrid, setShowGrid] = useState(true);
  const [paletteChoice, setPaletteChoice] = useState<number>(0);

  // 4 Standard Sub-Palettes
  const subPalettes: [number, number, number, number][] = [
    [0x0F, 0x16, 0x27, 0x30], // Classic Red/Orange
    [0x0F, 0x02, 0x12, 0x22], // Blue/Cyan
    [0x0F, 0x0A, 0x1A, 0x2A], // Green/Forest
    [0x0F, 0x10, 0x20, 0x30], // Grayscale
  ];

  const currentPalette = subPalettes[paletteChoice];

  // Decode CHR ROM
  const chrBytes = rom.chrRom;
  const bank0Bytes = chrBytes.subarray(0, 4096);
  const bank1Bytes = chrBytes.length >= 8192 ? chrBytes.subarray(4096, 8192) : new Uint8Array(4096);

  const bank0Tiles: DecodedTile[] = decodePatternTable(bank0Bytes);
  const bank1Tiles: DecodedTile[] = decodePatternTable(bank1Bytes);

  // Render Pattern Tables to Canvas
  useEffect(() => {
    const drawBank = (
      canvas: HTMLCanvasElement | null,
      tiles: DecodedTile[]
    ) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rgba = renderPatternTableToRgba(tiles, currentPalette);
      const imgData = ctx.createImageData(128, 128);
      imgData.data.set(rgba);
      ctx.putImageData(imgData, 0, 0);

      // Draw Grid if enabled
      if (showGrid) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 128; i += 8) {
          ctx.beginPath();
          ctx.moveTo(i + 0.5, 0);
          ctx.lineTo(i + 0.5, 128);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(0, i + 0.5);
          ctx.lineTo(128, i + 0.5);
          ctx.stroke();
        }
      }
    };

    drawBank(canvasBank0Ref.current, bank0Tiles);
    drawBank(canvasBank1Ref.current, bank1Tiles);
  }, [rom, currentPalette, showGrid]);

  const activeTiles = selectedBank === 0 ? bank0Tiles : bank1Tiles;
  const activeTile = activeTiles[selectedTileIndex] || activeTiles[0];

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>, bank: 0 | 1) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scale = 128 / rect.width;
    const x = Math.floor((e.clientX - rect.left) * scale);
    const y = Math.floor((e.clientY - rect.top) * scale);

    const tileCol = Math.floor(x / 8);
    const tileRow = Math.floor(y / 8);
    const tileIdx = tileRow * 16 + tileCol;

    setSelectedBank(bank);
    setSelectedTileIndex(tileIdx);
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Top Banner */}
      <div className="bg-[#161c27] border border-gray-700/80 p-3.5 rounded-lg flex flex-wrap items-center justify-between gap-3 shadow">
        <div>
          <div className="flex items-center gap-2 text-base font-bold text-amber-300">
            <Grid3X3 className="w-5 h-5 text-amber-400" />
            <span>NES CHR 2bpp Pattern Tables & Bitplane Decoder</span>
          </div>
          <p className="text-gray-400 mt-1 text-xs">
            Interleaved 2-bit bitplane tile graphics (16 bytes per 8x8 tile) converted to 8-bit VGA Mode 13h.
          </p>
        </div>

        {/* Palette Selector & Grid Toggle */}
        <div className="flex items-center gap-2">
          {/* Sub-palette selection */}
          <div className="flex items-center gap-1 bg-[#10141e] border border-gray-700 p-1 rounded">
            <Palette className="w-3.5 h-3.5 text-gray-400 mr-1" />
            {subPalettes.map((p, idx) => (
              <button
                key={idx}
                onClick={() => setPaletteChoice(idx)}
                className={`flex gap-0.5 p-1 rounded cursor-pointer transition border ${
                  paletteChoice === idx ? 'border-amber-400 bg-amber-950/40' : 'border-transparent'
                }`}
                title={`Sub-palette ${idx}`}
              >
                {p.map((c, ci) => (
                  <span
                    key={ci}
                    className="w-2.5 h-2.5 rounded-xs"
                    style={{ backgroundColor: NES_MASTER_PALETTE_HEX[c] }}
                  />
                ))}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2.5 py-1.5 rounded border transition cursor-pointer ${
              showGrid
                ? 'bg-blue-950/80 border-blue-600 text-blue-300'
                : 'bg-gray-800 border-gray-700 text-gray-400'
            }`}
          >
            Grid: {showGrid ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Main Grid: Pattern Tables and Detailed Tile Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Pattern Table 0 (Left 4KB) */}
        <div className="lg:col-span-4 bg-[#151c27] border border-gray-700/80 rounded-lg p-3 shadow space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-gray-700 text-blue-300 font-bold">
            <span>Pattern Table 0 ($0000-$0FFF)</span>
            <span className="text-[10px] text-gray-400">256 Tiles (128x128)</span>
          </div>

          <div className="flex justify-center bg-black/90 p-2 rounded border border-gray-800">
            <canvas
              ref={canvasBank0Ref}
              width={128}
              height={128}
              onClick={(e) => handleCanvasClick(e, 0)}
              className="w-64 h-64 cursor-pointer image-pixelated border border-gray-700 hover:border-amber-400 transition"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          <div className="text-[10px] text-gray-400 text-center">
            Click any tile to inspect its 2bpp bitplanes
          </div>
        </div>

        {/* Pattern Table 1 (Right 4KB) */}
        <div className="lg:col-span-4 bg-[#151c27] border border-gray-700/80 rounded-lg p-3 shadow space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-gray-700 text-purple-300 font-bold">
            <span>Pattern Table 1 ($1000-$1FFF)</span>
            <span className="text-[10px] text-gray-400">256 Tiles (128x128)</span>
          </div>

          <div className="flex justify-center bg-black/90 p-2 rounded border border-gray-800">
            <canvas
              ref={canvasBank1Ref}
              width={128}
              height={128}
              onClick={(e) => handleCanvasClick(e, 1)}
              className="w-64 h-64 cursor-pointer image-pixelated border border-gray-700 hover:border-amber-400 transition"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          <div className="text-[10px] text-gray-400 text-center">
            Sprites or Background Pattern Bank
          </div>
        </div>

        {/* Selected Tile Bitplane Inspector (Right Col) */}
        <div className="lg:col-span-4 bg-[#151c27] border border-gray-700/80 rounded-lg p-3 shadow space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-gray-700 text-amber-300 font-bold">
            <span className="flex items-center gap-1.5">
              <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
              <span>Tile Inspector (#{selectedTileIndex})</span>
            </span>
            <span className="text-gray-400 text-[10px]">
              Bank {selectedBank} • $
              {(selectedBank * 0x1000 + selectedTileIndex * 16).toString(16).toUpperCase().padStart(4, '0')}
            </span>
          </div>

          {/* 8x8 Zoomed Grid */}
          <div className="flex items-center justify-center gap-4">
            <div className="grid grid-cols-8 gap-0.5 bg-gray-950 p-1.5 rounded border border-gray-700">
              {Array.from(activeTile.pixels).map((pVal, pIdx) => {
                const hexColor = NES_MASTER_PALETTE_HEX[currentPalette[pVal]];
                return (
                  <div
                    key={pIdx}
                    className="w-4 h-4 rounded-xs border border-black/40 flex items-center justify-center text-[8px] font-bold"
                    style={{
                      backgroundColor: hexColor,
                      color: pVal > 1 ? '#000' : '#fff',
                    }}
                    title={`Row ${Math.floor(pIdx / 8)}, Col ${pIdx % 8}: Color ${pVal}`}
                  >
                    {pVal}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2bpp Bitplane Explanation */}
          <div className="space-y-1.5 text-[11px] bg-black/60 p-2.5 rounded border border-gray-800">
            <div className="text-gray-300 font-bold">NES 2bpp Planar Encoding:</div>
            <p className="text-gray-400 text-[10px]">
              Each 8x8 tile is stored as 16 bytes. Bytes 0..7 encode Bitplane 0 (lower bit), and Bytes 8..15
              encode Bitplane 1 (higher bit).
            </p>
            <div className="text-[10px] text-emerald-400 font-mono">
              Pixel Color = (Plane1_Bit &lt;&lt; 1) | Plane0_Bit (0..3)
            </div>
            <div className="text-[10px] text-amber-300 font-mono">
              Mode 13h Blit: Index = SubPalette[Pixel Color] directly written to 0xA000:0000!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
