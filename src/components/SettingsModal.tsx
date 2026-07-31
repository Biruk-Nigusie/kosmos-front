import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { X } from "lucide-react";
import { getSettings, updateSettings } from "@/api/notes";
import { Button } from "@/components/ui/Button";
import { useThemeStore, type FontSize } from "@/store/themeStore";
import { cn } from "@/utils/cn";

interface Props { onClose: () => void; }

interface FormValues {
  notification_enabled: boolean;
  fontSize: FontSize;
  highContrastMode: boolean;
  keyboardShortcuts: boolean;
  sidebarCollapsed: boolean;
  defaultEditorView: "markdown" | "rich-text";
  notif_mentions: boolean;
  notif_sharedNotes: boolean;
  notif_digestEmails: boolean;
}

const FONT_SIZES: FontSize[] = ["small", "medium", "large"];

export const SettingsModal = ({ onClose }: Props) => {
  const qc = useQueryClient();
  const {
    fontSize: curFontSize, highContrastMode: curHC, sidebarCollapsed: curSC, keyboardShortcuts: curKS,
    defaultEditorView: curDEV, notificationsEnabled: curNE, notifMentions: curNM, notifSharedNotes: curNSN, notifDigestEmails: curNDE,
    setFontSize, setHighContrast, setSidebarCollapsed, setKeyboardShortcuts, setDefaultEditorView, setNotifications,
  } = useThemeStore();

  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const mounted = useRef(false);

  const { register, handleSubmit, reset, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      notification_enabled: false,
      fontSize: curFontSize,
      highContrastMode: curHC,
      keyboardShortcuts: curKS,
      sidebarCollapsed: curSC,
      defaultEditorView: curDEV,
      notif_mentions: curNM,
      notif_sharedNotes: curNSN,
      notif_digestEmails: curNDE,
    },
  });

  const watchedFontSize = watch("fontSize");
  const watchedHC = watch("highContrastMode");

  // Populate from backend
  useEffect(() => {
    if (!settings) return;
    const p = settings.preferences ?? {};
    reset({
      notification_enabled: settings.notification_enabled ?? false,
      fontSize: p.fontSize ?? curFontSize,
      highContrastMode: p.highContrastMode ?? curHC,
      keyboardShortcuts: p.keyboardShortcuts ?? curKS,
      sidebarCollapsed: p.sidebarCollapsed ?? curSC,
      defaultEditorView: p.defaultEditorView ?? curDEV,
      notif_mentions: p.notifications?.mentions ?? curNM,
      notif_sharedNotes: p.notifications?.sharedNotes ?? curNSN,
      notif_digestEmails: p.notifications?.digestEmails ?? curNDE,
    });
  }, [settings?.user_id]);

  // Live preview font size
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    setFontSize(watchedFontSize);
  }, [watchedFontSize]);

  // Live preview high contrast
  useEffect(() => {
    if (mounted.current) setHighContrast(watchedHC);
  }, [watchedHC]);

  const save = useMutation({
    mutationFn: (d: FormValues) =>
      updateSettings({
        notification_enabled: d.notification_enabled,
        preferences: {
          fontSize: d.fontSize,
          highContrastMode: d.highContrastMode,
          keyboardShortcuts: d.keyboardShortcuts,
          sidebarCollapsed: d.sidebarCollapsed,
          defaultEditorView: d.defaultEditorView,
          notifications: {
            mentions: d.notif_mentions,
            sharedNotes: d.notif_sharedNotes,
            digestEmails: d.notif_digestEmails,
          },
        },
      }),
    onSuccess: (_, d) => {
      setFontSize(d.fontSize);
      setHighContrast(d.highContrastMode);
      setSidebarCollapsed(d.sidebarCollapsed);
      setKeyboardShortcuts(d.keyboardShortcuts);
      setDefaultEditorView(d.defaultEditorView);
      setNotifications(d.notification_enabled, d.notif_mentions, d.notif_sharedNotes, d.notif_digestEmails);
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings saved");
      onClose();
    },
    onError: () => toast.error("Failed to save settings"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-xl shadow-xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-base-content/40 hover:text-base-content">
          <X size={18} />
        </button>
        <h2 className="text-xl font-bold mb-5 text-base-content">Settings</h2>

        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-5">

          {/* Font Size */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-base-content">Font Size</label>
            <div className="grid grid-cols-3 gap-2">
              {FONT_SIZES.map((size) => (
                <button key={size} type="button"
                  onClick={() => setValue("fontSize", size, { shouldDirty: true })}
                  className={cn(
                    "py-2 rounded-lg border-2 capitalize transition-all",
                    size === "small" ? "text-sm" : size === "large" ? "text-lg" : "text-base",
                    watchedFontSize === size
                      ? "border-[#4C72AA] bg-[#4C72AA]/10 text-[#4C72AA]"
                      : "border-base-300 hover:border-[#4C72AA]/40 text-base-content/60",
                  )}>
                  {size}
                </button>
              ))}
            </div>
            <input type="hidden" {...register("fontSize")} />
          </div>

          {/* Default Editor View */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-base-content">Default Editor View</label>
            <div className="grid grid-cols-2 gap-2">
              {(["rich-text", "markdown"] as const).map((v) => (
                <button key={v} type="button"
                  onClick={() => setValue("defaultEditorView", v, { shouldDirty: true })}
                  className={cn(
                    "py-2 rounded-lg border-2 text-sm transition-all capitalize",
                    watch("defaultEditorView") === v
                      ? "border-[#4C72AA] bg-[#4C72AA]/10 text-[#4C72AA]"
                      : "border-base-300 hover:border-[#4C72AA]/40 text-base-content/60",
                  )}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Accessibility & UI */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-base-content/40 uppercase tracking-widest">Accessibility & UI</p>
            {([
              ["highContrastMode", "High Contrast Mode", "Increases text/border contrast across the app"],
              ["keyboardShortcuts", "Keyboard Shortcuts", "Enable Ctrl+Z undo and other shortcuts"],
              ["sidebarCollapsed", "Collapse Sidebar by Default", "Hide sidebar when opening notes"],
            ] as const).map(([field, label, hint]) => (
              <div key={field} className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-base-content">{label}</p>
                  <p className="text-xs text-base-content/40">{hint}</p>
                </div>
                <input type="checkbox" {...register(field)} className="toggle toggle-sm mt-0.5 shrink-0" />
              </div>
            ))}
          </div>

          {/* Notifications */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-base-content/40 uppercase tracking-widest">Notifications</p>
            <div className="flex items-center justify-between">
              <label className="text-sm text-base-content">Enable Notifications</label>
              <input type="checkbox" {...register("notification_enabled")} className="toggle toggle-sm" />
            </div>
            {([
              ["notif_mentions", "Mentions"],
              ["notif_sharedNotes", "Shared Notes"],
              ["notif_digestEmails", "Digest Emails"],
            ] as const).map(([field, label]) => (
              <div key={field} className="flex items-center justify-between pl-4 border-l-2 border-base-300">
                <label className="text-sm text-base-content/70">{label}</label>
                <input type="checkbox" {...register(field)} className="toggle toggle-sm" />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>Save</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
