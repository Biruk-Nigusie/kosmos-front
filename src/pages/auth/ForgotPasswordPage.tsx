import { Link } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { axiosInstance } from "@/api/axios";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const schema = z.object({ email: z.email("Enter a valid email") });
type FormData = z.infer<typeof schema>;

export const ForgotPasswordPage = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting, isSubmitSuccessful } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await axiosInstance.post("/auth/forgot-password", data);
      toast.success("Reset code sent to your email");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to send reset email");
    }
  };

  return (
    <div className="bg-base-200 min-h-screen flex items-center justify-center">
      <Toaster position="top-right" />
      <div className="card max-w-sm w-full bg-base-100 shadow-md py-5">
        <form onSubmit={handleSubmit(onSubmit)} className="card-body gap-4">
          <h2 className="text-2xl font-bold text-center text-base-content">Forgot Password</h2>
          <p className="text-sm text-base-content/60 text-center">
            Enter your email and we'll send you a reset code.
          </p>
          {isSubmitSuccessful ? (
            <p className="text-center text-[#4C72AA] font-medium">Check your inbox for the reset code.</p>
          ) : (
            <>
              <Input id="email" label="Email" type="text" placeholder="name@example.com"
                error={errors.email?.message} {...register("email")} />
              <Button type="submit" loading={isSubmitting} className="w-full">Send Reset Code</Button>
            </>
          )}
          <Link to="/" className="text-sm text-[#4C72AA] text-center">Back to Login</Link>
        </form>
      </div>
    </div>
  );
};
