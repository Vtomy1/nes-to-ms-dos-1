import React from 'react';
import { Layers, Database, Shield, Zap, FileCode, CheckCircle2, XCircle } from 'lucide-react';
import { NesRomData } from '../lib/nes/types';
import { getMapperDescription } from '../lib/nes/parser';

interface NesHeaderInspectorProps {
  rom: NesRomData;
}

export const NesHeaderInspector: React.FC<NesHeaderInspectorProps> = ({ rom }) => {
  const h = rom.header;
  const rawBytes = Array.from(h.raw);
  const mapperDesc = getMapperDescription(h.mapper);

  // Bitfield flags in Byte 6
  const flag6 = rawBytes[6] || 0;
  const bit6_mirroring = Boolean(flag6 & 0x01);
  const bit6_battery = Boolean(flag6 & 0x02);
  const bit6_trainer = Boolean(flag6 & 0x04);
  const bit6_fourScreen = Boolean(flag6 & 0x08);
  const bit6_lowerMapper = (flag6 >> 4) & 0x0F;

  // Bitfield flags in Byte 7
  const flag7 = rawBytes[7] || 0;
  const bit7_vsUnisystem = Boolean(flag7 & 0x01);
  const bit7_playChoice = Boolean(flag7 & 0x02);
  const bit7_nes2Format = (flag7 & 0x0C) === 0x08;
  const bit7_upperMapper = flag7 & 0xF0;

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Top Banner */}
      <div className="bg-[#161c27] border border-gray-700/80 p-4 rounded-lg flex flex-wrap items-center justify-between gap-3 shadow">
        <div>
          <div className="flex items-center gap-2 text-base font-bold text-emerald-300">
            <Layers className="w-5 h-5 text-emerald-400" />
            <span>iNES 1.0 & NES 2.0 ROM Header Breakdown</span>
          </div>
          <p className="text-gray-400 mt-1 text-xs">
            Cartridge memory map specifications, mapper ASIC configuration, and CHR/PRG bank sizing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 font-bold rounded">
            {h.isNes2 ? 'NES 2.0 Extended' : 'iNES 1.0 Standard'}
          </span>
          <span className="px-2.5 py-1 bg-blue-950/80 border border-blue-600/60 text-blue-300 font-bold rounded">
            Mapper {h.mapper}
          </span>
        </div>
      </div>

      {/* 16-Byte Header Hex Bar */}
      <div className="bg-[#151c27] border border-gray-700/80 rounded-lg p-3 shadow">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-700 text-cyan-300 font-bold">
          <span>16-Byte Header Stream (0x0000 - 0x000F)</span>
          <span className="text-[10px] text-gray-400">Magic: 'NES\x1A' (0x4E 45 53 1A)</span>
        </div>

        <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 text-center text-[11px]">
          {rawBytes.map((b, idx) => {
            const isMagic = idx < 4;
            const isPrg = idx === 4;
            const isChr = idx === 5;
            const isFlag6 = idx === 6;
            const isFlag7 = idx === 7;

            return (
              <div
                key={idx}
                className={`p-1.5 rounded border flex flex-col items-center justify-center ${
                  isMagic
                    ? 'bg-amber-950/60 border-amber-600/70 text-amber-300'
                    : isPrg
                    ? 'bg-blue-950/60 border-blue-600/70 text-blue-300'
                    : isChr
                    ? 'bg-purple-950/60 border-purple-600/70 text-purple-300'
                    : isFlag6 || isFlag7
                    ? 'bg-emerald-950/60 border-emerald-600/70 text-emerald-300'
                    : 'bg-gray-900 border-gray-800 text-gray-400'
                }`}
              >
                <span className="text-[9px] text-gray-500 font-mono">+{idx}</span>
                <span className="font-bold text-xs mt-0.5">
                  {b.toString(16).toUpperCase().padStart(2, '0')}
                </span>
                <span className="text-[8px] text-gray-400 truncate max-w-full">
                  {idx < 4 ? String.fromCharCode(b) : idx === 4 ? 'PRG' : idx === 5 ? 'CHR' : `F${idx}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-Column Specification Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Memory Banks & Mapper */}
        <div className="bg-[#151c27] border border-gray-700/80 rounded-lg p-3 shadow space-y-3">
          <div className="text-amber-300 font-bold border-b border-gray-700 pb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>Cartridge Memory & Hardware</span>
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2 bg-gray-900 rounded border border-gray-800">
              <span className="text-gray-400">Mapper ID:</span>
              <span className="text-amber-300 font-bold">
                {h.mapper} (Submapper: {h.submapper})
              </span>
            </div>
            <div className="p-2 bg-gray-900/80 rounded border border-gray-800 text-gray-300 text-[11px]">
              <span className="text-gray-400 block mb-0.5 font-bold">ASIC Specification:</span>
              <span>{mapperDesc}</span>
            </div>

            <div className="flex justify-between p-2 bg-gray-900 rounded border border-gray-800">
              <span className="text-gray-400">PRG ROM Size:</span>
              <span className="text-blue-300 font-bold">
                {h.prgRomSizeKB} KB ({h.prgBanks16K} × 16KB banks)
              </span>
            </div>

            <div className="flex justify-between p-2 bg-gray-900 rounded border border-gray-800">
              <span className="text-gray-400">CHR ROM / RAM Size:</span>
              <span className="text-purple-300 font-bold">
                {h.chrRomSizeKB > 0
                  ? `${h.chrRomSizeKB} KB (${h.chrBanks8K} × 8KB banks)`
                  : '8 KB (CHR-RAM Mode)'}
              </span>
            </div>

            <div className="flex justify-between p-2 bg-gray-900 rounded border border-gray-800">
              <span className="text-gray-400">Nametable Mirroring:</span>
              <span className="text-emerald-400 font-bold">{h.mirroring}</span>
            </div>

            <div className="flex justify-between p-2 bg-gray-900 rounded border border-gray-800">
              <span className="text-gray-400">TV Video Standard:</span>
              <span className="text-yellow-300 font-bold">
                {h.tvSystem} (60Hz / 262 scanlines)
              </span>
            </div>

            <div className="flex justify-between p-2 bg-gray-900 rounded border border-gray-800">
              <span className="text-gray-400">Total File Size:</span>
              <span className="text-gray-200">
                {rom.fileSizeBytes.toLocaleString()} bytes ({(rom.fileSizeBytes / 1024).toFixed(1)} KB)
              </span>
            </div>

            <div className="flex justify-between p-2 bg-gray-900 rounded border border-gray-800">
              <span className="text-gray-400">CRC32 / Hash:</span>
              <span className="text-cyan-300 font-mono font-bold">{rom.crc32}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Bitfield Flags 6 & 7 Visualizer */}
        <div className="bg-[#151c27] border border-gray-700/80 rounded-lg p-3 shadow space-y-3">
          <div className="text-cyan-300 font-bold border-b border-gray-700 pb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>Flag Bitfields (Byte 6 & Byte 7)</span>
            </span>
          </div>

          {/* Byte 6 Bitfields */}
          <div className="space-y-1.5">
            <div className="text-emerald-400 font-bold text-[11px]">
              Flags 6: 0x{flag6.toString(16).toUpperCase().padStart(2, '0')} (0b
              {flag6.toString(2).padStart(8, '0')})
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between p-1.5 bg-gray-900 rounded border border-gray-800">
                <span>Bit 0: Mirroring (0=Horiz, 1=Vert)</span>
                <span className="font-bold text-amber-300">
                  {bit6_mirroring ? 'Vertical (1)' : 'Horizontal (0)'}
                </span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-gray-900 rounded border border-gray-800">
                <span>Bit 1: Battery-Backed PRG RAM ($6000-$7FFF)</span>
                <span className="flex items-center gap-1">
                  {bit6_battery ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Yes
                    </span>
                  ) : (
                    <span className="text-gray-500 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> No
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-gray-900 rounded border border-gray-800">
                <span>Bit 2: 512-Byte Trainer ($7000-$71FF)</span>
                <span className="flex items-center gap-1">
                  {bit6_trainer ? (
                    <span className="text-amber-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Present
                    </span>
                  ) : (
                    <span className="text-gray-500 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> None
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-gray-900 rounded border border-gray-800">
                <span>Bit 3: Four-Screen VRAM Layout</span>
                <span className="text-gray-400">{bit6_fourScreen ? 'Active' : 'Disabled'}</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-gray-900 rounded border border-gray-800">
                <span>Bits 4-7: Lower 4 bits of Mapper ID</span>
                <span className="text-cyan-300 font-bold">{bit6_lowerMapper}</span>
              </div>
            </div>
          </div>

          {/* Byte 7 Bitfields */}
          <div className="space-y-1.5 pt-2 border-t border-gray-800">
            <div className="text-purple-400 font-bold text-[11px]">
              Flags 7: 0x{flag7.toString(16).toUpperCase().padStart(2, '0')} (0b
              {flag7.toString(2).padStart(8, '0')})
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between p-1.5 bg-gray-900 rounded border border-gray-800">
                <span>Bit 0: VS Unisystem Arcade Mode</span>
                <span className="text-gray-400">{bit7_vsUnisystem ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-gray-900 rounded border border-gray-800">
                <span>Bit 1: PlayChoice-10 Arcade Mode</span>
                <span className="text-gray-400">{bit7_playChoice ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-gray-900 rounded border border-gray-800">
                <span>Bits 2-3: NES 2.0 Identifier (0b10)</span>
                <span className="text-emerald-400 font-bold">
                  {bit7_nes2Format ? 'NES 2.0 Format' : 'iNES 1.0 Format'}
                </span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-gray-900 rounded border border-gray-800">
                <span>Bits 4-7: Upper 4 bits of Mapper ID</span>
                <span className="text-cyan-300 font-bold">{bit7_upperMapper >> 4}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
