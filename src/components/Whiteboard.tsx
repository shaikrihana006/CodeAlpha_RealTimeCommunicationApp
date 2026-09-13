import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Pen,
  Eraser,
  Trash2,
  Download,
  X,
  RotateCcw,
  Palette,
  Minus,
  Type,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Socket } from 'socket.io-client';
import { WhiteboardStroke } from '../types';

interface WhiteboardProps {
  roomId: string;
  socket: Socket | null;
  onClose: () => void;
}

const PALETTE = [
  '#ffffff', // White
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Rose
  '#ec4899', // Pink
  '#0f172a', // Dark Slate
];

const STROKE_WIDTHS = [2, 4, 8, 14];

export const Whiteboard: React.FC<WhiteboardProps> = ({ roomId, socket, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<'pen' | 'eraser' | 'text'>('pen');
  const [color, setColor] = useState('#6366f1');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Local state of all strokes
  const strokesRef = useRef<WhiteboardStroke[]>([]);
  const currentStrokeRef = useRef<WhiteboardStroke | null>(null);
  const isDrawingRef = useRef(false);

  // Redraw all strokes on canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid dots for professional blueprint feel
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    const dotSpacing = 28;
    for (let x = dotSpacing; x < canvas.width; x += dotSpacing) {
      for (let y = dotSpacing; y < canvas.height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw all strokes
    strokesRef.current.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = stroke.type === 'eraser' ? '#090d16' : stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
  }, []);

  // Handle resizing canvas
  useEffect(() => {
    const updateSize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      redrawCanvas();
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    if (containerRef.current) ro.observe(containerRef.current);

    return () => ro.disconnect();
  }, [redrawCanvas]);

  // Socket listener for strokes and clear
  useEffect(() => {
    if (!socket) return;

    // Initial state from server
    const handleInit = (strokes: WhiteboardStroke[]) => {
      strokesRef.current = strokes || [];
      redrawCanvas();
    };

    // Incoming stroke from other peer
    const handleDraw = (stroke: WhiteboardStroke) => {
      strokesRef.current.push(stroke);
      redrawCanvas();
    };

    // Board cleared by another participant
    const handleClear = () => {
      strokesRef.current = [];
      redrawCanvas();
    };

    socket.on('whiteboard-init', handleInit);
    socket.on('whiteboard-draw', handleDraw);
    socket.on('whiteboard-clear', handleClear);

    return () => {
      socket.off('whiteboard-init', handleInit);
      socket.off('whiteboard-draw', handleDraw);
      socket.off('whiteboard-clear', handleClear);
    };
  }, [socket, redrawCanvas]);

  // Start drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    isDrawingRef.current = true;
    const newStroke: WhiteboardStroke = {
      id: `strk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: tool === 'eraser' ? 'eraser' : 'pen',
      color,
      width: tool === 'eraser' ? strokeWidth * 3 : strokeWidth,
      points: [{ x, y }],
    };

    currentStrokeRef.current = newStroke;
    strokesRef.current.push(newStroke);
    redrawCanvas();
  };

  // Move drawing
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    currentStrokeRef.current.points.push({ x, y });
    redrawCanvas();
  };

  // End drawing & broadcast
  const stopDrawing = () => {
    if (isDrawingRef.current && currentStrokeRef.current) {
      // Emit stroke to all room participants
      if (socket && currentStrokeRef.current.points.length > 1) {
        socket.emit('whiteboard-draw', {
          roomId,
          stroke: currentStrokeRef.current,
        });
      }
    }
    isDrawingRef.current = false;
    currentStrokeRef.current = null;
  };

  // Clear whiteboard
  const handleClearBoard = () => {
    if (window.confirm('Are you sure you want to clear the whiteboard for all attendees?')) {
      strokesRef.current = [];
      redrawCanvas();
      if (socket) {
        socket.emit('whiteboard-clear', { roomId });
      }
    }
  };

  // Export board as PNG
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `connectroom-whiteboard-${roomId}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div
      id="whiteboard-overlay-container"
      className={`fixed z-40 bg-slate-950/95 backdrop-blur-md flex flex-col border border-slate-800 shadow-2xl transition-all ${
        isFullscreen
          ? 'inset-0'
          : 'inset-4 sm:inset-10 lg:inset-16 rounded-3xl overflow-hidden'
      }`}
    >
      {/* Top Toolbar */}
      <div className="h-16 px-4 sm:px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-4 select-none shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-['Space_Grotesk']">
              Live Collaborative Whiteboard
            </h3>
            <p className="text-[10px] text-slate-400">
              Changes sync instantly with everyone in room <span className="font-mono text-indigo-400">{roomId}</span>
            </p>
          </div>
        </div>

        {/* Center Drawing Tools */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/80">
          {/* Pen */}
          <button
            id="wb-tool-pen"
            onClick={() => setTool('pen')}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              tool === 'pen'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title="Draw (Pen)"
          >
            <Pen className="w-4 h-4" />
            <span className="hidden md:inline">Pen</span>
          </button>

          {/* Eraser */}
          <button
            id="wb-tool-eraser"
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              tool === 'eraser'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title="Erase"
          >
            <Eraser className="w-4 h-4" />
            <span className="hidden md:inline">Eraser</span>
          </button>

          <div className="w-px h-5 bg-slate-700 mx-1" />

          {/* Color Palette */}
          <div className="flex items-center gap-1">
            {PALETTE.map((c) => (
              <button
                key={c}
                id={`wb-color-${c.replace('#', '')}`}
                onClick={() => {
                  setColor(c);
                  setTool('pen');
                }}
                className={`w-6 h-6 rounded-full transition-transform border ${
                  color === c && tool === 'pen'
                    ? 'scale-125 ring-2 ring-white border-transparent'
                    : 'border-slate-700 hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
                title={`Color: ${c}`}
              />
            ))}
          </div>

          <div className="w-px h-5 bg-slate-700 mx-1" />

          {/* Stroke Width Selector */}
          <div className="flex items-center gap-1">
            {STROKE_WIDTHS.map((w) => (
              <button
                key={w}
                id={`wb-width-${w}`}
                onClick={() => setStrokeWidth(w)}
                className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                  strokeWidth === w
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                }`}
                title={`Line width: ${w}px`}
              >
                <div
                  className="rounded-full bg-current"
                  style={{ width: `${w * 1.5}px`, height: `${w * 1.5}px` }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Clear Board */}
          <button
            id="wb-clear-btn"
            onClick={handleClearBoard}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-800 transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="Clear all strokes"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>

          {/* Export PNG */}
          <button
            id="wb-export-btn"
            onClick={handleExportPNG}
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-1.5 text-xs font-semibold shadow"
            title="Download Whiteboard as PNG"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export PNG</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            id="wb-fullscreen-btn"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close Whiteboard */}
          <button
            id="wb-close-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Minimize Whiteboard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Canvas Drawing Area */}
      <div ref={containerRef} className="flex-1 relative cursor-crosshair overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 w-full h-full touch-none"
        />
      </div>
    </div>
  );
};
