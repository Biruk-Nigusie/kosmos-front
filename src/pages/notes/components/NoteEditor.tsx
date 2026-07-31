import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getNote, updateNote, deleteNote } from "@/api/notes";
import { stopSharing } from "@/api/collaboration";
import { Trash2, UserPlus, UserX, User, Users, FileDown, Eye, Edit3, FileText } from "lucide-react";
import { toast } from "sonner";
import { Whiteboard } from "./Whiteboard";
import { useNoteWs, type RemoteCursor } from "@/hooks/useNoteWs";
import { InviteModal } from "@/components/InviteModal";
import { useAuthStore } from "@/store/authStore";
import { getProfile } from "@/api/notes";
import { pdf, Document, Page, Text, StyleSheet, View } from "@react-pdf/renderer";
import { useThemeStore } from "@/store/themeStore";
import { marked } from "marked";

interface Props {
  noteId: string;
  onDeleted: () => void;
}

const contentToString = (content: any): string => {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (typeof content === "object" && content.text) return content.text;
  return "";
};

function getCaretCoords(el: HTMLTextAreaElement, index: number) {
  const mirror = document.createElement("div");
  const cs = window.getComputedStyle(el);
  (["fontFamily","fontSize","fontWeight","lineHeight","letterSpacing",
    "paddingTop","paddingRight","paddingBottom","paddingLeft",
    "borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth",
    "boxSizing","whiteSpace","wordWrap","width"] as const).forEach((p) => {
    (mirror.style as any)[p] = cs[p];
  });
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.overflow = "hidden";
  mirror.style.height = "auto";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordBreak = "break-word";
  mirror.textContent = el.value.substring(0, index);
  const span = document.createElement("span");
  span.textContent = "\u200b";
  mirror.appendChild(span);
  document.body.appendChild(mirror);
  const top = span.offsetTop - el.scrollTop;
  const left = span.offsetLeft;
  document.body.removeChild(mirror);
  return { top, left };
}

const pdfStyles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica" },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 16 },
  body: { fontSize: 11, lineHeight: 1.6, color: "#333" },
});

const NotePdf = ({ title, content }: { title: string; content: string }) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <View><Text style={pdfStyles.title}>{title}</Text></View>
      <View><Text style={pdfStyles.body}>{content}</Text></View>
    </Page>
  </Document>
);

