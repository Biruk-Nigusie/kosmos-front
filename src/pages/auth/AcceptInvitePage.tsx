import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast, Toaster } from "sonner";
import { acceptInvitation } from "@/api/collaboration";
import { Button } from "@/components/ui/Button";

export const AcceptInvitePage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const invitationId = params.get("id") ?? "";
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [noteId, setNoteId] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!invitationId) { toast.error("Invalid invitation link"); return; }
    setLoading(true);
    try {
      const res = await acceptInvitation(invitationId);
      setNoteId(res?.noteId ?? null);
      setDone(true);
      toast.success("Invitation accepted!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to accept invitation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-base-200 min-h-screen flex items-center justify-center">
      <Toaster position="top-right" />
      <div className="card max-w-sm w-full bg-base-100 shadow-md">
        <div className="card-body gap-4 text-center">
          {done ? (
            <>
              <h2 className="text-xl font-bold text-base-content">You're in!</h2>
              <p className="text-sm text-base-content/60">You now have access to the shared note.</p>
              <Button onClick={() => navigate(noteId ? `/notes?noteId=${noteId}` : "/notes")} className="w-full">
                Open Notes
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-base-content">Note Invitation</h2>
              <p className="text-sm text-base-content/60">
                You've been invited to collaborate on a note. Accept to get access.
              </p>
              {!invitationId && (
                <p className="text-error text-sm">Invalid or expired invitation link.</p>
              )}
              <Button onClick={handleAccept} loading={loading} disabled={!invitationId} className="w-full">
                Accept Invitation
              </Button>
              <button onClick={() => navigate("/")} className="text-sm text-base-content/40 hover:text-base-content">
                Decline
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
