import { axiosInstance } from "./axios";

export const getAdminUsers = async (): Promise<any[]> => {
  const res = await axiosInstance.get("/admin/users");
  return res.data?.data ?? [];
};

export const getAuditLogs = async (): Promise<any[]> => {
  const res = await axiosInstance.get("/admin/audit-logs");
  return res.data?.data ?? [];
};
