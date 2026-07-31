import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FolderPlus,
  FilePlus,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  FileText,
  Trash2,
  Pencil,
  Check,
  X,
  PenLine,
  Users,
  RotateCcw,
  Telescope,
} from "lucide-react";
import {
  createFolder,
  createNote,
  deleteFolder,
  getFolders,
  getNotes,
  getTrashedNotes,
  purgeNote,
  restoreNote,
  updateFolder,
} from "@/api/notes";
import { getSharedNotes } from "@/api/collaboration";
import { cn } from "@/utils/cn";

// Defined outside Sidebar so it's never recreated on render
const NoteTypeMenu = ({
  menuRef,
  onSelect,
}: {
  folderId: string | undefined;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (type: "document" | "whiteboard") => void;
}) => (
  <div
    ref={menuRef}
    className="absolute right-0 top-6 bg-base-100 border border-base-300 rounded-lg shadow-lg z-50 w-36 overflow-hidden"
    onMouseDown={(e) => e.stopPropagation()}
  >
    <button
      className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-base-200 text-base-content"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onSelect("document");
      }}
    >
      <FileText size={12} /> Document
    </button>
    <button
      className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-base-200 text-base-content"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onSelect("whiteboard");
      }}
    >
      <PenLine size={12} /> Whiteboard
    </button>
  </div>
);

interface Props {
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
}

interface FolderNode {
  id: string;
  name: string;
  parent_folder_id: string | null;
  children: FolderNode[];
}

