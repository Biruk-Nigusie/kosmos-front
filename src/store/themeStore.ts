import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";
export type FontSize = "small" | "medium" | "large";
export type EditorView = "markdown" | "rich-text";

const FONT_SIZE_MAP: Record<FontSize, string> = {
  small: "text-sm",
  medium: "text-base",
  large: "text-lg",
};

const getSystemTheme = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const applyTheme = (mode: ThemeMode) => {
  const resolved = mode === "system" ? getSystemTheme() : mode;
  document.documentElement.setAttribute("data-theme", resolved);
};

const applyFontSize = (size: FontSize) => {
  document.documentElement.classList.remove("text-sm", "text-base", "text-lg");
  document.documentElement.classList.add(FONT_SIZE_MAP[size]);
};

const applyHighContrast = (on: boolean) => {
  document.documentElement.classList.toggle("high-contrast", on);
};

interface ThemeState {
  mode: ThemeMode;
  fontSize: FontSize;
  highContrastMode: boolean;
  sidebarCollapsed: boolean;
  keyboardShortcuts: boolean;
  defaultEditorView: EditorView;
  notificationsEnabled: boolean;
  notifMentions: boolean;
  notifSharedNotes: boolean;
  notifDigestEmails: boolean;
  setMode: (mode: ThemeMode) => void;
  setFontSize: (size: FontSize) => void;
  setHighContrast: (on: boolean) => void;
  setSidebarCollapsed: (on: boolean) => void;
  setKeyboardShortcuts: (on: boolean) => void;
  setDefaultEditorView: (v: EditorView) => void;
  setNotifications: (enabled: boolean, mentions: boolean, sharedNotes: boolean, digestEmails: boolean) => void;
  apply: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: "system",
      fontSize: "medium",
      highContrastMode: false,
      sidebarCollapsed: false,
      keyboardShortcuts: true,
      defaultEditorView: "rich-text" as EditorView,
      notificationsEnabled: false,
      notifMentions: false,
      notifSharedNotes: false,
      notifDigestEmails: false,
      setMode: (mode) => { set({ mode }); applyTheme(mode); },
      setFontSize: (fontSize) => { set({ fontSize }); applyFontSize(fontSize); },
      setHighContrast: (on) => { set({ highContrastMode: on }); applyHighContrast(on); },
      setSidebarCollapsed: (on) => set({ sidebarCollapsed: on }),
      setKeyboardShortcuts: (on) => set({ keyboardShortcuts: on }),
      setDefaultEditorView: (v) => set({ defaultEditorView: v }),
      setNotifications: (enabled, mentions, sharedNotes, digestEmails) =>
        set({ notificationsEnabled: enabled, notifMentions: mentions, notifSharedNotes: sharedNotes, notifDigestEmails: digestEmails }),
      apply: () => {
        const { mode, fontSize, highContrastMode } = get();
        applyTheme(mode);
        applyFontSize(fontSize);
        applyHighContrast(highContrastMode);
      },
    }),
    { name: "theme" },
  ),
);
