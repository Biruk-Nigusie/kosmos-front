import { useState, useEffect } from "react";
import { Settings, LogOut, Sun, Moon, Monitor, User, ShieldCheck, FileText, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Upload, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { logoutUser, getProfile } from "@/api/notes";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore, type ThemeMode } from "@/store/themeStore";
import { usePdfStore } from "@/store/pdfStore";
import { ProfileModal } from "./ProfileModal";
import { SettingsModal } from "./SettingsModal";
import { useQuery } from "@tanstack/react-query";

const THEME_CYCLE: ThemeMode[] = ["light", "dark", "system"];
const THEME_ICONS: Record<ThemeMode, React.ReactNode> = {
  light: <Sun size={14} />,
  dark:  <Moon size={14} />,
  system:<Monitor size={14} />,
};

const useClock = () => {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
};

const Header = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const authUser = useAuthStore((s) => s.user);
  const { mode, setMode } = useThemeStore();
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const now = useClock();

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: getProfile });

  const cycleTheme = () => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(mode) + 1) % THEME_CYCLE.length];
    setMode(next);
  };

  const handleLogout = async () => {
    try { await logoutUser(); } catch { /* ignore */ } finally {
      clearAuth();
      navigate("/");
      toast.success("Logged out");
    }
  };

  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  const isPdf = pathname === "/pdf";
  const { page, scale, numPages, fileName, setPage, setScale } = usePdfStore();
  const hasFile = !!fileName;

  return (
    <>
      <header className="h-9 flex fixed top-0 left-0 w-full z-10 items-center justify-end px-4 gap-2 bg-base-100/90 backdrop-blur border-b border-base-300">
        {/* Live clock */}
        <div className="mr-auto flex items-baseline gap-2 pl-1">
          <span className="text-sm font-mono font-semibold text-base-content tabular-nums">{timeStr}</span>
          <span className="text-xs text-base-content">{dateStr}</span>
        </div>

        {/* PDF controls — only on /pdf when a file is loaded */}
        {isPdf && hasFile && (
          <div className="flex items-center gap-1 border-r border-base-300 pr-2 mr-1">
            <button onClick={() => setScale(Math.max(0.5, +(scale - 0.2).toFixed(1)))}
              className="cursor-pointer p-1 rounded hover:bg-base-200 text-base-content" title="Zoom out"><ZoomOut size={14} /></button>
            <span className="text-xs text-base-content w-9 text-center tabular-nums font-medium">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(Math.min(3, +(scale + 0.2).toFixed(1)))}
              className="cursor-pointer p-1 rounded hover:bg-base-200 text-base-content" title="Zoom in"><ZoomIn size={14} /></button>
            <div className="w-px h-4 bg-base-300 mx-1" />
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
              className="cursor-pointer p-1 rounded hover:bg-base-200 text-base-content disabled:opacity-30"><ChevronLeft size={14} /></button>
            <span className="text-xs text-base-content tabular-nums font-medium whitespace-nowrap">{page} / {numPages || "—"}</span>
            <button onClick={() => setPage(Math.min(numPages, page + 1))} disabled={page >= numPages}
              className="cursor-pointer p-1 rounded hover:bg-base-200 text-base-content disabled:opacity-30"><ChevronRight size={14} /></button>
            <input
              type="number" min={1} max={numPages || 1}
              value={page}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                if (!isNaN(v)) setPage(Math.min(numPages || 1, Math.max(1, v)));
              }}
              className="w-12 input input-xs input-bordered text-center focus:outline-none focus:border-[#4C72AA] text-base-content"
              title="Go to page"
            />
            <div className="w-px h-4 bg-base-300 mx-1" />
            <span className="text-xs text-base-content max-w-[120px] truncate font-medium" title={fileName}>{fileName}</span>
            <button onClick={() => window.dispatchEvent(new Event("pdf:open"))}
              className="cursor-pointer p-1 rounded hover:bg-base-200 text-base-content" title="Replace file"><Upload size={13} /></button>
            <button onClick={() => window.dispatchEvent(new Event("pdf:clear"))}
              className="cursor-pointer p-1 rounded hover:bg-base-200 text-base-content hover:text-red-500" title="Close file"><X size={13} /></button>
          </div>
        )}
        {isPdf && !hasFile && (
          <button onClick={() => window.dispatchEvent(new Event("pdf:open"))}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#4C72AA] text-white text-xs font-medium hover:bg-[#3a5a8a] transition-colors mr-1">
            <Upload size={12} /> Open File
          </button>
        )}

        <button onClick={cycleTheme}
          className="cursor-pointer p-1 rounded hover:bg-[#4C72AA]/10 text-base-content hover:text-[#4C72AA] transition-colors"
          title={`Theme: ${mode}`}>
          {THEME_ICONS[mode]}
        </button>
        {profile?.role === "admin" && (
          <button
            onClick={() => navigate(pathname === "/admin" ? "/notes" : "/admin")}
            className={`cursor-pointer p-1 rounded hover:bg-[#4C72AA]/10 transition-colors ${
              pathname === "/admin" ? "text-[#4C72AA]" : "text-base-content hover:text-[#4C72AA]"
            }`}
            title="Admin panel">
            <ShieldCheck size={14} />
          </button>
        )}
        <button
          onClick={() => navigate(pathname === "/pdf" ? "/notes" : "/pdf")}
          className={`cursor-pointer p-1 rounded hover:bg-[#4C72AA]/10 transition-colors ${
            pathname === "/pdf" ? "text-[#4C72AA]" : "text-base-content hover:text-[#4C72AA]"
          }`}
          title="PDF Reader">
          <FileText size={14} />
        </button>
        <button onClick={() => setShowSettings(true)}
          className="cursor-pointer p-1 rounded hover:bg-[#4C72AA]/10 text-base-content hover:text-[#4C72AA] transition-colors"
          title="Settings">
          <Settings size={14} />
        </button>
        <button onClick={() => setShowProfile(true)}
          className="cursor-pointer p-0.5 rounded-full hover:ring-2 hover:ring-[#4C72AA]/40 transition-all"
          title="Profile">
          <div className="w-6 h-6 rounded-full bg-[#4C72AA]/20 overflow-hidden flex items-center justify-center text-[10px] font-bold text-[#4C72AA]">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              : <User size={14} className="text-[#4C72AA]" />}
          </div>
        </button>
        <button onClick={handleLogout}
          className="cursor-pointer p-1 rounded hover:bg-[#4C72AA]/10 text-base-content hover:text-[#4C72AA] transition-colors"
          title="Logout">
          <LogOut size={14} />
        </button>
      </header>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
};

export default Header;