function buildTree(folders: any[]): FolderNode[] {
  const map = new Map<string, FolderNode>();
  folders.forEach((f) => map.set(f.id, { ...f, children: [] }));
  const roots: FolderNode[] = [];
  map.forEach((node) => {
    if (node.parent_folder_id && map.has(node.parent_folder_id)) {
      map.get(node.parent_folder_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

export const Sidebar = ({ selectedNoteId, onSelectNote }: Props) => {
  const qc = useQueryClient();
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [showTrash, setShowTrash] = useState(false);
  // which folder's note-type menu is open: folder id, "root", or null
  const [noteMenuOpen, setNoteMenuOpen] = useState<string | null>(null);
  const [newFolderState, setNewFolderState] = useState<{
    parentId: string | null;
    name: string;
  } | null>(null);
  const noteMenuRef = useRef<HTMLDivElement | null>(null);

  // close note menu on outside click
  useEffect(() => {
    if (!noteMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        noteMenuRef.current &&
        !noteMenuRef.current.contains(e.target as Node)
      )
        setNoteMenuOpen(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [noteMenuOpen]);

  const { data: rawFolders = [] } = useQuery({
    queryKey: ["folders"],
    queryFn: getFolders,
  });
  const { data: notes = [] } = useQuery({
    queryKey: ["notes"],
    queryFn: getNotes,
  });
  const { data: sharedNotes = [] } = useQuery({
    queryKey: ["shared-notes"],
    queryFn: getSharedNotes,
  });
  const { data: trashedNotes = [] } = useQuery({
    queryKey: ["notes-trash"],
    queryFn: getTrashedNotes,
    enabled: showTrash,
  });

  const folderTree = buildTree(Array.isArray(rawFolders) ? rawFolders : []);
  const noteList = Array.isArray(notes) ? notes : [];

  const addFolder = useMutation({
    mutationFn: (data: { name: string; parentId: string | null }) =>
      createFolder({
        name: data.name.trim(),
        parentId: data.parentId ?? undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["folders"] });
      setNewFolderState(null);
    },
  });

  const renameFolder = useMutation({
    mutationFn: (id: string) =>
      updateFolder(id, { name: editingFolderName.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["folders"] });
      setEditingFolderId(null);
    },
  });

  const removeFolder = useMutation({
    mutationFn: (id: string) => deleteFolder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["folders", "notes"] }),
  });

  const addNote = useMutation({
    mutationFn: ({
      folderId,
      type,
    }: {
      folderId?: string;
      type: "document" | "whiteboard";
    }) =>
      createNote({
        title: type === "whiteboard" ? "Untitled Whiteboard" : "Untitled",
        folderId,
        type,
      }),
    onSuccess: (note) => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      if (note?.id) onSelectNote(note.id);
      setNoteMenuOpen(null);
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to create note"),
  });

  const handleNoteMenuSelect = useCallback(
    (folderId: string | undefined, type: "document" | "whiteboard") => {
      addNote.mutate({ folderId, type });
    },
    [addNote.mutate],
  );

  const restore = useMutation({
    mutationFn: (id: string) => restoreNote(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["notes-trash"] });
      toast.success("Note restored");
    },
    onError: () => toast.error("Failed to restore"),
  });

  const purge = useMutation({
    mutationFn: (id: string) => purgeNote(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes-trash"] });
      toast.success("Permanently deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const toggleFolder = (id: string) =>
    setOpenFolders((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const openFolder = (id: string) =>
    setOpenFolders((prev) => {
      const s = new Set(prev);
      s.add(id);
      return s;
    });

  const rootNotes = noteList.filter((n: any) => !n.folder_id);

  const renderFolder = useCallback(
    (node: FolderNode, depth = 0) => {
      const isOpen = openFolders.has(node.id);
      const isEditing = editingFolderId === node.id;
      const folderNotes = noteList.filter((n: any) => n.folder_id === node.id);
      const indent = depth * 12;

      return (
        <div key={node.id}>
          <div
            style={{ paddingLeft: `${8 + indent}px` }}
            className="flex items-center gap-1 pr-1 py-0.75 rounded cursor-pointer hover:bg-base-300 group"
            onClick={() => !isEditing && toggleFolder(node.id)}
          >
            <span className="shrink-0 text-base-content/40">
              {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
            <span className="cursor-pointer p-0.5 rounded hover:text-white text-[#4C72AA]">
              {isOpen ? <FolderOpen size={13} /> : <Folder size={13} />}
            </span>

            {isEditing ? (
              <input
                autoFocus
                value={editingFolderName}
                onChange={(e) => setEditingFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") renameFolder.mutate(node.id);
                  if (e.key === "Escape") setEditingFolderId(null);
                }}
                onClick={(e) => e.stopPropagation()}
                className="input input-xs input-bordered flex-1 focus:outline-none focus:border-[#4C72AA] h-5 text-xs"
              />
            ) : (
              <span className="text-xs flex-1 truncate text-base-content">
                {node.name}
              </span>
            )}

            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 shrink-0 ml-auto">
              {isEditing ? (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      renameFolder.mutate(node.id);
                    }}
                    className="cursor-pointer p-0.5 rounded hover:text-white text-[#4C72AA]"
                  >
                    <Check size={11} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFolderId(null);
                    }}
                    className="cursor-pointer p-0.5 rounded hover:text-white text-[#4C72AA]"
                  >
                    <X size={11} />
                  </button>
                </>
              ) : (
                <>
                  {/* Add subfolder */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setNewFolderState({ parentId: node.id, name: "" });
                      openFolder(node.id);
                    }}
                    className="cursor-pointer p-0.5 rounded hover:text-white text-[#4C72AA]"
                    title="New subfolder"
                  >
                    <FolderPlus size={11} />
                  </button>

                  {/* Add note in folder */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openFolder(node.id);
                        setNoteMenuOpen((v) =>
                          v === node.id ? null : node.id,
                        );
                      }}
                      className="cursor-pointer p-0.5 rounded hover:text-white text-[#4C72AA]"
                      title="Add note"
                    >
                      <FilePlus size={11} />
                    </button>
                    {noteMenuOpen === node.id && (
                      <NoteTypeMenu
                        folderId={node.id}
                        menuRef={noteMenuRef}
                        onSelect={(type) => handleNoteMenuSelect(node.id, type)}
                      />
                    )}
                  </div>

                  {/* Rename */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFolderId(node.id);
                      setEditingFolderName(node.name);
                    }}
                    className="cursor-pointer p-0.5 rounded hover:text-white text-[#4C72AA]"
                    title="Rename"
                  >
                    <Pencil size={11} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFolder.mutate(node.id);
                    }}
                    className="cursor-pointer p-0.5 rounded hover:text-white text-[#4C72AA]"
                    title="Delete"
                  >
                    <Trash2 size={11} />
                  </button>
                </>
              )}
            </div>
          </div>

          {isOpen && (
            <div>
              {/* Inline new subfolder input */}
              {newFolderState?.parentId === node.id && (
                <div
                  style={{ paddingLeft: `${20 + indent}px` }}
                  className="pr-2 py-1 flex gap-1"
                >
                  <input
                    autoFocus
                    value={newFolderState.name}
                    onChange={(e) =>
                      setNewFolderState({
                        ...newFolderState,
                        name: e.target.value,
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newFolderState.name.trim())
                        addFolder.mutate({
                          name: newFolderState.name,
                          parentId: node.id,
                        });
                      if (e.key === "Escape") setNewFolderState(null);
                    }}
                    placeholder="Subfolder name"
                    className="input input-xs input-bordered flex-1 focus:outline-none focus:border-[#4C72AA] h-5 text-xs"
                  />
                  <button
                    onClick={() =>
                      newFolderState.name.trim() &&
                      addFolder.mutate({
                        name: newFolderState.name,
                        parentId: node.id,
                      })
                    }
                    className="cursor-pointer p-0.5 rounded hover:text-white text-[#4C72AA]"
                  >
                    <Check size={11} />
                  </button>
                  <button
                    onClick={() => setNewFolderState(null)}
                    className="cursor-pointer p-0.5 rounded hover:text-white text-[#4C72AA]"
                  >
                    <X size={11} />
                  </button>
                </div>
              )}

              {node.children.map((child) => renderFolder(child, depth + 1))}

              {folderNotes.map((note: any) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  selected={selectedNoteId === note.id}
                  onSelect={() => onSelectNote(note.id)}
                  indent={indent + 20}
                />
              ))}
            </div>
          )}
        </div>
      );
    },
    [
      openFolders,
      editingFolderId,
      editingFolderName,
      newFolderState,
      noteList,
      selectedNoteId,
      noteMenuOpen,
      handleNoteMenuSelect,
    ],
  );

  return (
    <aside className="w-56 h-full bg-base-200 flex flex-col border-r border-base-300 shrink-0">
      {/* Header */}
      <div className="px-3 py-2 border-b border-base-300 flex items-center justify-between">
        <span className="font-semibold text-xs tracking-widest text-[#4C72AA] uppercase">
          <Telescope />
        </span>
        <div className="flex gap-0.5">
          <button
            onClick={() => setNewFolderState({ parentId: null, name: "" })}
            className="cursor-pointer p-1 rounded hover:text-white text-[#4C72AA]"
            title="New folder"
          >
            <FolderPlus size={14} />
          </button>
          {/* Root new note button */}
          <div className="relative">
            <button
              onClick={() =>
                setNoteMenuOpen((v) => (v === "root" ? null : "root"))
              }
              className="cursor-pointer p-1 rounded hover:text-white text-[#4C72AA]"
              title="New note"
              disabled={addNote.isPending}
            >
              <FilePlus size={14} />
            </button>
            {noteMenuOpen === "root" && (
              <NoteTypeMenu
                folderId={undefined}
                menuRef={noteMenuRef}
                onSelect={(type) => handleNoteMenuSelect(undefined, type)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Root new-folder input */}
      {newFolderState?.parentId === null && (
        <div className="px-2 py-1.5 flex gap-1 border-b border-base-300">
          <input
            autoFocus
            value={newFolderState.name}
            onChange={(e) =>
              setNewFolderState({ ...newFolderState, name: e.target.value })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && newFolderState.name.trim())
                addFolder.mutate({ name: newFolderState.name, parentId: null });
              if (e.key === "Escape") setNewFolderState(null);
            }}
            placeholder="Folder name"
            className="input input-xs input-bordered flex-1 focus:outline-none focus:border-[#4C72AA] h-5 text-xs"
          />
          <button
            onClick={() =>
              newFolderState.name.trim() &&
              addFolder.mutate({ name: newFolderState.name, parentId: null })
            }
            className="cursor-pointer text-[#4C72AA]"
          >
            <Check size={12} />
          </button>
          <button
            onClick={() => setNewFolderState(null)}
            className="cursor-pointer text-base-content/40"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-1 px-1">
        {!showTrash ? (
          <>
            {folderTree.map((node) => renderFolder(node, 0))}

            {rootNotes.length > 0 && (
              <div className="pt-1">
                {folderTree.length > 0 && (
                  <p className="text-[10px] text-base-content/30 px-2 pb-0.5 uppercase tracking-widest">
                    Notes
                  </p>
                )}
                {rootNotes.map((note: any) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    selected={selectedNoteId === note.id}
                    onSelect={() => onSelectNote(note.id)}
                    indent={8}
                  />
                ))}
              </div>
            )}

            {folderTree.length === 0 && rootNotes.length === 0 && (
              <p className="text-xs text-base-content/30 text-center pt-8 px-4">
                No notes yet.
                <br />
                Click + to create one.
              </p>
            )}

            {Array.isArray(sharedNotes) && sharedNotes.length > 0 && (
              <div className="pt-2">
                <p className="text-[10px] text-base-content/30 px-2 pb-0.5 uppercase tracking-widest flex items-center gap-1">
                  <Users size={9} /> Shared with me
                </p>
                {sharedNotes.map((note: any) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    selected={selectedNoteId === note.id}
                    onSelect={() => onSelectNote(note.id)}
                    indent={8}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-0.5 pt-1">
            <p className="text-[10px] text-base-content/30 px-2 pb-0.5 uppercase tracking-widest">
              Trash
            </p>
            {Array.isArray(trashedNotes) && trashedNotes.length === 0 && (
              <p className="text-xs text-base-content/30 text-center pt-4">
                Trash is empty
              </p>
            )}
            {Array.isArray(trashedNotes) &&
              trashedNotes.map((note: any) => (
                <div
                  key={note.id}
                  className="flex items-center gap-1 px-2 py-1 rounded hover:bg-base-300"
                >
                  <FileText
                    size={12}
                    className="text-base-content/30 shrink-0"
                  />
                  <span className="text-xs flex-1 truncate text-base-content/50">
                    {note.title}
                  </span>
                  <button
                    onClick={() => restore.mutate(note.id)}
                    disabled={restore.isPending}
                    className="cursor-pointer p-0.5 text-[#4C72AA] hover:bg-[#4C72AA]/10 rounded shrink-0"
                    title="Restore"
                  >
                    <RotateCcw size={11} />
                  </button>
                  <button
                    onClick={() => purge.mutate(note.id)}
                    disabled={purge.isPending}
                    className="cursor-pointer p-0.5 text-red-400 hover:bg-red-50 rounded shrink-0"
                    title="Delete permanently"
                  >
                    {purge.isPending ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <Trash2 size={11} />
                    )}
                  </button>
                </div>
              ))}
          </div>
        )}
      </nav>

      <div className="px-2 py-2 border-t border-base-300 shrink-0">
        <button
          onClick={() => setShowTrash((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 text-xs px-2 py-1.5 rounded w-full transition-colors font-medium",
            showTrash ? "text-red-500" : "text-base-content hover:text-red-500",
          )}
        >
          <Trash2 size={13} />
          {showTrash ? "Back to notes" : "Trash"}
        </button>
      </div>
    </aside>
  );
};

const NoteItem = ({
  note,
  selected,
  onSelect,
  indent,
}: {
  note: any;
  selected: boolean;
  onSelect: () => void;
  indent: number;
}) => (
  <div
    onClick={onSelect}
    style={{ paddingLeft: `${indent}px` }}
    className={cn(
      "flex items-center gap-1.5 pr-2 py-[3px] rounded cursor-pointer text-xs",
      selected
        ? "bg-[#4C72AA] text-white"
        : "hover:bg-base-300 text-base-content",
    )}
  >
    {note.type === "whiteboard" ? (
      <PenLine size={12} className="shrink-0" />
    ) : (
      <FileText size={12} className="shrink-0" />
    )}
    <span className="truncate">{note.title}</span>
  </div>
);
