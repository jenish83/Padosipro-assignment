import { request } from './client';

export interface Task {
  id: number;
  name: string;
  category: string;
  description: string;
}
export interface Profile {
  name: string;
  mobile: string;
  address: string;
  businessName: string | null;
}
export interface Me {
  user: { id: number; email: string };
  profile: Profile | null;
  profileCompleted: boolean;
  selectedTasks: Task[];
}

export const api = {
  register: (email: string, password: string) =>
    request<{ email: string; resendAfterSeconds: number }>('POST', '/api/auth/register', { email, password }, { auth: false }),
  verifyEmail: (email: string, code: string) =>
    request<{ verified: boolean }>('POST', '/api/auth/verify-email', { email, code }, { auth: false }),
  resendOtp: (email: string) =>
    request<{ resendAfterSeconds: number }>('POST', '/api/auth/resend-otp', { email }, { auth: false }),
  login: (email: string, password: string) =>
    request<{ token: string }>('POST', '/api/auth/login', { email, password }, { auth: false }),

  getMe: () => request<Me>('GET', '/api/me'),
  saveProfile: (p: { name: string; mobile: string; address: string; businessName: string }) =>
    request<Me>('PUT', '/api/me/profile', p),
  getTasks: () => request<{ tasks: Task[] }>('GET', '/api/tasks'),
  saveTasks: (taskIds: number[]) => request<Me>('PUT', '/api/me/tasks', { taskIds }),
};
