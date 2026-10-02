import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Maximize2,
  Tv,
  Settings2,
  Crosshair,
  Volume2,
  Gamepad2,
  Zap,
} from 'lucide-react';
import { NesRunner } from '../lib/emulator/nesRunner';
import { CrtColorMode, ViewportMode, VgaPixelInfo, VGA_WIDTH, VGA_HEIGHT } from '../lib/vga/mode13h';
import { retroAudio } from '../lib/emulator/apu';

interface DosCrtMonitorProps {
  runner: NesRunner;
  onOpenMzInspector: () => void;
}

export const DosCrtMonitor: React.FC<DosCrtMonitorProps> = ({ runner, onOpenMzInspector }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [colorMode, setColorMode] = useState<CrtColorMode>('color_vga');
  const [scanlines, setScanlines] = useState(true);
  const [aspect43, setAspect43] = useState(true);
  const [viewportMode, setViewportMode] = useState<ViewportMode>('centered_crop');
  const [isPlaying, setIsPlaying] = useState(true);
  const [hoverPixel, setHoverPixel] = useState<VgaPixelInfo | null>(null);
  const [showGamepad, setShowGamepad] = useState(true);

  // Sync viewportMode to runner
  useEffect(() => {
    runner.viewportMode = viewportMode;
  }, [runner, viewportMode]);

  // Main animation frame loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      animId = requestAnimationFrame(loop);

      const delta = currentTime - lastTime;
      if (delta >= 1000 / 60) {
        lastTime = currentTime - (delta % (1000 / 60));

        if (isPlaying) {
          runner.updateFrame();
        }

        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            runner.vgaBuffer.renderToCanvas(ctx, colorMode, scanlines);
          }
        }
      }
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [runner, isPlaying, colorMode, scanlines]);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          e.preventDefault();
          runner.handleInput('up', true);
          break;
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          runner.handleInput('down', true);
          break;
        case 'ArrowLeft':
        case 'KeyA':
          e.preventDefault();
          runner.handleInput('left', true);
          break;
        case 'ArrowRight':
        case 'KeyD':
          e.preventDefault();
          runner.handleInput('right', true);
          break;
        case 'KeyZ':
        case 'KeyJ':
          runner.handleInput('a', true);
          break;
        case 'KeyX':
        case 'KeyK':
          runner.handleInput('b', true);
          break;
        case 'Enter':
          runner.handleInput('start', true);
          break;
        case 'ShiftRight':
        case 'ShiftLeft':
          runner.handleInput('select', true);
          break;
        case 'Space':
          e.preventDefault();
          setIsPlaying((p) => !p);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          runner.handleInput('up', false);
          break;
        case 'ArrowDown':
        case 'KeyS':
          runner.handleInput('down', false);
          break;
        case 'ArrowLeft':
        case 'KeyA':
          runner.handleInput('left', false);
          break;
        case 'ArrowRight':
        case 'KeyD':
          runner.handleInput('right', false);
          break;
        case 'KeyZ':
        case 'KeyJ':
          runner.handleInput('a', false);
          break;
        case 'KeyX':
        case 'KeyK':
          runner.handleInput('b', false);
          break;
        case 'Enter':
          runner.handleInput('start', false);
          break;
        case 'ShiftRight':
        case 'ShiftLeft':
          runner.handleInput('select', false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [runner]);

  // Canvas Mouse Move for pixel inspector
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = VGA_WIDTH / rect.width;
    const scaleY = VGA_HEIGHT / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const info = runner.vgaBuffer.getPixelInfo(x, y);
    setHoverPixel(info);
  };

  const handleCanvasMouseLeave = () => {
    setHoverPixel(null);
  };

  const dosRegs = runner.getDosRegisters();

  return (
    <div className="space-y-4">
      {/* Top Monitor Controls & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#161c28] border border-gray-700/80 p-2.5 rounded-lg text-xs font-mono">
        {/* Playback Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded font-bold cursor-pointer transition ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-black'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'PAUSE' : 'RUN'}</span>
          </button>

          <button
            onClick={() => {
              runner.updateFrame();
              const canvas = canvasRef.current;
              if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) runner.vgaBuffer.renderToCanvas(ctx, colorMode, scanlines);
              }
            }}
            disabled={isPlaying}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#20293a] hover:bg-[#2a374e] disabled:opacity-40 text-gray-200 border border-gray-600 rounded cursor-pointer transition"
            title="Step 1 Frame (1/60 sec)"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">STEP</span>
          </button>

          <button
            onClick={() => {
              runner.setRom(runner.rom);
              retroAudio.playSoundEffect('bounce');
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#20293a] hover:bg-[#2a374e] text-gray-200 border border-gray-600 rounded cursor-pointer transition"
            title="Reset Cartridge / Restart"
          >
            <RotateCcw className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">RESET</span>
          </button>
        </div>

        {/* Display Settings */}
        <div className="flex items-center flex-wrap gap-2">
          {/* CRT Color Mode Selector */}
          <div className="flex items-center bg-[#10141e] border border-gray-700 rounded p-0.5">
            <button
              onClick={() => setColorMode('color_vga')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                colorMode === 'color_vga'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              VGA 256c
            </button>
            <button
              onClick={() => setColorMode('amber_crt')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                colorMode === 'amber_crt'
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-amber-500/70 hover:text-amber-400'
              }`}
            >
              Amber CRT
            </button>
            <button
              onClick={() => setColorMode('green_crt')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                colorMode === 'green_crt'
                  ? 'bg-emerald-500 text-black shadow'
                  : 'text-emerald-500/70 hover:text-emerald-400'
              }`}
            >
              Green CRT
            </button>
          </div>

          {/* Viewport Mode */}
          <select
            value={viewportMode}
            onChange={(e) => setViewportMode(e.target.value as ViewportMode)}
            className="bg-[#10141e] text-gray-200 border border-gray-700 rounded px-2 py-1 text-xs cursor-pointer focus:outline-none"
            title="Blitter Viewport Placement in 320x200"
          >
            <option value="centered_crop">NESticle Centered (32px Borders, 256x200)</option>
            <option value="stretched_full">Stretched Full 320x200 (Mode 13h)</option>
            <option value="hud_split">Split View (256x200 + Right DOS HUD)</option>
          </select>

          {/* Scanlines Toggle */}
          <button
            onClick={() => setScanlines(!scanlines)}
            className={`px-2 py-1 border rounded text-[11px] font-semibold transition cursor-pointer ${
              scanlines
                ? 'bg-indigo-950/80 border-indigo-600 text-indigo-300'
                : 'bg-[#10141e] border-gray-700 text-gray-400 hover:text-gray-200'
            }`}
            title="Toggle authentic 50% CRT raster scanlines"
          >
            Scanlines: {scanlines ? 'ON' : 'OFF'}
          </button>

          {/* Aspect 4:3 vs 1:1 Toggle */}
          <button
            onClick={() => setAspect43(!aspect43)}
            className={`px-2 py-1 border rounded text-[11px] font-semibold transition cursor-pointer ${
              aspect43
                ? 'bg-cyan-950/80 border-cyan-600 text-cyan-300'
                : 'bg-[#10141e] border-gray-700 text-gray-400 hover:text-gray-200'
            }`}
            title="Toggle authentic 4:3 CRT stretch vs 1:1 square pixels"
          >
            Aspect: {aspect43 ? '4:3 CRT' : '1:1 Pixel'}
          </button>
        </div>
      </div>

      {/* Main CRT Screen and Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: CRT Monitor (Col 1-8) */}
        <div className="lg:col-span-8 flex flex-col items-center">
          {/* CRT Monitor Outer Bezel */}
          <div
            ref={containerRef}
            className="w-full bg-[#1b202c] p-3 sm:p-5 rounded-2xl border-4 border-[#323c4e] shadow-[0_10px_35px_rgba(0,0,0,0.85)] relative"
          >
            {/* Monitor Brand Badge */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-700/60 text-[10px] font-mono text-gray-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                <span className="font-bold tracking-widest text-gray-300">
                  IBM COLOR DISPLAY 5153 • VGA MODE 13H
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-emerald-400">320 × 200 • 8-BIT • 70Hz</span>
                <span className="text-gray-400">FRAME: {runner.frameCount}</span>
              </div>
            </div>

            {/* CRT Tube Frame with Curved Vignette */}
            <div className="relative bg-black rounded-lg overflow-hidden flex items-center justify-center border-2 border-gray-950 shadow-inner group">
              <canvas
                ref={canvasRef}
                width={VGA_WIDTH}
                height={VGA_HEIGHT}
                onMouseMove={handleCanvasMouseMove}
                onMouseLeave={handleCanvasMouseLeave}
                className={`image-pixelated block cursor-crosshair transition-all duration-150 ${
                  aspect43
                    ? 'w-full max-w-[640px] aspect-[4/3]'
                    : 'w-full max-w-[640px] aspect-[320/200]'
                }`}
                style={{
                  imageRendering: 'pixelated',
                }}
              />

              {/* Glass Reflection & Curved CRT Vignette Overlay */}
              <div
                className="absolute inset-0 pointer-events-none rounded-lg"
                style={{
                  background:
                    'radial-gradient(ellipse at center, rgba(0,0,0,0) 65%, rgba(0,0,0,0.45) 90%, rgba(0,0,0,0.75) 100%)',
                  boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6)',
                }}
              />

              {/* Hover Pixel Inspection Crosshair / Badge */}
              {hoverPixel && (
                <div className="absolute top-2 left-2 z-20 pointer-events-none bg-black/90 text-white font-mono text-[11px] p-2 rounded border border-amber-400/80 shadow-lg space-y-0.5 backdrop-blur-sm">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      VRAM [X: {hoverPixel.x}, Y: {hoverPixel.y}]
                    </span>
                  </div>
                  <div>
                    Offset: <span className="text-cyan-300">0xA000:{hoverPixel.hexOffset}</span> (
                    {hoverPixel.linearOffset})
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Index: #{hoverPixel.paletteIndex}</span>
                    <span
                      className="inline-block w-3 h-3 rounded-xs border border-white"
                      style={{ backgroundColor: hoverPixel.hexColor }}
                    />
                    <span className="text-emerald-400">{hoverPixel.hexColor}</span>
                  </div>
                  <div className="text-[10px] text-gray-400">
                    VGA DAC: R={hoverPixel.dacR}, G={hoverPixel.dacG}, B={hoverPixel.dacB} (0..63)
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Monitor Control Knobs & Badge */}
            <div className="mt-3 flex items-center justify-between text-xs font-mono text-gray-400">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-bold tracking-wider">POWER</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
                <span className="text-gray-400 text-[10px] hidden sm:inline">VGA DAC READY</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowGamepad(!showGamepad)}
                  className="flex items-center gap-1 text-[11px] text-gray-300 hover:text-amber-300 bg-[#252e40] px-2 py-1 rounded border border-gray-600 cursor-pointer"
                >
                  <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>{showGamepad ? 'Hide Controller' : 'Show Controller'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* On-Screen Touch / Mouse Arcade Gamepad */}
          {showGamepad && (
            <div className="w-full mt-3 p-3 bg-[#151a24] border border-gray-800 rounded-xl flex flex-wrap items-center justify-around gap-4 text-gray-300 font-mono select-none">
              {/* D-Pad */}
              <div className="relative w-32 h-32 flex items-center justify-center">
                {/* Center cross background */}
                <div className="absolute w-10 h-10 bg-gray-900 rounded-xs border border-gray-700"></div>

                {/* UP */}
                <button
                  onMouseDown={() => runner.handleInput('up', true)}
                  onMouseUp={() => runner.handleInput('up', false)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    runner.handleInput('up', true);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    runner.handleInput('up', false);
                  }}
                  className="absolute top-0 w-10 h-11 bg-gray-800 hover:bg-gray-700 active:bg-amber-600 text-white rounded-t-md border-t border-x border-gray-600 flex items-center justify-center font-bold text-xs cursor-pointer shadow active:scale-95"
                >
                  ▲
                </button>

                {/* DOWN */}
                <button
                  onMouseDown={() => runner.handleInput('down', true)}
                  onMouseUp={() => runner.handleInput('down', false)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    runner.handleInput('down', true);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    runner.handleInput('down', false);
                  }}
                  className="absolute bottom-0 w-10 h-11 bg-gray-800 hover:bg-gray-700 active:bg-amber-600 text-white rounded-b-md border-b border-x border-gray-600 flex items-center justify-center font-bold text-xs cursor-pointer shadow active:scale-95"
                >
                  ▼
                </button>

                {/* LEFT */}
                <button
                  onMouseDown={() => runner.handleInput('left', true)}
                  onMouseUp={() => runner.handleInput('left', false)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    runner.handleInput('left', true);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    runner.handleInput('left', false);
                  }}
                  className="absolute left-0 w-11 h-10 bg-gray-800 hover:bg-gray-700 active:bg-amber-600 text-white rounded-l-md border-l border-y border-gray-600 flex items-center justify-center font-bold text-xs cursor-pointer shadow active:scale-95"
                >
                  ◀
                </button>

                {/* RIGHT */}
                <button
                  onMouseDown={() => runner.handleInput('right', true)}
                  onMouseUp={() => runner.handleInput('right', false)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    runner.handleInput('right', true);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    runner.handleInput('right', false);
                  }}
                  className="absolute right-0 w-11 h-10 bg-gray-800 hover:bg-gray-700 active:bg-amber-600 text-white rounded-r-md border-r border-y border-gray-600 flex items-center justify-center font-bold text-xs cursor-pointer shadow active:scale-95"
                >
                  ▶
                </button>
              </div>

              {/* Center Option Buttons (Select / Start) */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <button
                      onMouseDown={() => runner.handleInput('select', true)}
                      onMouseUp={() => runner.handleInput('select', false)}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        runner.handleInput('select', true);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        runner.handleInput('select', false);
                      }}
                      className="w-12 h-4 bg-gray-700 hover:bg-gray-600 active:bg-amber-500 rounded-full border border-gray-500 shadow cursor-pointer"
                    />
                    <span className="text-[9px] text-gray-400 mt-1">SELECT</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <button
                      onMouseDown={() => runner.handleInput('start', true)}
                      onMouseUp={() => runner.handleInput('start', false)}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        runner.handleInput('start', true);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        runner.handleInput('start', false);
                      }}
                      className="w-12 h-4 bg-gray-700 hover:bg-gray-600 active:bg-amber-500 rounded-full border border-gray-500 shadow cursor-pointer"
                    />
                    <span className="text-[9px] text-gray-400 mt-1">START</span>
                  </div>
                </div>
                <div className="text-[10px] text-gray-500 font-mono">
                  Keyboard: Arrows / WASD • Z/X: A/B • Enter: Start
                </div>
              </div>

              {/* Action Buttons (B and A) */}
              <div className="flex items-center gap-3">
                {/* B Button */}
                <div className="flex flex-col items-center">
                  <button
                    onMouseDown={() => runner.handleInput('b', true)}
                    onMouseUp={() => runner.handleInput('b', false)}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      runner.handleInput('b', true);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      runner.handleInput('b', false);
                    }}
                    className="w-12 h-12 bg-red-700 hover:bg-red-600 active:bg-red-400 rounded-full border-2 border-red-900 shadow-[0_4px_0_#450a0a] active:shadow-none active:translate-y-1 text-white font-bold flex items-center justify-center cursor-pointer text-sm"
                  >
                    B
                  </button>
                  <span className="text-[10px] text-gray-400 mt-1 font-bold">BTN B (X)</span>
                </div>

                {/* A Button */}
                <div className="flex flex-col items-center mt-3">
                  <button
                    onMouseDown={() => runner.handleInput('a', true)}
                    onMouseUp={() => runner.handleInput('a', false)}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      runner.handleInput('a', true);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      runner.handleInput('a', false);
                    }}
                    className="w-12 h-12 bg-red-600 hover:bg-red-500 active:bg-red-400 rounded-full border-2 border-red-900 shadow-[0_4px_0_#450a0a] active:shadow-none active:translate-y-1 text-white font-bold flex items-center justify-center cursor-pointer text-sm"
                  >
                    A
                  </button>
                  <span className="text-[10px] text-gray-400 mt-1 font-bold">BTN A (Z)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Telemetry, CPU Register Watcher & Blitter Info (Col 9-12) */}
        <div className="lg:col-span-4 space-y-3 font-mono text-xs">
          {/* x86 Real Mode DOS CPU Registers HUD */}
          <div className="bg-[#151c27] border border-gray-700/80 rounded-lg p-3 shadow">
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-gray-700 text-amber-300 font-bold">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>16-bit x86 Real-Mode CPU HUD</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-900/60 text-blue-300 rounded border border-blue-700">
                INT 10h AH=00h AL=13h
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-gray-900/80 p-1.5 rounded border border-gray-800">
                <span className="text-gray-400">AX: </span>
                <span className="text-emerald-400 font-bold">{dosRegs.ax}</span>
              </div>
              <div className="bg-gray-900/80 p-1.5 rounded border border-gray-800">
                <span className="text-gray-400">BX: </span>
                <span className="text-emerald-400 font-bold">{dosRegs.bx}</span>
              </div>
              <div className="bg-gray-900/80 p-1.5 rounded border border-gray-800">
                <span className="text-gray-400">CX: </span>
                <span className="text-cyan-400 font-bold">{dosRegs.cx}</span>
              </div>
              <div className="bg-gray-900/80 p-1.5 rounded border border-gray-800">
                <span className="text-gray-400">DX: </span>
                <span className="text-cyan-400 font-bold">{dosRegs.dx}</span>
              </div>
              <div className="bg-gray-900/80 p-1.5 rounded border border-gray-800">
                <span className="text-gray-400">SI: </span>
                <span className="text-amber-300 font-bold">{dosRegs.si}</span>
              </div>
              <div className="bg-gray-900/80 p-1.5 rounded border border-gray-800">
                <span className="text-gray-400">DI: </span>
                <span className="text-amber-300 font-bold">{dosRegs.di}</span>
              </div>
              <div className="bg-gray-900/80 p-1.5 rounded border border-gray-800">
                <span className="text-gray-400">CS:IP: </span>
                <span className="text-purple-300 font-bold">
                  {dosRegs.cs}:{dosRegs.ip}
                </span>
              </div>
              <div className="bg-gray-900/80 p-1.5 rounded border border-gray-800">
                <span className="text-gray-400">ES (VRAM): </span>
                <span className="text-yellow-400 font-bold">{dosRegs.es}</span>
              </div>
            </div>

            <div className="mt-2 text-[10px] text-gray-400 bg-black/40 p-1.5 rounded border border-gray-800">
              Flags: <span className="text-gray-200">{dosRegs.flags}</span>
            </div>
          </div>

          {/* 6502 NES CPU Emulation Registers */}
          <div className="bg-[#151c27] border border-gray-700/80 rounded-lg p-3 shadow">
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-gray-700 text-blue-300 font-bold">
              <span>MOS 6502 CPU (Ricoh 2A03)</span>
              <span className="text-[10px] text-gray-400">1.789 MHz (NTSC)</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
              <div className="bg-gray-900/80 p-1 rounded text-center">
                <span className="text-gray-400 block text-[9px]">REG A</span>
                <span className="text-amber-300 font-bold">
                  ${runner.cpu.a.toString(16).toUpperCase().padStart(2, '0')}
                </span>
              </div>
              <div className="bg-gray-900/80 p-1 rounded text-center">
                <span className="text-gray-400 block text-[9px]">REG X</span>
                <span className="text-amber-300 font-bold">
                  ${runner.cpu.x.toString(16).toUpperCase().padStart(2, '0')}
                </span>
              </div>
              <div className="bg-gray-900/80 p-1 rounded text-center">
                <span className="text-gray-400 block text-[9px]">REG Y</span>
                <span className="text-amber-300 font-bold">
                  ${runner.cpu.y.toString(16).toUpperCase().padStart(2, '0')}
                </span>
              </div>
              <div className="bg-gray-900/80 p-1 rounded text-center">
                <span className="text-gray-400 block text-[9px]">STACK (S)</span>
                <span className="text-cyan-300 font-bold">
                  ${runner.cpu.sp.toString(16).toUpperCase().padStart(2, '0')}
                </span>
              </div>
              <div className="bg-gray-900/80 p-1 rounded text-center col-span-2">
                <span className="text-gray-400 block text-[9px]">PC (PROGRAM COUNTER)</span>
                <span className="text-emerald-400 font-bold">
                  ${runner.cpu.pc.toString(16).toUpperCase().padStart(4, '0')}
                </span>
              </div>
            </div>
          </div>

          {/* Mode 13h Technical Architecture Quick Card */}
          <div className="bg-[#151c27] border border-gray-700/80 rounded-lg p-3 shadow space-y-2">
            <div className="flex items-center justify-between text-emerald-400 font-bold border-b border-gray-700 pb-1">
              <span>Mode 13h Blitter Specs</span>
              <button
                onClick={onOpenMzInspector}
                className="text-[10px] text-blue-400 hover:text-blue-300 underline cursor-pointer"
              >
                Inspect MZ Header →
              </button>
            </div>

            <ul className="space-y-1 text-[11px] text-gray-300">
              <li className="flex justify-between">
                <span className="text-gray-400">Resolution:</span>
                <span className="text-amber-300 font-bold">320 × 200 pixels</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-400">Color Depth:</span>
                <span className="text-emerald-400 font-bold">8 bits per pixel (256 colors)</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-400">Video Segment:</span>
                <span className="text-cyan-300 font-bold">0xA000:0000 (Linear 64KB)</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-400">NES Viewport:</span>
                <span className="text-purple-300 font-bold">256x200 (32px Borders)</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-400">DAC Registers:</span>
                <span className="text-yellow-400 font-bold">Port 0x3C8 & 0x3C9 (6-bit RGB)</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-400">DOS Executable:</span>
                <span className="text-red-400 font-bold">16-bit MZ Header (512B pages)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
