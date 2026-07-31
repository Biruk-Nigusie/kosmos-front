import type { LoginFormData, RegisterFormData } from "@/schemas/auth.schema";
import { axiosInstance } from "./axios";

// Backend returns { message, user: { id, email } } on register
export const loginUser = async (formData: LoginFormData) => {
  try {
    const response = await axiosInstance.post("/auth/login", formData);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};

export const registerUser = async (formData: RegisterFormData) => {
  try {
    const response = await axiosInstance.post("/auth/register", formData);
    // returns { message, user: { id, email, ... } }
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};

// Backend expects { userId, code }
export const verifyUser = async (data: { userId: string; code: string }) => {
  try {
    const response = await axiosInstance.post("/auth/verify", data);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};

export const resendCode = async (email: string) => {
  try {
    const response = await axiosInstance.post("/auth/resend-code", { email });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};
