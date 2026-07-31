import { useEffect, useRef, useState, useCallback } from "react";
import { getWsToken } from "@/api/notes";

export interface CollabUser {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  color?: string;
}

export interface RemoteCursor {
  userId: string;
  displayName: string;
  color: string;
  x?: number;
  y?: number;
  selectionStart?: number;
  selectionEnd?: number;
}

interface UseNoteWsOptions {
  noteId: string;
  onDocUpdate?: (content: string) => void;
  onTitleUpdate?: (title: string) => void;
  onCanvasDraw?: (stroke: any) => void;
  onCanvasClear?: () => void;
  onCanvasUndo?: (imageData: string) => void;
  onCursorMove?: (cursor: RemoteCursor) => void;
  onUserJoined?: (user: CollabUser) => void;
}

const USER_COLORS = ["#e74c3c", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#3498db"];
export const colorFor = (userId: string) =>
  USER_COLORS[userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % USER_COLORS.length];

const WS_BASE = (import.meta.env.VITE_WS_URL ?? "ws://localhost:9000") as string;

export const useNoteWs = ({ noteId, onDocUpdate, onTitleUpdate, onCanvasDraw, onCanvasClear, onCanvasUndo, onCursorMove, onUserJoined }: UseNoteWsOptions) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [activeUsers, setActiveUsers] = useState<CollabUser[]>([]);
  const [connected, setConnected] = useState(false);
  const myUserId = useRef<string | null>(null);
  const generation = useRef(0);

  // always-fresh callbacks
  const cbs = useRef({ onDocUpdate, onTitleUpdate, onCanvasDraw, onCanvasClear, onCanvasUndo, onCursorMove, onUserJoined });
  cbs.current = { onDocUpdate, onTitleUpdate, onCanvasDraw, onCanvasClear, onCanvasUndo, onCursorMove, onUserJoined };

  useEffect(() => {
    if (!noteId) return;
    const gen = ++generation.current;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let socket: WebSocket | null = null;

    async function openSocket() {
      if (generation.current !== gen) return;

      // Fetch token via HTTP (cookie is httpOnly — cannot read from JS)
      let token = "";
      try {
        token = await getWsToken();
      } catch {
        // if token fetch fails, retry after 3s
        if (generation.current === gen)
          reconnectTimer = setTimeout(openSocket, 3000);
        return;
      }

      if (generation.current !== gen) return;

      socket = new WebSocket(`${WS_BASE}/ws/${noteId}?token=${token}`);
      wsRef.current = socket;

      socket.onopen = () => {
        if (generation.current !== gen) return;
        setConnected(true);
      };

      socket.onmessage = (e) => {
        if (generation.current !== gen) return;
        try {
          const msg = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
          switch (msg.type) {
            case "SELF_ID":
              myUserId.current = msg.userId ?? null;
              break;
            case "USER_JOINED":
              if (msg.user?.userId) {
                const newUser = { ...msg.user, color: colorFor(msg.user.userId) };
                setActiveUsers((prev) =>
                  prev.find((u) => u.userId === msg.user.userId) ? prev : [...prev, newUser],
                );
                cbs.current.onUserJoined?.(newUser);
              }
              break;
            case "USER_LEFT":
              if (msg.user?.userId)
                setActiveUsers((prev) => prev.filter((u) => u.userId !== msg.user.userId));
              break;
            case "DOC_UPDATE":
              if (msg.content !== undefined && msg.sender !== myUserId.current)
                cbs.current.onDocUpdate?.(msg.content);
              break;
            case "DOC_TITLE_UPDATE":
              if (msg.content !== undefined && msg.sender !== myUserId.current)
                cbs.current.onTitleUpdate?.(msg.content);
              break;
            case "CANVAS_DRAW":
              if (msg.stroke && msg.sender !== myUserId.current)
                cbs.current.onCanvasDraw?.(msg.stroke);
              break;
            case "CANVAS_CLEAR":
              if (msg.sender !== myUserId.current)
                cbs.current.onCanvasClear?.();
              break;
            case "CANVAS_OBJECT":
              if (msg.imageData && msg.sender !== myUserId.current)
                cbs.current.onCanvasUndo?.(msg.imageData);
              break;
            case "CURSOR_MOVE":
              if (msg.cursor && msg.sender && msg.sender !== myUserId.current)
                cbs.current.onCursorMove?.({
                  ...msg.cursor,
                  userId: msg.sender,
                  displayName: msg.cursor.displayName ?? "User",
                  color: colorFor(msg.sender),
                });
              break;
          }
        } catch { /* ignore */ }
      };

      socket.onclose = () => {
        if (generation.current !== gen) return;
        setConnected(false);
        setActiveUsers([]);
        reconnectTimer = setTimeout(openSocket, 3000);
      };

      socket.onerror = () => socket?.close();
    }

    openSocket();

    return () => {
      generation.current = gen + 1; // invalidate all callbacks for this gen
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) {
        socket.onclose = null;
        socket.onerror = null;
        socket.close();
      }
      wsRef.current = null;
      setConnected(false);
      setActiveUsers([]);
      myUserId.current = null;
    };
  }, [noteId]);

  const send = useCallback((type: string, payload: Record<string, any> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN)
      wsRef.current.send(JSON.stringify({ type, ...payload }));
  }, []);

  const sendDocUpdate   = useCallback((content: string) => send("DOC_UPDATE", { content }), [send]);
  const sendTitleUpdate = useCallback((title: string) => send("DOC_TITLE_UPDATE", { content: title }), [send]);
  const sendCanvasDraw  = useCallback((stroke: any) => send("CANVAS_DRAW", { stroke }), [send]);
  const sendCanvasClear = useCallback(() => send("CANVAS_CLEAR"), [send]);
  const sendCanvasUndo  = useCallback((imageData: string) => send("CANVAS_OBJECT", { imageData }), [send]);
  const sendCursorMove  = useCallback(
    (cursor: Partial<RemoteCursor> & { displayName?: string }) => send("CURSOR_MOVE", { cursor }),
    [send],
  );

  return { connected, activeUsers, sendDocUpdate, sendTitleUpdate, sendCanvasDraw, sendCanvasClear, sendCanvasUndo, sendCursorMove };
};
