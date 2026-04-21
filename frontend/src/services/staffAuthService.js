import { staffHttp } from "./staffHttp";

export async function login(payload) {
  const { data } = await staffHttp.post("/api/staff/auth/login", payload, {
    headers: { Authorization: undefined },
  });
  return data;
}

export async function logout(refreshToken) {
  const { data } = await staffHttp.post(
    "/api/staff/auth/logout",
    { refreshToken },
    {
      headers: { Authorization: undefined },
    }
  );
  return data;
}

export async function me(token) {
  const { data } = await staffHttp.get("/api/staff/auth/me", {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return data;
}

// Alias for consistency
export const getMe = me;
