import { useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { verifyUser, resendCode } from "@/api/auth";
import { Button } from "@/components/ui/Button";

export const Verify = () => {
  const navigate = useNavigate();
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const userId = sessionStorage.getItem("pending_verify_user_id") ?? "";

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const chars = code.padEnd(6).split("");
    chars[index] = value;
    setCode(chars.join("").trimEnd());
    if (value && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) inputs.current[index - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) { setCode(pasted); inputs.current[Math.min(pasted.length, 5)]?.focus(); }
    e.preventDefault();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) { toast.error("Enter all 6 digits"); return; }
    if (!userId) { toast.error("Session expired. Please sign up again."); navigate("/signup"); return; }
    setIsSubmitting(true);
    try {
      await verifyUser({ userId, code });
      toast.success("Account verified! You can now log in.");
      sessionStorage.removeItem("pending_verify_user_id");
      navigate("/");
    } catch (err: any) {
      toast.error(err?.message || "Verification failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    const email = sessionStorage.getItem("pending_verify_email") ?? "";
    if (!email) { toast.error("Email not found. Please sign up again."); return; }
    setIsResending(true);
    try {
      await resendCode(email);
      toast.success("New code sent to your email");
    } catch (err: any) {
      toast.error(err?.message || "Failed to resend code");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="bg-base-200 min-h-screen flex items-center justify-center flex-col space-y-10">
      <Toaster position="top-right" />
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-base-content">Verify your account</h1>
        <p className="text-sm text-base-content/60">Enter the 6-digit code sent to your email</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col items-center gap-5">
        <div className="flex gap-2 items-center" onPaste={handlePaste}>
          {Array.from({ length: 6 }).map((_, index) => (
            <span key={index} className="flex items-center gap-2">
              {index === 3 && <span className="text-base-content/40 text-xl font-light">-</span>}
              <input
                ref={(el) => { inputs.current[index] = el; }}
                type="text" inputMode="numeric" maxLength={1}
                value={code[index] || ""}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="input input-bordered border-2 w-12 h-12 text-center focus:outline-none focus:border-[#4C72AA] text-lg font-semibold"
              />
            </span>
          ))}
        </div>
        <Button type="submit" loading={isSubmitting} className="w-32">Verify</Button>
        <button type="button" onClick={handleResend} disabled={isResending}
          className="text-sm text-[#4C72AA] hover:underline disabled:opacity-50">
          {isResending ? "Sending…" : "Resend code"}
        </button>
      </form>
    </div>
  );
};
