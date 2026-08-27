import { api, tokenStorage } from "./api.js";

export const authService = {
  async register(payload) {
    const res = await api.post("/auth/register", payload);
    tokenStorage.set(res.data.token);
    return res.data.user;
  },
  async login(payload) {
    const res = await api.post("/auth/login", payload);
    tokenStorage.set(res.data.token);
    return res.data.user;
  },
  async logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      tokenStorage.clear();
    }
  },
  async me() {
    const res = await api.get("/auth/me");
    return res.data;
  },
  forgotPassword(email) {
    return api.post("/auth/forgot-password", { email });
  },
  resetPassword(token, password) {
    return api.post("/auth/reset-password", { token, password });
  },
};
