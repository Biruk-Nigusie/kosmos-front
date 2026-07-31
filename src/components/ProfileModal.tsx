import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { X, Upload, Loader2, LogOut, User } from "lucide-react";
import { getProfile, updateProfile, logoutAllDevices } from "@/api/notes";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "react-router-dom";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;

interface Props {
  onClose: () => void;
}

export const ProfileModal = ({ onClose }: Props) => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: getProfile });

  const { register, handleSubmit, reset } = useForm<{
    display_name: string;
    bio: string;
  }>();

  useEffect(() => {
    if (profile) {
      reset({ display_name: profile.display_name ?? "", bio: profile.bio ?? "" });
      setAvatarUrl(profile.avatar_url ?? "");
    }
  }, [profile?.id, reset]);

  const save = useMutation({
    mutationFn: (data: { display_name: string; bio: string }) =>
      updateProfile({ ...data, avatar_url: avatarUrl }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated");
      onClose();
    },
    onError: () => toast.error("Failed to update profile"),
  });

  const handleLogoutAll = async () => {
    setLoggingOutAll(true);
    try {
      await logoutAllDevices();
      clearAuth();
      navigate("/");
      toast.success("Logged out from all devices");
    } catch {
      toast.error("Failed to logout");
    } finally {
      setLoggingOutAll(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      const url = json.secure_url as string;
      setAvatarUrl(url);
      // auto-save avatar immediately
      await updateProfile({ avatar_url: url });
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Photo saved");
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="cursor-pointer absolute top-4 right-4 text-base-content hover:text-[#4C72AA] transition-colors">
          <X size={18} />
        </button>
        <h2 className="text-xl font-bold mb-4">Profile</h2>
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-3">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-base-300 overflow-hidden shrink-0 flex items-center justify-center text-base-content/30">
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                : <User size={28} className="text-base-content/30" />}
            </div>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="cursor-pointer flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-base-300 hover:bg-base-200 transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                {uploading ? "Uploading…" : "Upload photo"}
              </button>
              <span className="text-[10px] text-base-content/30">JPG, PNG, GIF up to 5MB</span>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Email — read only */}
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium">Email</label>
            <input
              value={authUser?.email || profile?.email || ""}
              readOnly
              className="input input-bordered input-sm cursor-not-allowed"
            />
          </div>

          <Input id="display_name" label="Display Name" {...register("display_name")} />
          <div className="flex flex-col space-y-1">
            <label className="text-sm">Bio</label>
            <textarea
              {...register("bio")}
              rows={3}
              className="textarea textarea-bordered focus:outline-none focus:border-[#4C72AA] resize-none"
              placeholder="Tell us about yourself"
            />
          </div>
          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={handleLogoutAll}
              disabled={loggingOutAll}
              className="cursor-pointer flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
            >
              <LogOut size={12} />
              {loggingOutAll ? "Logging out…" : "Logout all devices"}
            </button>
            <div className="flex gap-2">
              <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
              <Button type="submit" loading={save.isPending}>Save</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
