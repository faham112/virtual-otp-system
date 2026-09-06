"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { getToken } from "../lib/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AuthGate() {
  const router = useRouter();
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    axios
      .get(`${API_URL}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => router.replace(res.data?.is_admin ? "/admin" : "/dashboard"))
      .catch(() => {});
  }, [router]);
  return null;
}
