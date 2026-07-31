import { Link, useNavigate } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { axiosInstance } from "@/api/axios";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const schema = z.object({
  email: z.email("Enter a valid email"),
  code: z.string().length(6, "Code must be 6 digits"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});
type FormData = z.infer<typeof schema>;

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await axiosInstance.post("/auth/reset-password", data);
      toast.success("Password reset successfully");
      navigate("/");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Reset failed");
    }
  };

  return (
    <div className="bg-base-200 min-h-screen flex items-center justify-center">
      <Toaster position="top-right" />
      <div className="card max-w-sm w-full bg-base-100 shadow-md py-5">
        <form onSubmit={handleSubmit(onSubmit)} className="card-body gap-4">
          <h2 className="text-2xl font-bold text-center text-base-content">Reset Password</h2>
          <Input id="email" label="Email" type="text" placeholder="name@example.com"
            error={errors.email?.message} {...register("email")} />
          <Input id="code" label="Reset Code" type="text" placeholder="6-digit code"
            error={errors.code?.message} {...register("code")} />
          <Input id="newPassword" label="New Password" type="password" placeholder="Min 8 characters"
            error={errors.newPassword?.message} {...register("newPassword")} />
          <Button type="submit" loading={isSubmitting} className="w-full">Reset Password</Button>
          <Link to="/" className="text-sm text-[#4C72AA] text-center">Back to Login</Link>
        </form>
      </div>
    </div>
  );
};
