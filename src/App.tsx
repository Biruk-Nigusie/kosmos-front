import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import { LoginPage } from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import { Verify } from "@/pages/auth/Verify";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { AcceptInvitePage } from "@/pages/auth/AcceptInvitePage";
import { NotesPage } from "@/pages/notes/NotesPage";
import { AdminPage } from "@/pages/admin/AdminPage";
import { PdfReaderPage } from "@/pages/pdf/PdfReaderPage";
import Header from "./components/Header";
import { useThemeStore } from "./store/themeStore";

const qc = new QueryClient();

const AUTH_ROUTES = ["/", "/signup", "/verify", "/forgot-password", "/reset-password", "/accept-invite"];

const Layout = () => {
  const { pathname } = useLocation();
  const isAuth = AUTH_ROUTES.includes(pathname);
  return (
    <>
      {!isAuth && <Header />}
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/pdf" element={<PdfReaderPage />} />
      </Routes>
    </>
  );
};

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { apply, mode } = useThemeStore();

  // Apply on mount
  useEffect(() => {
    apply();
  }, []);

  // Re-apply when system preference changes (only relevant when mode === "system")
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => { if (mode === "system") apply(); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={qc}>
    <ThemeProvider>
      <div className="font-sans">
        <BrowserRouter>
          <Layout />
        </BrowserRouter>
      </div>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
