import { axiosInstance } from "./axios";

// ── Notes ──────────────────────────────────────────────
// Backend returns { success, notes: [] } for list, { success, note: {} } for single
export const getNotes = async (): Promise<any[]> => {
  const res = await axiosInstance.get("/notes");
  return res.data?.notes ?? [];
};

export const createNote = async (data: { title: string; folderId?: string | null; type?: "document" | "whiteboard" }): Promise<any> => {
  const res = await axiosInstance.post("/notes", data);
  return res.data?.note ?? res.data;
};

export const getNote = async (id: string): Promise<any> => {
  const res = await axiosInstance.get(`/notes/${id}`);
  return res.data?.note ?? res.data;
};

export const updateNote = async (id: string, data: { title?: string; content?: string; folderId?: string | null }): Promise<any> => {
  const res = await axiosInstance.patch(`/notes/${id}`, data);
  return res.data?.note ?? res.data;
};

export const deleteNote = async (id: string): Promise<any> => {
  const res = await axiosInstance.delete(`/notes/${id}`);
  return res.data;
};

export const getTrashedNotes = async (): Promise<any[]> => {
  const res = await axiosInstance.get("/notes/trash");
  return res.data?.notes ?? [];
};

export const restoreNote = async (id: string): Promise<any> => {
  const res = await axiosInstance.patch(`/notes/${id}/restore`);
  return res.data?.note ?? res.data;
};

export const purgeNote = async (id: string): Promise<any> => {
  const res = await axiosInstance.delete(`/notes/${id}/purge`);
  return res.data;
};

// ── Folders ────────────────────────────────────────────
// Backend returns { success, folders: [] } for list, { success, folder: {} } for single
export const getFolders = async (): Promise<any[]> => {
  const res = await axiosInstance.get("/folders");
  return res.data?.folders ?? [];
};

export const createFolder = async (data: { name: string; parentId?: string | null }): Promise<any> => {
  const res = await axiosInstance.post("/folders", data);
  return res.data?.folder ?? res.data;
};

export const updateFolder = async (id: string, data: { name: string }): Promise<any> => {
  const res = await axiosInstance.patch(`/folders/${id}`, data);
  return res.data?.folder ?? res.data;
};

export const deleteFolder = async (id: string): Promise<any> => {
  const res = await axiosInstance.delete(`/folders/${id}`);
  return res.data;
};

// ── Profile ────────────────────────────────────────────
// Backend returns { success, profile: {} }
export const getProfile = async (): Promise<any> => {
  const res = await axiosInstance.get("/profile");
  return res.data?.profile ?? res.data;
};

export const updateProfile = async (data: { display_name?: string; bio?: string; avatar_url?: string }): Promise<any> => {
  const res = await axiosInstance.patch("/profile", data);
  return res.data?.profile ?? res.data;
};

// ── Settings ───────────────────────────────────────────
// Backend returns { success, settings: {} }
export const getSettings = async (): Promise<any> => {
  const res = await axiosInstance.get("/settings");
  return res.data?.settings ?? res.data;
};

export const updateSettings = async (data: object): Promise<any> => {
  const res = await axiosInstance.put("/settings", data);
  return res.data?.settings ?? res.data;
};

// ── Auth ───────────────────────────────────────────────
export const logoutUser = async (): Promise<any> => {
  const res = await axiosInstance.post("/auth/logout");
  return res.data;
};

export const logoutAllDevices = async (): Promise<any> => {
  const res = await axiosInstance.post("/auth/logout-all");
  return res.data;
};

export const getWsToken = async (): Promise<string> => {
  const res = await axiosInstance.get("/auth/ws-token");
  return res.data?.token ?? "";
};
