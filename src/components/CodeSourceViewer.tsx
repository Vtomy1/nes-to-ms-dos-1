import React, { useState } from 'react';
import { FileCode, Copy, Check, Download, Terminal, Cpu } from 'lucide-react';
import { NesRomData } from '../lib/nes/types';
import { VgaMode13hBuffer } from '../lib/vga/mode13h';
import { DosBuildResult } from '../lib/dos/builder';
import {
  generateNasmSource,
  generateTurboCSource,
  generateDebugScript,
} from '../lib/dos/sourceGenerators';

interface CodeSourceViewerProps {
  rom: NesRomData;
  vgaBuffer: VgaMode13hBuffer;
  buildResult: DosBuildResult;
}

export const CodeSourceViewer: React.FC<CodeSourceViewerProps> = ({
  rom,
  vgaBuffer,
  buildResult,
}) => {
  const [activeCodeTab, setActiveCodeTab] = useState<'asm' | 'c' | 'disasm' | 'debug'>('asm');
  const [copied, setCopied] = useState(false);

  const nasmCode = generateNasmSource(rom, vgaBuffer.palette, vgaBuffer.vram);
  const turboCCode = generateTurboCSource(rom);
  const debugScript = generateDebugScript();
  const disasmCode = buildResult.disassemblySnippet;

  const getActiveCode = () => {
    switch (activeCodeTab) {
      case 'asm':
        return { content: nasmCode, filename: 'dos_nes.asm' };
      case 'c':
        return { content: turboCCode, filename: 'dos_nes.c' };
      case 'disasm':
        return { content: disasmCode, filename: 'disassembly.txt' };
      case 'debug':
        return { content: debugScript, filename: 'script.dbg' };
    }
  };

  const current = getActiveCode();

  const handleCopy = () => {
    navigator.clipboard.writeText(current.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([current.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = current.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Top Banner */}
      <div className="bg-[#161c27] border border-gray-700/80 p-3.5 rounded-lg flex flex-wrap items-center justify-between gap-3 shadow">
        <div>
          <div className="flex items-center gap-2 text-base font-bold text-amber-300">
            <FileCode className="w-5 h-5 text-amber-400" />
            <span>Real-Mode MS-DOS Mode 13h Source Code & Disassembly</span>
          </div>
          <p className="text-gray-400 mt-1 text-xs">
            Compilable x86 Real-Mode Assembly, Borland Turbo C, and disassembled instructions for DOSBox / FreeDOS.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#20293a] hover:bg-[#2a374e] text-gray-200 border border-gray-600 rounded cursor-pointer transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Code!' : 'Copy Code'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded cursor-pointer transition border border-blue-500"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download {current.filename}</span>
          </button>
        </div>
      </div>

      {/* Code Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
        <button
          onClick={() => setActiveCodeTab('asm')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition cursor-pointer ${
            activeCodeTab === 'asm'
              ? 'bg-amber-600 text-black font-bold'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>x86 Assembly (.ASM)</span>
        </button>
        <button
          onClick={() => setActiveCodeTab('c')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition cursor-pointer ${
            activeCodeTab === 'c'
              ? 'bg-amber-600 text-black font-bold'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Turbo C / Watcom (.C)</span>
        </button>
        <button
          onClick={() => setActiveCodeTab('disasm')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition cursor-pointer ${
            activeCodeTab === 'disasm'
              ? 'bg-amber-600 text-black font-bold'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>EXE Disassembly</span>
        </button>
        <button
          onClick={() => setActiveCodeTab('debug')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition cursor-pointer ${
            activeCodeTab === 'debug'
              ? 'bg-amber-600 text-black font-bold'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>MS-DOS DEBUG (.DBG)</span>
        </button>
      </div>

      {/* Code Text Area Container */}
      <div className="bg-[#121620] border border-gray-800 rounded-lg p-4 overflow-x-auto shadow-inner">
        <pre className="text-gray-300 font-mono text-[11px] leading-relaxed whitespace-pre selection:bg-amber-500 selection:text-black">
          {current.content}
        </pre>
      </div>
    </div>
  );
};
