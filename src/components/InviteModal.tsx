import { useState } from "react";
import { X, UserPlus } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { inviteCollaborator } from "@/api/collaboration";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/utils/cn";

interface Props {
  noteId: string;
  noteTitle: string;
  onClose: () => void;
}

type Permission = "editor" | "viewer";

export const InviteModal = ({ noteId, noteTitle, onClose }: Props) => {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<Permission>("viewer");

  const invite = useMutation({
    mutationFn: () => inviteCollaborator({ noteId, email: email.trim(), permission }),
    onSuccess: () => {
      toast.success(`Invite sent to ${email}`);
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to send invite");
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-xl shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-base-content/40 hover:text-base-content">
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <UserPlus size={18} className="text-[#4C72AA]" />
          <h2 className="text-lg font-bold text-base-content">Invite Collaborator</h2>
        </div>
        <p className="text-xs text-base-content/50 mb-5 truncate">Note: {noteTitle}</p>

        <div className="space-y-4">
          <Input
            id="invite-email"
            label="Email address"
            type="email"
            placeholder="colleague@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="space-y-1">
            <label className="text-sm text-base-content">Permission</label>
            <div className="grid grid-cols-2 gap-2">
              {(["viewer", "editor"] as Permission[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPermission(p)}
                  className={cn(
                    "py-2 rounded-lg border-2 text-sm capitalize transition-all",
                    permission === p
                      ? "border-[#4C72AA] bg-[#4C72AA]/10 text-[#4C72AA]"
                      : "border-base-300 hover:border-[#4C72AA]/40 text-base-content/60",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <p className="text-xs text-base-content/40 pt-1">
              {permission === "editor" ? "Can read and edit the note." : "Can only read the note."}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => email.trim() && invite.mutate()}
              loading={invite.isPending}
              disabled={!email.trim()}
            >
              Send Invite
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