export const NoteEditor = ({ noteId, onDeleted }: Props) => {
  const qc = useQueryClient();
  const authUser = useAuthStore((s) => s.user);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const myDisplayName = profile?.display_name || authUser?.email || "Me";
  const { keyboardShortcuts, defaultEditorView, notificationsEnabled, notifSharedNotes } = useThemeStore();

  const { data: note, isLoading } = useQuery({
    queryKey: ["note", noteId],
    queryFn: () => getNote(noteId),
  });

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [showCollabPanel, setShowCollabPanel] = useState(false);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor & { caretTop?: number; caretLeft?: number }>>({});
  // markdown: "edit" = raw textarea, "preview" = rendered html; rich-text always shows textarea
  const [mdMode, setMdMode] = useState<"edit" | "preview">("edit");
  // which view mode is active for this note session
  const [editorView, setEditorView] = useState<"rich-text" | "markdown">(defaultEditorView ?? "rich-text");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const whiteboardApplyStroke = useRef<((stroke: any) => void) | null>(null);
  const whiteboardRemoteClear = useRef<(() => void) | null>(null);
  const whiteboardRemoteUndo = useRef<((imageData: string) => void) | null>(null);
  const cursorTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const isRemoteUpdate = useRef(false);
  // undo stack for textarea
  const undoStack = useRef<string[]>([]);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title ?? "");
      setContent(contentToString(note.content));
    }
  }, [note?.id]);

  // Ctrl+Z undo for textarea
  useEffect(() => {
    if (!keyboardShortcuts) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && document.activeElement === textareaRef.current) {
        e.preventDefault();
        if (undoStack.current.length > 0) {
          const prev = undoStack.current.pop()!;
          isRemoteUpdate.current = true; // skip WS send for undo
          setContent(prev);
          scheduleAutoSave();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [keyboardShortcuts]);

  const handleCursorMove = useCallback((cursor: RemoteCursor) => {
    let caretTop: number | undefined;
    let caretLeft: number | undefined;
    if (cursor.selectionStart !== undefined && textareaRef.current) {
      const coords = getCaretCoords(textareaRef.current, cursor.selectionStart);
      caretTop = coords.top;
      caretLeft = coords.left;
    }
    setRemoteCursors((prev) => ({ ...prev, [cursor.userId]: { ...cursor, caretTop, caretLeft } }));
    if (cursorTimers.current[cursor.userId]) clearTimeout(cursorTimers.current[cursor.userId]);
    cursorTimers.current[cursor.userId] = setTimeout(() => {
      setRemoteCursors((prev) => { const n = { ...prev }; delete n[cursor.userId]; return n; });
    }, 5000);
  }, []);

  const { connected, activeUsers, sendDocUpdate, sendTitleUpdate, sendCanvasDraw, sendCanvasClear, sendCanvasUndo, sendCursorMove } = useNoteWs({
    noteId,
    onDocUpdate: (incoming) => {
      isRemoteUpdate.current = true;
      setContent(incoming);
    },
    onTitleUpdate: (incoming) => {
      isRemoteUpdate.current = true;
      setTitle(incoming);
    },
    onCanvasDraw: (stroke) => whiteboardApplyStroke.current?.(stroke),
    onCanvasClear: () => whiteboardRemoteClear.current?.(),
    onCanvasUndo: (imageData) => whiteboardRemoteUndo.current?.(imageData),
    onCursorMove: handleCursorMove,
    onUserJoined: (u) => {
      if (notificationsEnabled && notifSharedNotes)
        toast(`${u.displayName || "Someone"} joined the note`, { icon: "👥" });
    },
  });

  const [exportingPdf, setExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const blob = await pdf(<NotePdf title={title} content={content} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title || "note"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportMd = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "note"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTitle = useRef(title);
  const latestContent = useRef(content);
  latestTitle.current = title;
  latestContent.current = content;

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      updateNote(noteId, { title: latestTitle.current, content: latestContent.current })
        .then(() => { qc.invalidateQueries({ queryKey: ["notes"] }); })
        .catch(() => {});
    }, 2000);
  }, [noteId]);

  const remove = useMutation({
    mutationFn: () => deleteNote(noteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Moved to trash");
      onDeleted();
    },
    onError: () => toast.error("Failed to delete"),
  });

  const stopShare = useMutation({
    mutationFn: () => stopSharing(noteId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["note", noteId] }); toast.success("Sharing stopped"); },
    onError: () => toast.error("Failed to stop sharing"),
  });

  const handleContentChange = (val: string) => {
    // push to undo stack (debounced — only snapshot every 1s of inactivity)
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => {
      undoStack.current.push(content);
      if (undoStack.current.length > 100) undoStack.current.shift();
    }, 1000);

    setContent(val);
    if (isRemoteUpdate.current) { isRemoteUpdate.current = false; return; }
    sendDocUpdate(val);
    scheduleAutoSave();
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (isRemoteUpdate.current) { isRemoteUpdate.current = false; return; }
    sendTitleUpdate(val);
    scheduleAutoSave();
  };

  const handleTextSelect = () => {
    const el = textareaRef.current;
    if (!el) return;
    sendCursorMove({ selectionStart: el.selectionStart, selectionEnd: el.selectionEnd, displayName: myDisplayName });
  };

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center text-base-content/40">
      <span className="loading loading-spinner loading-md" />
    </div>
  );

  if (!note) return (
    <div className="flex-1 flex items-center justify-center text-base-content/40">Note not found</div>
  );

  const cursors = Object.values(remoteCursors);
  const isOwner = note.user_id === authUser?.id;
  const isMarkdown = editorView === "markdown";

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-base-300 bg-base-100">
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="text-lg font-bold bg-transparent focus:outline-none flex-1 mr-3 text-base-content"
          placeholder="Untitled"
        />
        <div className="flex gap-2 shrink-0 items-center">
          {activeUsers.length > 0 && (
            <div className="relative">
              <button onClick={() => setShowCollabPanel((v) => !v)}
                className="flex -space-x-1.5 mr-1 cursor-pointer" title="Active collaborators">
                {activeUsers.slice(0, 4).map((u) => (
                  <div key={u.userId} style={{ background: u.color, borderColor: u.color }}
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {u.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full rounded-full object-cover" alt={u.displayName} /> : <User size={12} />}
                  </div>
                ))}
                {activeUsers.length > 4 && (
                  <div className="w-6 h-6 rounded-full bg-base-300 border-2 border-base-100 flex items-center justify-center text-[10px] text-base-content/60">
                    +{activeUsers.length - 4}
                  </div>
                )}
              </button>
              {showCollabPanel && (
                <div className="absolute right-0 top-8 bg-base-100 border border-base-300 rounded-lg shadow-lg z-50 w-48 overflow-hidden">
                  <div className="px-3 py-2 border-b border-base-300 flex items-center gap-1.5">
                    <Users size={11} className="text-base-content/40" />
                    <span className="text-[10px] font-semibold text-base-content/50 uppercase tracking-widest">Active now</span>
                  </div>
                  {activeUsers.map((u) => (
                    <div key={u.userId} className="flex items-center gap-2 px-3 py-1.5 hover:bg-base-200">
                      <div style={{ background: u.color }} className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] shrink-0">
                        {u.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full rounded-full object-cover" alt={u.displayName} /> : <User size={12} />}
                      </div>
                      <span className="text-xs text-base-content truncate">{u.displayName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button onClick={() => setShowInvite(true)}
            className="cursor-pointer p-1 rounded hover:bg-[#4C72AA]/10 text-base-content hover:text-[#4C72AA] transition-colors"
            title="Invite collaborator">
            <UserPlus size={13} />
          </button>

          {isOwner && (
            <button onClick={() => stopShare.mutate()} disabled={stopShare.isPending}
              className="cursor-pointer p-1 rounded hover:bg-[#4C72AA]/10 text-base-content hover:text-[#4C72AA] transition-colors disabled:opacity-50"
              title="Stop sharing">
              {stopShare.isPending ? <span className="loading loading-spinner loading-xs" /> : <UserX size={13} />}
            </button>
          )}
        </div>
      </div>

      {/* Meta bar */}
      <div className="px-4 py-1 text-[10px] text-base-content border-b border-base-300 bg-base-100 flex gap-3 items-center">

        {note.type === "document" && (
          <div className="ml-auto flex items-center gap-1">
            {/* Editor view toggle */}
            <div className="flex rounded border border-base-300 overflow-hidden mr-1">
              <button
                onClick={() => setEditorView("rich-text")}
                className={`cursor-pointer px-2 py-0.5 text-[10px] transition-colors ${editorView === "rich-text" ? "bg-[#4C72AA] text-white" : "hover:bg-base-200 text-base-content"}`}
                title="Rich text">
                Rich
              </button>
              <button
                onClick={() => setEditorView("markdown")}
                className={`cursor-pointer px-2 py-0.5 text-[10px] transition-colors ${editorView === "markdown" ? "bg-[#4C72AA] text-white" : "hover:bg-base-200 text-base-content"}`}
                title="Markdown">
                MD
              </button>
            </div>
            {/* Markdown preview toggle */}
            {isMarkdown && (
              <button
                onClick={() => setMdMode((m) => m === "edit" ? "preview" : "edit")}
                className="cursor-pointer p-1 rounded hover:bg-base-200 text-base-content transition-colors"
                title={mdMode === "edit" ? "Preview" : "Edit"}>
                {mdMode === "edit" ? <Eye size={13} /> : <Edit3 size={13} />}
              </button>
            )}
            <button onClick={isMarkdown ? handleExportMd : handleExportPdf} disabled={!isMarkdown && exportingPdf}
              className="cursor-pointer p-1 rounded hover:bg-[#4C72AA]/10 text-base-content hover:text-[#4C72AA] transition-colors disabled:opacity-50"
              title={isMarkdown ? "Download .md" : "Export as PDF"}>
              {!isMarkdown && exportingPdf ? <span className="loading loading-spinner loading-xs" /> : isMarkdown ? <FileText size={13} /> : <FileDown size={13} />}
            </button>
          </div>
        )}

        <button
          onClick={() => { if (window.confirm("Move this note to trash?")) remove.mutate(); }}
          disabled={remove.isPending}
          className={`cursor-pointer ${note.type === "document" ? "" : "ml-auto "}p-1 rounded text-red-400 hover:text-red-600 transition-colors disabled:opacity-50`}
          title="Move to trash">
          {remove.isPending ? <span className="loading loading-spinner loading-xs" /> : <Trash2 size={13} />}
        </button>
      </div>

      {/* Content */}
      {note.type === "whiteboard" ? (
        <Whiteboard
          initialData={note.content}
          noteId={noteId}
          onSendStroke={sendCanvasDraw}
          onSendClear={sendCanvasClear}
          onSendUndo={sendCanvasUndo}
          onSendCursor={(cursor) => sendCursorMove({ ...cursor, displayName: myDisplayName })}
          remoteCursors={cursors}
          applyStrokeRef={whiteboardApplyStroke}
          remoteClearRef={whiteboardRemoteClear}
          remoteUndoRef={whiteboardRemoteUndo}
        />
      ) : (
        <div className="flex-1 relative overflow-hidden">
          {/* Markdown preview */}
          {isMarkdown && mdMode === "preview" ? (
            <div
              className="w-full h-full p-6 overflow-auto bg-base-100 absolute inset-0 md-preview"
              dangerouslySetInnerHTML={{ __html: marked(content) as string }}
            />
          ) : (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onBlur={() => scheduleAutoSave()}
              onKeyUp={handleTextSelect}
              onMouseUp={handleTextSelect}
              onSelect={handleTextSelect}
              placeholder={isMarkdown ? "Write markdown here… (# Heading, **bold**, *italic*, - list)" : "Start writing…"}
              className="w-full h-full p-6 resize-none focus:outline-none bg-base-100 text-base-content text-sm leading-relaxed absolute inset-0 font-mono"
            />
          )}
          {/* Remote cursors — only in edit mode */}
          {(!isMarkdown || mdMode === "edit") && cursors.filter((c) => c.caretTop !== undefined).map((c) => (
            <div key={c.userId} className="absolute pointer-events-none"
              style={{ top: (c.caretTop ?? 0), left: (c.caretLeft ?? 0) }}>
              <div style={{ backgroundColor: c.color }} className="w-0.5 h-[1.2em] animate-pulse" />
              <div style={{ backgroundColor: c.color, bottom: "100%", left: 0 }}
                className="absolute mb-0.5 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap font-medium shadow-sm">
                {c.displayName}
              </div>
            </div>
          ))}
        </div>
      )}

      {showInvite && (
        <InviteModal noteId={noteId} noteTitle={note.title} onClose={() => setShowInvite(false)} />
      )}
    </div>
  );
};
