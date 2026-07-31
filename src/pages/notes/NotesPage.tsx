import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Toaster } from "sonner";
import { FileText } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { NoteEditor } from "./components/NoteEditor";
import { useThemeStore } from "@/store/themeStore";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "@/api/notes";

export const NotesPage = () => {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { sidebarCollapsed, setFontSize, setHighContrast, setSidebarCollapsed, setKeyboardShortcuts, setDefaultEditorView, setNotifications } = useThemeStore();
  const [sidebarOpen, setSidebarOpen] = useState(!sidebarCollapsed);

  // Bootstrap settings from backend on load
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  useEffect(() => {
    if (!settings) return;
    const p = settings.preferences ?? {};
    if (p.fontSize) setFontSize(p.fontSize);
    if (p.highContrastMode !== undefined) setHighContrast(p.highContrastMode);
    if (p.sidebarCollapsed !== undefined) { setSidebarCollapsed(p.sidebarCollapsed); setSidebarOpen(!p.sidebarCollapsed); }
    if (p.keyboardShortcuts !== undefined) setKeyboardShortcuts(p.keyboardShortcuts);
    if (p.defaultEditorView) setDefaultEditorView(p.defaultEditorView);
    setNotifications(
      settings.notification_enabled ?? false,
      p.notifications?.mentions ?? false,
      p.notifications?.sharedNotes ?? false,
      p.notifications?.digestEmails ?? false,
    );
  }, [settings?.user_id]);

  useEffect(() => {
    const noteId = searchParams.get("noteId");
    if (noteId) {
      setSelectedNoteId(noteId);
      setSearchParams({}, { replace: true });
    }
  }, []);

  return (
    <div className="flex h-screen pt-9">
      <Toaster position="top-right" closeButton />
      {sidebarOpen && (
        <Sidebar selectedNoteId={selectedNoteId} onSelectNote={setSelectedNoteId} />
      )}
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedNoteId ? (
          <NoteEditor noteId={selectedNoteId} onDeleted={() => setSelectedNoteId(null)} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
            <FileText size={48} className="text-[#4C72AA]/30" />
            <p className="text-sm">Select a note or create a new one</p>
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)}
                className="text-xs text-[#4C72AA] hover:underline mt-1">Show sidebar</button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
