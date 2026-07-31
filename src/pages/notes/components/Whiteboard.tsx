import { useEffect, useRef, useState, useCallback } from "react";
import { Pencil, Eraser, Trash2, Undo2, Minus, Plus } from "lucide-react";
import { cn } from "@/utils/cn";
import type { RemoteCursor } from "@/hooks/useNoteWs";
import { updateNote } from "@/api/notes";
import { useThemeStore } from "@/store/themeStore";

interface Props {
  initialData: any;
  noteId: string;
  onSendStroke: (stroke: any) => void;
  onSendClear: () => void;
  onSendUndo: (imageData: string) => void;
  onSendCursor: (cursor: Partial<RemoteCursor>) => void;
  remoteCursors: RemoteCursor[];
  applyStrokeRef: React.MutableRefObject<((stroke: any) => void) | null>;
  remoteClearRef: React.MutableRefObject<(() => void) | null>;
  remoteUndoRef: React.MutableRefObject<((imageData: string) => void) | null>;
}

type Tool = "pen" | "eraser";
const COLORS = [ "#4C72AA", "#e74c3c", "#2ecc71", "#f39c12", "#9b59b6"];

export const Whiteboard = ({ initialData, noteId, onSendStroke, onSendClear, onSendUndo, onSendCursor, remoteCursors, applyStrokeRef, remoteClearRef, remoteUndoRef }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const history = useRef<ImageData[]>([]);
  const lastCursorSend = useRef(0);
  const initialised = useRef(false);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#1a1a1a");
  const [strokeSize, setStrokeSize] = useState(3);
  const [isSaving, setIsSaving] = useState(false);
  const { keyboardShortcuts } = useThemeStore();

  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  const fillWhite = () => {
    const c = canvasRef.current; const ctx = getCtx();
    if (!c || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
  };

  // Called once the container has real dimensions
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || initialised.current) return;
    if (container.clientWidth === 0 || container.clientHeight === 0) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    initialised.current = true;

    const src = typeof initialData === "string"
      ? initialData
      : (typeof initialData === "object" && initialData?.dataUrl) ? initialData.dataUrl : "";

    if (src.startsWith("data:image")) {
      const img = new Image();
      img.onload = () => { fillWhite(); getCtx()?.drawImage(img, 0, 0); };
      img.src = src;
    } else {
      fillWhite();
    }
  }, [initialData]);

  // Use ResizeObserver so we init as soon as the container has size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => initCanvas());
    ro.observe(container);
    initCanvas(); // try immediately too
    return () => ro.disconnect();
  }, [initCanvas]);

  // Handle window resize — preserve drawing
  useEffect(() => {
    const handler = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      const ctx = getCtx();
      if (!canvas || !container || !ctx) return;
      const saved = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      ctx.putImageData(saved, 0, 0);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Ctrl+Z — only when keyboardShortcuts enabled
  useEffect(() => {
    if (!keyboardShortcuts) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [keyboardShortcuts]);

  // Register applyRemoteStroke with parent
  const applyRemoteStroke = useCallback((stroke: any) => {
    const ctx = getCtx();
    if (!ctx || !stroke?.from || !stroke?.to) return;
    drawSegment(ctx, stroke.from, stroke.to, stroke.color, stroke.size, stroke.eraser);
  }, []);

  // Register all remote action handlers with parent
  useEffect(() => {
    applyStrokeRef.current = applyRemoteStroke;
    remoteClearRef.current = () => { fillWhite(); };
    remoteUndoRef.current = (imageData: string) => {
      const ctx = getCtx();
      const canvas = canvasRef.current;
      if (!ctx || !canvas) return;
      const img = new Image();
      img.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0); };
      img.src = imageData;
    };
    return () => {
      applyStrokeRef.current = null;
      remoteClearRef.current = null;
      remoteUndoRef.current = null;
    };
  }, [applyRemoteStroke, applyStrokeRef, remoteClearRef, remoteUndoRef]);

  const drawSegment = (
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    strokeColor: string,
    size: number,
    eraser: boolean,
  ) => {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = eraser ? "#ffffff" : strokeColor;
    ctx.lineWidth = eraser ? size * 4 : size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = "source-over";
    ctx.stroke();
  };

  const triggerAutoSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsSaving(true);
    updateNote(noteId, { content: canvas.toDataURL("image/png") })
      .finally(() => setIsSaving(false));
  }, [noteId]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    if ("touches" in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current; const ctx = getCtx();
    if (!canvas || !ctx) return;
    history.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (history.current.length > 50) history.current.shift();
    isDrawing.current = true;
    lastPos.current = getPos(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || !lastPos.current) return;
    const ctx = getCtx(); if (!ctx) return;
    const pos = getPos(e);
    const stroke = { from: lastPos.current, to: pos, color, size: strokeSize, eraser: tool === "eraser" };
    drawSegment(ctx, stroke.from, stroke.to, stroke.color, stroke.size, stroke.eraser);
    onSendStroke(stroke);
    lastPos.current = pos;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastCursorSend.current > 33) {
      const rect = canvasRef.current!.getBoundingClientRect();
      onSendCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      lastCursorSend.current = now;
    }
    draw(e);
  };

  const stopDraw = () => {
    if (isDrawing.current) triggerAutoSave();
    isDrawing.current = false;
    lastPos.current = null;
  };

  const undo = () => {
    const canvas = canvasRef.current; const ctx = getCtx();
    if (!canvas || !ctx || history.current.length === 0) return;
    ctx.putImageData(history.current.pop()!, 0, 0);
    // broadcast the resulting canvas state so others see the undo
    const imageData = canvas.toDataURL("image/png");
    onSendUndo(imageData);
    triggerAutoSave();
  };

  const clear = () => {
    const canvas = canvasRef.current; const ctx = getCtx();
    if (!canvas || !ctx) return;
    history.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    fillWhite();
    onSendClear();
    triggerAutoSave();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-base-300 bg-base-100 flex-wrap">
        <div className="flex rounded-lg border border-base-300 overflow-hidden">
          <button
            onClick={() => setTool("pen")}
            className={cn(
              "p-2 transition-colors",
              tool === "pen"
                ? "bg-[#4C72AA] text-white"
                : "hover:bg-base-200 text-base-content cursor-pointer",
            )}
            title="Pen"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => setTool("eraser")}
            className={cn(
              "p-2 transition-colors",
              tool === "eraser"
                ? "bg-[#4C72AA] text-white"
                : "hover:bg-base-200 text-base-content cursor-pointer",
            )}
            title="Eraser"
          >
            <Eraser size={15} />
          </button>
        </div>

        <div className="flex gap-1.5 items-center">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                setTool("pen");
              }}
              className={cn(
                "w-5 h-5 rounded-full border-2 transition-transform",
                color === c && tool === "pen"
                  ? "border-white scale-125"
                  : "border-base-300 cursor-pointer",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              setTool("pen");
            }}
            className="w-5 h-5 rounded cursor-pointer border border-base-300"
            title="Custom color"
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setStrokeSize((s) => Math.max(1, s - 1))}
            className="p-1 rounded hover:text-white text-[#4C72AA] cursor-pointer "
          >
            <Minus size={13} />
          </button>
          <span className="text-xs w-5 text-center">{strokeSize}</span>
          <button
            onClick={() => setStrokeSize((s) => Math.min(30, s + 1))}
            className="p-1 rounded hover:text-white text-[#4C72AA] cursor-pointer"
          >
            <Plus size={13} />
          </button>
        </div>

        <div className="flex gap-1 ml-auto items-center">
          {isSaving && (
            <span className="text-[10px] text-base-content/30 animate-pulse">
              Saving…
            </span>
          )}
          <button
            onClick={undo}
            className="p-1.5 rounded text-[#4C72AA] hover:text-white cursor-pointer "
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={clear}
            className="p-1.5 rounded cursor-pointer text-red-400"
            title="Clear canvas"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-white"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none"
          style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }}
          onMouseDown={startDraw}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        {remoteCursors
          .filter((c) => c.x !== undefined)
          .map((c) => (
            <div
              key={c.userId}
              className="absolute pointer-events-none"
              style={{ left: c.x, top: c.y }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16">
                <path
                  d="M2 2 L2 13 L5 9.5 L7.5 15 L9.5 14 L7 8.5 L11 8.5 Z"
                  fill={c.color}
                  stroke="white"
                  strokeWidth="1"
                />
              </svg>
              <div
                className="absolute left-4 top-0 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap"
                style={{ backgroundColor: c.color }}
              >
                {c.displayName}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};
