import Cookies from "js-cookie";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const COOKIE = {
  expires: 30,
  sameSite: "lax" as const,
  path: "/",
  secure: typeof window !== "undefined" && window.location.protocol === "https:",
};

export function getToken(): string {
  return Cookies.get("token") || "";
}

export function setToken(token: string) {
  Cookies.set("token", token, COOKIE);
}

export async function logoutSession() {
  const token = getToken();
  if (token) {
    try {
      await axios.post(`${API_URL}/api/auth/logout`, {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch {}
  }
  Cookies.remove("token", { path: "/" });
}
