import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Trash2, HelpCircle } from 'lucide-react';
import { NesRomData } from '../lib/nes/types';
import { DosBuildResult } from '../lib/dos/builder';

interface DosShellConsoleProps {
  rom: NesRomData;
  buildResult: DosBuildResult;
  onNavigateToRunner: () => void;
  onOpenExportModal: () => void;
}

interface CommandLog {
  command?: string;
  output: string[];
}

export const DosShellConsole: React.FC<DosShellConsoleProps> = ({
  rom,
  buildResult,
  onNavigateToRunner,
  onOpenExportModal,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<CommandLog[]>([
    {
      output: [
        'Starting MS-DOS 6.22...',
        'HIMEM: DOS XMS Driver Loaded.',
        'VESA / VGA BIOS Extension 2.0 Installed.',
        'NES to MS-DOS Mode 13h Blitter Environment Ready.',
        'Type "HELP" or "DIR" to begin.',
        '',
      ],
    },
  ]);

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const executeCommand = (cmd: string) => {
    const trimmed = cmd.trim().toUpperCase();
    const parts = trimmed.split(/\s+/);
    const mainCmd = parts[0] || '';
    const arg = parts[1] || '';

    const newLog: CommandLog = { command: `C:\\NES> ${cmd}`, output: [] };

    switch (mainCmd) {
      case 'HELP':
        newLog.output = [
          'MS-DOS Mode 13h Blitter Available Commands:',
          '  DIR           - List directory contents (ROM, EXE, COM)',
          '  VER           - Display MS-DOS operating system version',
          '  TYPE <file>   - Display contents of text file (e.g. TYPE HEADER.TXT)',
          '  DEBUG         - Launch MS-DOS 16-bit real-mode debugger',
          '  NES2EXE       - Rebuild and package DOS MZ Executable',
          '  RUN / MODE13H - Launch 320x200 8-bit CRT display',
          '  EXPORT        - Open binary download modal',
          '  CLS           - Clear the MS-DOS screen',
          '  HELP          - Display this help message',
        ];
        break;

      case 'VER':
        newLog.output = [
          'MS-DOS Version 6.22 (Revision A)',
          'Copyright (C) Microsoft Corp 1981-1994. All rights reserved.',
          'Mode 13h VGA 320x200 256-Color Blitter Engine Active.',
        ];
        break;

      case 'CLS':
        setHistory([]);
        return;

      case 'DIR':
        newLog.output = [
          ' Volume in drive C is DOS_NES_13H',
          ' Volume Serial Number is 1337-BEEF',
          ' Directory of C:\\NES',
          '',
          `.              <DIR>        10-01-26  12:00p`,
          `..             <DIR>        10-01-26  12:00p`,
          `${rom.fileName.padEnd(12, ' ')}  ${rom.fileSizeBytes.toString().padStart(8, ' ')}  10-01-26  12:00p`,
          `GAME.EXE       ${buildResult.fileSizeBytes.toString().padStart(8, ' ')}  10-01-26  12:01p`,
          `GAME.COM       ${buildResult.comBytes.length.toString().padStart(8, ' ')}  10-01-26  12:01p`,
          `HEADER.TXT          512  10-01-26  12:00p`,
          `SCREEN.BIN        64000  10-01-26  12:01p`,
          `         5 file(s)     ${(rom.fileSizeBytes + buildResult.fileSizeBytes + 64512).toLocaleString()} bytes`,
          `         2 dir(s)     604,160 bytes free (Conventional RAM)`,
        ];
        break;

      case 'TYPE':
        if (arg === 'HEADER.TXT' || arg === 'HEADER') {
          newLog.output = [
            '--- NES & DOS MZ HEADER DUMP ---',
            `ROM File: ${rom.fileName}`,
            `PRG ROM: ${rom.header.prgRomSizeKB} KB | CHR ROM: ${rom.header.chrRomSizeKB} KB`,
            `Mapper: ${rom.header.mapper} | Mirroring: ${rom.header.mirroring}`,
            `DOS MZ Signature: 0x5A4D ('MZ')`,
            `DOS Pages (512B): ${buildResult.pages512} | Remainder: ${buildResult.remainderBytes} bytes`,
            `Entry Point: ${buildResult.entryPointHex}`,
            `VGA DAC Port 0x3C8/0x3C9 | Video Segment: 0xA000:0000`,
          ];
        } else {
          newLog.output = [`File not found - ${arg || 'filename'}`];
        }
        break;

      case 'DEBUG':
        newLog.output = [
          '-r',
          `AX=0013  BX=0000  CX=7D00  DX=03C9  SP=0800  BP=0000  SI=0040  DI=0000`,
          `DS=1240  ES=A000  SS=1240  CS=1240  IP=0000   NV UP EI PL NZ NA PO NC`,
          `1240:0000 B81300        MOV     AX,0013`,
          `1240:0003 CD10          INT     10`,
          `1240:0005 BAC803        MOV     DX,03C8`,
          `1240:0008 30C0          XOR     AL,AL`,
          `1240:000A EE            OUT     DX,AL`,
          `-q`,
        ];
        break;

      case 'NES2EXE':
      case 'BUILD':
        newLog.output = [
          'NES to MS-DOS Executable Builder v1.0',
          `Assembling MZ Header (64 bytes)... OK`,
          `Compiling 16-bit x86 Mode 13h launcher... OK`,
          `Encoding 768-byte 6-bit DAC palette... OK`,
          `Encoding 64,000-byte 8-bit framebuffer... OK`,
          `Output file GAME.EXE created (${buildResult.fileSizeBytes} bytes).`,
        ];
        break;

      case 'RUN':
      case 'MODE13H':
      case 'PLAY':
        newLog.output = ['Switching to VGA Mode 13h (320x200 256 colors)...'];
        setTimeout(onNavigateToRunner, 350);
        break;

      case 'EXPORT':
      case 'DOWNLOAD':
        newLog.output = ['Opening MS-DOS Export dialog...'];
        setTimeout(onOpenExportModal, 200);
        break;

      case '':
        newLog.output = [];
        break;

      default:
        newLog.output = [`Bad command or file name: "${cmd}"`];
        break;
    }

    setHistory((prev) => [...prev, newLog]);
    setInputVal('');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      executeCommand(inputVal);
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Top Banner */}
      <div className="bg-[#161c27] border border-gray-700/80 p-3.5 rounded-lg flex flex-wrap items-center justify-between gap-3 shadow">
        <div>
          <div className="flex items-center gap-2 text-base font-bold text-emerald-400">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <span>MS-DOS 6.22 Command Prompt (C:\NES&gt;)</span>
          </div>
          <p className="text-gray-400 mt-1 text-xs">
            Authentic DOS shell environment. Execute COMMAND.COM utilities, debug binaries, or launch Mode 13h.
          </p>
        </div>

        {/* Quick Commands Chips */}
        <div className="flex items-center flex-wrap gap-1.5">
          {['DIR', 'VER', 'TYPE HEADER.TXT', 'DEBUG', 'NES2EXE', 'RUN', 'CLS'].map((cmd) => (
            <button
              key={cmd}
              onClick={() => executeCommand(cmd)}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded text-[11px] cursor-pointer transition"
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal Window */}
      <div className="bg-black/95 border-2 border-gray-800 rounded-lg p-4 shadow-2xl min-h-[420px] flex flex-col justify-between">
        {/* Scrollable Output Stream */}
        <div className="overflow-y-auto max-h-[380px] space-y-1 text-gray-200 text-xs font-mono">
          {history.map((h, i) => (
            <div key={i} className="space-y-0.5">
              {h.command && <div className="text-amber-400 font-bold">{h.command}</div>}
              {h.output.map((line, li) => (
                <div key={li} className="text-emerald-400 leading-snug">
                  {line}
                </div>
              ))}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {/* Command Line Input */}
        <form onSubmit={handleFormSubmit} className="mt-3 flex items-center gap-2 pt-2 border-t border-gray-800">
          <span className="text-amber-400 font-bold shrink-0">C:\NES&gt;</span>
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Type DOS command (e.g. DIR, TYPE HEADER.TXT, RUN)..."
            className="flex-1 bg-transparent text-emerald-400 font-bold focus:outline-none placeholder:text-gray-600 text-xs"
            autoFocus
          />
          <button
            type="submit"
            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded cursor-pointer font-bold transition flex items-center gap-1"
          >
            <Send className="w-3.5 h-3.5" />
            <span>EXEC</span>
          </button>
        </form>
      </div>
    </div>
  );
};
