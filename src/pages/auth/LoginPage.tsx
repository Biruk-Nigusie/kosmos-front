import { useState } from "react";
import { Eye, EyeClosed, Sun, Moon, Monitor } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "@/schemas/auth.schema";
import { loginUser } from "@/api/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useThemeStore, type ThemeMode } from "@/store/themeStore";

const THEME_CYCLE: ThemeMode[] = ["light", "dark", "system"];
const THEME_ICONS: Record<ThemeMode, React.ReactNode> = {
  light: <Sun size={16} />,
  dark: <Moon size={16} />,
  system: <Monitor size={16} />,
};

export const LoginPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const { mode, setMode } = useThemeStore();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const cycleTheme = () => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(mode) + 1) % THEME_CYCLE.length];
    setMode(next);
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      await loginUser(data);
      toast.success("Logged in");
      navigate("/notes");
    } catch (err: any) {
      toast.error(err?.message || err?.error || "Login failed");
    }
  };

  return (
    <div className="bg-base-200 min-h-screen flex items-center justify-center relative">
      <Toaster position="top-right" />
      <button
        onClick={cycleTheme}
        className="absolute top-4 right-4 p-2 rounded-lg text-base-content/60  transition-colors cursor-pointer"
        title={`Theme: ${mode}`}
      >
        {THEME_ICONS[mode]}
      </button>

      <div className="max-w-sm card w-full bg-base-100 shadow-md py-5">
        <form onSubmit={handleSubmit(onSubmit)} className="card-body gap-4">
          <h2 className="text-2xl font-bold text-center text-base-content/70">
            Welcome Back
          </h2>
          <div className="flex flex-col space-y-1">
            <label htmlFor="email" className="text-base-content/70">
              Email
            </label>
            <Input
              id="email"
              type="text"
              placeholder="name@example.com"
              error={errors.email?.message}
              className="text-base-content/70"
              {...register("email")}
            />
          </div>
          <div className="flex flex-col space-y-1">
            <label htmlFor="password" className="text-base-content/70">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                {...register("password")}
                type={showPassword ? "text" : "password"}
                className="input input-bordered focus:outline-none focus:border-[#4C72AA] w-full pr-10 text-base-content/70"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-base-content/60"
              >
                {showPassword ? (
                  <EyeClosed className="size-5" />
                ) : (
                  <Eye className="size-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <span className="text-error text-xs">
                {errors.password.message}
              </span>
            )}
            <Link
              to="/forgot-password"
              className="text-[#4C72AA] font-medium self-end"
            >
              Forgot password?
            </Link>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              type="submit"
              loading={isSubmitting}
              className="text-white"
            >
              Login
            </Button>
            <Link to="/signup" className="flex gap-2 text-sm">
              <span className="text-base-content/70">No account?</span>
              <span className="text-[#4C72AA] font-medium">Sign up</span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
