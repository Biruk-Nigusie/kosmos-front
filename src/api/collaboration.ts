import { axiosInstance } from "./axios";

export const inviteCollaborator = async (data: {
  noteId: string;
  email: string;
  permission: "editor" | "viewer";
}) => {
  const res = await axiosInstance.post("/collaboration/invite", data);
  return res.data;
};

export const acceptInvitation = async (invitationId: string) => {
  const res = await axiosInstance.post("/collaboration/accept", { invitationId });
  return res.data;
};

export const getSharedNotes = async (): Promise<any[]> => {
  const res = await axiosInstance.get("/collaboration/shared");
  return res.data?.notes ?? [];
};

export const stopSharing = async (noteId: string): Promise<any> => {
  const res = await axiosInstance.delete(`/collaboration/stop/${noteId}`);
  return res.data;
};
