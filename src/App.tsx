/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { HeaderNav } from './components/HeaderNav';
import { DosCrtMonitor } from './components/DosCrtMonitor';
import { MzHeaderInspector } from './components/MzHeaderInspector';
import { NesHeaderInspector } from './components/NesHeaderInspector';
import { ChrTileViewer } from './components/ChrTileViewer';
import { VgaPaletteInspector } from './components/VgaPaletteInspector';
import { VgaMemoryViewer } from './components/VgaMemoryViewer';
import { CodeSourceViewer } from './components/CodeSourceViewer';
import { DosShellConsole } from './components/DosShellConsole';
import { ExportModal } from './components/ExportModal';

import { getSampleRoms } from './lib/nes/sampleRoms';
import { parseNesRom } from './lib/nes/parser';
import { NesRunner } from './lib/emulator/nesRunner';
import { buildDosExecutable, DosBuildResult } from './lib/dos/builder';
import { NesRomData } from './lib/nes/types';
import { retroAudio } from './lib/emulator/apu';

export default function App() {
  const sampleRoms = useMemo(() => getSampleRoms(), []);

  // Default to the dedicated Mode 13h test cartridge
  const [currentRom, setCurrentRom] = useState<NesRomData>(() => sampleRoms[0].romData);
  const [activeTab, setActiveTab] = useState<string>('crt_runner');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize persistent runner for current ROM
  const runner = useMemo(() => {
    return new NesRunner(currentRom);
  }, [currentRom]);

  // Build the DOS Executable result whenever ROM or buffer initializes
  const [buildResult, setBuildResult] = useState<DosBuildResult>(() =>
    buildDosExecutable(runner.vgaBuffer, currentRom)
  );

  // Keep build result updated when ROM changes
  useEffect(() => {
    setBuildResult(buildDosExecutable(runner.vgaBuffer, currentRom));
  }, [runner, currentRom]);

  // Handle ROM switching from samples
  const handleSelectSample = (rom: NesRomData) => {
    setErrorMessage(null);
    setCurrentRom(rom);
    runner.setRom(rom);
    retroAudio.playSoundEffect('select');
  };

  // Handle custom user .nes ROM upload
  const handleFileUpload = (file: File) => {
    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) return;
        const bytes = new Uint8Array(buffer);
        const parsed = parseNesRom(bytes, file.name);
        setCurrentRom(parsed);
        runner.setRom(parsed);
        retroAudio.playSoundEffect('score');
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to parse NES ROM file.');
        retroAudio.playSoundEffect('error');
      }
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read file from disk.');
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-100 flex flex-col font-mono selection:bg-amber-400 selection:text-black">
      {/* Top Header Navigation */}
      <HeaderNav
        currentRom={currentRom}
        sampleRoms={sampleRoms}
        onSelectSample={handleSelectSample}
        onFileUpload={handleFileUpload}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted((m) => !m)}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-4 space-y-4">
        {/* Error Toast if invalid ROM */}
        {errorMessage && (
          <div className="p-3 bg-red-950/80 border border-red-700 text-red-200 rounded-lg text-xs flex items-center justify-between shadow">
            <span>⚠️ {errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-white font-bold ml-3 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab 1: CRT Monitor & Live Runner */}
        {activeTab === 'crt_runner' && (
          <DosCrtMonitor
            runner={runner}
            onOpenMzInspector={() => setActiveTab('mz_header')}
          />
        )}

        {/* Tab 2: MS-DOS MZ Header Inspector */}
        {activeTab === 'mz_header' && <MzHeaderInspector buildResult={buildResult} />}

        {/* Tab 3: iNES ROM Header Inspector */}
        {activeTab === 'nes_header' && <NesHeaderInspector rom={currentRom} />}

        {/* Tab 4: CHR 2bpp Pattern Tables */}
        {activeTab === 'chr_tiles' && <ChrTileViewer rom={currentRom} />}

        {/* Tab 5: VGA Mode 13h DAC Palette */}
        {activeTab === 'vga_dac' && <VgaPaletteInspector vgaBuffer={runner.vgaBuffer} />}

        {/* Tab 6: 0xA000 VRAM Memory Dump */}
        {activeTab === 'vram_hex' && <VgaMemoryViewer vgaBuffer={runner.vgaBuffer} />}

        {/* Tab 7: x86 ASM & C Source */}
        {activeTab === 'dos_code' && (
          <CodeSourceViewer
            rom={currentRom}
            vgaBuffer={runner.vgaBuffer}
            buildResult={buildResult}
          />
        )}

        {/* Tab 8: MS-DOS Interactive CLI Prompt */}
        {activeTab === 'dos_cli' && (
          <DosShellConsole
            rom={currentRom}
            buildResult={buildResult}
            onNavigateToRunner={() => setActiveTab('crt_runner')}
            onOpenExportModal={() => setIsExportModalOpen(true)}
          />
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="bg-[#121620] border-t border-gray-800 text-[10px] text-gray-400 px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>MS-DOS 16-BIT REAL MODE • VGA MODE 13H (320x200, 256 COLORS)</span>
        </div>
        <div className="flex items-center gap-3">
          <span>MZ SIGNATURE: 0x5A4D ('MZ')</span>
          <span className="text-gray-600">|</span>
          <span>VIDEO SEGMENT: 0xA000:0000</span>
          <span className="text-gray-600">|</span>
          <span>64,000 BYTES LINEAR VRAM</span>
        </div>
      </footer>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        buildResult={buildResult}
        rom={currentRom}
        vgaBuffer={runner.vgaBuffer}
      />
    </div>
  );
}
