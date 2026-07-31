import { useState, useCallback, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { FileText, X, Plus, BookOpen, Upload } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getNotes, createNote, getNote, updateNote } from "@/api/notes";
import { toast } from "sonner";
import { marked } from "marked";
import { usePdfStore, saveFileToIDB, loadFileFromIDB, clearFileFromIDB, saveMeta, loadMeta, clearMeta } from "@/store/pdfStore";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface SelectionPopup { x: number; y: number; text: string; }

const NotePicker = ({ selectedText, onClose }: { selectedText: string; onClose: () => void }) => {
  const qc = useQueryClient();
  const { data: notes = [] } = useQuery({ queryKey: ["notes"], queryFn: getNotes });
  const docNotes = (notes as any[]).filter((n) => n.type === "document");
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [newTitle, setNewTitle] = useState("PDF Extract");
  const [selectedNoteId, setSelectedNoteId] = useState("");

  const createNew = useMutation({
    mutationFn: async () => {
      const note = await createNote({ title: newTitle || "PDF Extract", type: "document" });
      await updateNote(note.id, { content: selectedText });
      return note;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notes"] }); toast.success("Created new note"); onClose(); },
    onError: () => toast.error("Failed to create note"),
  });

  const appendToExisting = useMutation({
    mutationFn: async () => {
      const note = await getNote(selectedNoteId);
      const existing = typeof note.content === "string" ? note.content : "";
      await updateNote(selectedNoteId, { content: existing ? `${existing}\n\n${selectedText}` : selectedText });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notes"] }); toast.success("Text appended"); onClose(); },
    onError: () => toast.error("Failed to update note"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-base-100 rounded-xl shadow-xl w-full max-w-sm p-5 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-black hover:text-base-content/60"><X size={16} /></button>
        <h3 className="text-sm font-semibold text-black mb-1">Add to Note</h3>
        <p className="text-xs text-black/60 mb-4 line-clamp-2 italic">"{selectedText.slice(0, 120)}{selectedText.length > 120 ? "…" : ""}"</p>
        <div className="flex gap-1 mb-4 bg-base-200 rounded-lg p-1">
          {(["new", "existing"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === m ? "bg-base-100 text-[#4C72AA] shadow-sm" : "text-black"}`}>
              {m === "new" ? <><Plus size={11} /> New Note</> : <><BookOpen size={11} /> Existing Note</>}
            </button>
          ))}
        </div>
        {mode === "new" ? (
          <div className="space-y-3">
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Note title"
              className="input input-sm input-bordered w-full focus:outline-none focus:border-[#4C72AA] text-sm" />
            <button onClick={() => createNew.mutate()} disabled={createNew.isPending}
              className="w-full py-2 rounded-lg bg-[#4C72AA] text-white text-sm font-medium hover:bg-[#3a5a8a] transition-colors disabled:opacity-50">
              {createNew.isPending ? <span className="loading loading-spinner loading-xs" /> : "Create Note"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="max-h-48 overflow-y-auto space-y-1 border border-base-300 rounded-lg p-1">
              {docNotes.length === 0 && <p className="text-xs text-black/60 text-center py-4">No document notes yet</p>}
              {docNotes.map((n: any) => (
                <button key={n.id} onClick={() => setSelectedNoteId(n.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors flex items-center gap-2 ${selectedNoteId === n.id ? "bg-[#4C72AA]/10 text-[#4C72AA]" : "hover:bg-base-200 text-black"}`}>
                  <FileText size={11} className="shrink-0" /><span className="truncate">{n.title}</span>
                </button>
              ))}
            </div>
            <button onClick={() => appendToExisting.mutate()} disabled={!selectedNoteId || appendToExisting.isPending}
              className="w-full py-2 rounded-lg bg-[#4C72AA] text-white text-sm font-medium hover:bg-[#3a5a8a] transition-colors disabled:opacity-50">
              {appendToExisting.isPending ? <span className="loading loading-spinner loading-xs" /> : "Append to Note"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const PdfReaderPage = () => {
  const { page, scale, setPage, setScale, setNumPages, setFileName, reset } = usePdfStore();
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"pdf" | "md" | null>(null);
  const [mdContent, setMdContent] = useState("");
  const [popup, setPopup] = useState<SelectionPopup | null>(null);
  const [notePicker, setNotePicker] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileUrlRef = useRef<string | null>(null);

  // On mount: try to restore file from IndexedDB
  useEffect(() => {
    loadFileFromIDB().then((saved) => {
      if (!saved) return;
      const meta = loadMeta();
      const blob = new Blob([saved.buf], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      fileUrlRef.current = url;
      setFileUrl(url);
      setFileType("pdf");
      setFileName(saved.name);
      setPage(meta.page);
      setScale(meta.scale);
    });
    return () => {
      if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
    };
  }, []);

  // Persist meta whenever page/scale change
  useEffect(() => {
    if (!fileUrl) return;
    saveMeta({ page, scale });
  }, [page, scale, fileUrl]);

  const loadFile = useCallback((f: File) => {
    const isPdf = f.type === "application/pdf" || f.name.endsWith(".pdf");
    const isMd = f.name.endsWith(".md") || f.type === "text/markdown" || f.type === "text/plain";
    if (!isPdf && !isMd) { toast.error("Only PDF and .md files are supported"); return; }

    if (fileUrlRef.current) { URL.revokeObjectURL(fileUrlRef.current); fileUrlRef.current = null; }

    if (isPdf) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const buf = e.target?.result as ArrayBuffer;
        await saveFileToIDB(buf, f.name);
        const meta = loadMeta();
        const url = URL.createObjectURL(new Blob([buf], { type: "application/pdf" }));
        fileUrlRef.current = url;
        setFileUrl(url);
        setFileType("pdf");
        setFileName(f.name);
        setNumPages(0);
        setPage(meta.page);
        setScale(meta.scale);
        setMdContent("");
      };
      reader.readAsArrayBuffer(f);
    } else {
      clearFileFromIDB();
      clearMeta();
      setFileType("md");
      setFileUrl(null);
      setFileName(f.name);
      setPage(1);
      const reader = new FileReader();
      reader.onload = (e) => setMdContent(e.target?.result as string ?? "");
      reader.readAsText(f);
    }
    setPopup(null);
  }, []);

  const clear = () => {
    if (fileUrlRef.current) { URL.revokeObjectURL(fileUrlRef.current); fileUrlRef.current = null; }
    setFileUrl(null); setFileType(null); setMdContent(""); setPopup(null);
    clearFileFromIDB(); clearMeta(); reset();
  };

  // Expose clear + inputRef to header via store isn't clean — use a custom event instead
  useEffect(() => {
    const handler = () => inputRef.current?.click();
    window.addEventListener("pdf:open", handler);
    return () => window.removeEventListener("pdf:open", handler);
  }, []);

  useEffect(() => {
    const handler = () => clear();
    window.addEventListener("pdf:clear", handler);
    return () => window.removeEventListener("pdf:clear", handler);
  }, []);

  // Text selection popup
  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(() => {
        const sel = window.getSelection();
        const text = sel?.toString().trim();
        if (!text) { setPopup(null); return; }
        const range = sel?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();
        if (!rect) return;
        setPopup({ x: rect.left + rect.width / 2, y: rect.top - 8, text });
      }, 10);
    };
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  useEffect(() => {
    if (!popup) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-selection-popup]")) setPopup(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [popup]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) loadFile(f);
  }, [loadFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) loadFile(f);
    e.target.value = "";
  };

  const hasFile = !!fileUrl || fileType === "md";

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-base-100">
      <input ref={inputRef} type="file" accept=".pdf,.md,text/markdown,application/pdf" className="hidden" onChange={onFileChange} />

      {!hasFile ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4"
          onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
          <div className="border-2 border-dashed border-base-300 rounded-2xl px-16 py-12 flex flex-col items-center gap-3 hover:border-[#4C72AA]/40 transition-colors cursor-pointer"
            onClick={() => inputRef.current?.click()}>
            <FileText size={40} className="text-[#4C72AA]/40" />
            <p className="text-sm font-medium text-black">Drop a PDF or .md file here</p>
            <p className="text-xs text-black/60">or click to browse</p>
          </div>
        </div>
      ) : fileType === "md" ? (
        <div ref={containerRef} className="flex-1 overflow-auto px-8 py-6 bg-base-100">
          <div className="md-preview max-w-3xl mx-auto"
            dangerouslySetInnerHTML={{ __html: marked(mdContent) as string }} />
        </div>
      ) : (
        <div ref={containerRef} className="flex-1 overflow-auto flex justify-center py-6 bg-base-200 relative"
          onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
          <Document
            file={fileUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={
              <div className="flex items-center justify-center pt-20">
                <span className="loading loading-spinner loading-md text-[#4C72AA]" />
              </div>
            }
          >
            <Page pageNumber={page} scale={scale} renderTextLayer renderAnnotationLayer className="shadow-xl rounded" />
          </Document>
        </div>
      )}

      {popup && (
        <div data-selection-popup className="fixed z-50 -translate-x-1/2 -translate-y-full"
          style={{ left: popup.x, top: popup.y }}>
          <div className="bg-gray-900 text-white rounded-lg shadow-xl flex items-center px-1 py-1 text-xs">
            <button
              onClick={() => { setNotePicker(popup.text); setPopup(null); window.getSelection()?.removeAllRanges(); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-white/10 transition-colors whitespace-nowrap font-medium">
              <Plus size={11} /> Add to Note
            </button>
          </div>
          <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
        </div>
      )}

      {notePicker && <NotePicker selectedText={notePicker} onClose={() => setNotePicker(null)} />}
    </div>
  );
};
