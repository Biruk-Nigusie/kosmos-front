import { useState } from "react";
import { Eye, EyeClosed, Sun, Moon, Monitor } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterFormData } from "@/schemas/auth.schema";
import { registerUser } from "@/api/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useThemeStore, type ThemeMode } from "@/store/themeStore";

const THEME_CYCLE: ThemeMode[] = ["light", "dark", "system"];
const THEME_ICONS: Record<ThemeMode, React.ReactNode> = {
  light: <Sun size={16} />,
  dark: <Moon size={16} />,
  system: <Monitor size={16} />,
};

const SignupPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const { mode, setMode } = useThemeStore();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const cycleTheme = () => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(mode) + 1) % THEME_CYCLE.length];
    setMode(next);
  };

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const response = await registerUser(data);
      const userId = response?.user?.id;
      if (userId) sessionStorage.setItem("pending_verify_user_id", userId);
      sessionStorage.setItem("pending_verify_email", data.email);
      toast.success("Registered! Check your email for the verification code.");
      navigate("/verify");
    } catch (err: any) {
      toast.error(err?.error || err?.message || "Registration failed");
    }
  };

  const eyeBtn = (
    <button
      type="button"
      onClick={() => setShowPassword((p) => !p)}
      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-base-content/70/60"
    >
      {showPassword ? <EyeClosed className="size-5 text-base-content/70" /> : <Eye className="size-5 text-base-content/70" />}
    </button>
  );

  return (
    <div className="bg-base-200 min-h-screen flex justify-center items-center relative">
      <Toaster position="top-right" />
      <button
        onClick={cycleTheme}
        className="absolute top-4 right-4 p-2 rounded-lg hover:bg-base-300 text-base-content/70/60 hover:text-[#4C72AA] transition-colors"
        title={`Theme: ${mode}`}
      >
        {THEME_ICONS[mode]}
      </button>

      <div className="card max-w-sm w-full bg-base-100 shadow-md py-5">
        <form onSubmit={handleSubmit(onSubmit)} className="card-body gap-4">
          <h1 className="text-2xl font-bold text-center text-base-content/70">
            Sign Up
          </h1>
          <div className="flex flex-col space-y-1">
            <label htmlFor="email" className="text-base-content/70">
              Email
            </label>
            <Input
              id="email"
              type="text"
              placeholder="name@example.com"
              error={errors.email?.message}
              {...register("email")}
            />
          </div>
          <div className="flex flex-col space-y-1">
            <label htmlFor="password" className="text-sm text-base-content/70">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                {...register("password")}
                className="input input-bordered focus:outline-none focus:border-[#4C72AA] w-full pr-10"
              />
              {eyeBtn}
            </div>
            {errors.password && (
              <span className="text-error text-xs">
                {errors.password.message}
              </span>
            )}
          </div>

          <div className="flex flex-col space-y-1">
            <label
              htmlFor="confirm_password"
              className="text-sm text-base-content/70"
            >
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirm_password"
                type={showPassword ? "text" : "password"}
                {...register("confirmPassword")}
                className="input input-bordered focus:outline-none focus:border-[#4C72AA] w-full pr-10"
              />
              {eyeBtn}
            </div>
            {errors.confirmPassword && (
              <span className="text-error text-xs">
                {errors.confirmPassword.message}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button type="submit" loading={isSubmitting}>
              Sign Up
            </Button>
            <Link to="/" className="flex gap-2 text-sm">
              <span className="text-base-content/60">Have an account?</span>
              <span className="text-[#4C72AA] font-medium">Login</span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignupPage;
