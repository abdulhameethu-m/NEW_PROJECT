import { api } from "./api";

export async function register({ name, email, phone, password, role }) {
  const { data } = await api.post("/api/auth/register", {
    name,
    email,
    phone,
    password,
    role,
  });
  return data;
}

export async function login({ identifier, password }) {
  const { data } = await api.post("/api/auth/login", {
    identifier,
    password,
  });
  return data;
}

export async function getMe() {
  const { data } = await api.get("/api/auth/me");
  return data;
}

export async function logout(refreshToken) {
  const { data } = await api.post("/api/auth/logout", { refreshToken });
  return data;
}

export async function logoutAll() {
  const { data } = await api.post("/api/auth/logout-all");
  return data;
}
