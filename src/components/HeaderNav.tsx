import React, { useRef } from 'react';
import {
  Download,
  FolderOpen,
  Volume2,
  VolumeX,
  Monitor,
  Terminal,
  Cpu,
  Layers,
  FileCode,
  Grid3X3,
  HelpCircle
} from 'lucide-react';
import { NesRomData } from '../lib/nes/types';
import { SampleRomOption } from '../lib/nes/sampleRoms';
import { retroAudio } from '../lib/emulator/apu';

interface HeaderNavProps {
  currentRom: NesRomData;
  sampleRoms: SampleRomOption[];
  onSelectSample: (rom: NesRomData) => void;
  onFileUpload: (file: File) => void;
  onOpenExportModal: () => void;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentRom,
  sampleRoms,
  onSelectSample,
  onFileUpload,
  onOpenExportModal,
  activeTab,
  onTabChange,
  isMuted,
  onToggleMute,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
      e.target.value = '';
    }
  };

  const navTabs = [
    { id: 'crt_runner', label: 'CRT Monitor', icon: Monitor },
    { id: 'mz_header', label: 'MS-DOS MZ Header', icon: Cpu },
    { id: 'nes_header', label: 'iNES Header', icon: Layers },
    { id: 'chr_tiles', label: 'CHR Tiles (2bpp)', icon: Grid3X3 },
    { id: 'vga_dac', label: 'VGA DAC Palette', icon: Layers },
    { id: 'vram_hex', label: '0xA000 VRAM', icon: FileCode },
    { id: 'dos_code', label: 'x86 ASM & C Source', icon: FileCode },
    { id: 'dos_cli', label: 'MS-DOS Shell', icon: Terminal },
  ];

  return (
    <header className="bg-[#121620] border-b border-[#2d3748] text-gray-200 select-none sticky top-0 z-40 shadow-lg">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 bg-[#1e2736] border border-[#3b82f6]/40 rounded shadow-inner">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-['Press_Start_2P'] text-[10px] text-amber-300 tracking-wider">
              NES→DOS 13h
            </span>
          </div>
          <div className="hidden md:flex flex-col">
            <span className="text-xs font-semibold text-gray-200 tracking-wide font-mono">
              MS-DOS MZ Executable Blitter Suite
            </span>
            <span className="text-[10px] text-gray-400 font-mono">
              8-Bit 320x200 VGA Mode 13h • Linear 0xA0000 • 256-Color DAC
            </span>
          </div>
        </div>

        {/* ROM Selector & Upload */}
        <div className="flex items-center flex-wrap gap-2">
          {/* ROM Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#1a2233] border border-gray-700 rounded px-2 py-1 text-xs font-mono">
            <span className="text-gray-400 hidden sm:inline">ROM:</span>
            <select
              value={currentRom.fileName}
              onChange={(e) => {
                const found = sampleRoms.find((s) => s.fileName === e.target.value);
                if (found) onSelectSample(found.romData);
              }}
              className="bg-transparent text-amber-300 font-bold focus:outline-none cursor-pointer text-xs"
            >
              {sampleRoms.map((s) => (
                <option key={s.id} value={s.fileName} className="bg-gray-900 text-white">
                  {s.fileName} ({s.title})
                </option>
              ))}
              {!sampleRoms.some((s) => s.fileName === currentRom.fileName) && (
                <option value={currentRom.fileName} className="bg-gray-900 text-white">
                  {currentRom.fileName} (Custom)
                </option>
              )}
            </select>
          </div>

          {/* Upload Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".nes,.bin,.rom"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-[#232f48] hover:bg-[#2c3d5f] text-gray-200 border border-gray-600 rounded transition cursor-pointer"
            title="Load custom .nes ROM file"
          >
            <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Load .NES</span>
          </button>

          {/* Audio Mute Toggle */}
          <button
            onClick={() => {
              onToggleMute();
              retroAudio.isMuted = !isMuted;
            }}
            className={`p-1.5 rounded border text-xs transition cursor-pointer ${
              isMuted
                ? 'bg-red-950/60 border-red-700/60 text-red-400'
                : 'bg-[#1e2736] border-gray-600 text-emerald-400'
            }`}
            title={isMuted ? 'Unmute 2A03 / PC Speaker Audio' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Export .EXE Button */}
          <button
            onClick={onOpenExportModal}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded shadow border border-emerald-400/50 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export DOS .EXE</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 flex items-center overflow-x-auto border-t border-[#1e2736] scrollbar-thin">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono whitespace-nowrap transition cursor-pointer border-b-2 ${
                isActive
                  ? 'border-amber-400 text-amber-300 font-bold bg-[#1a2333]'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-[#151c28]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-gray-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
