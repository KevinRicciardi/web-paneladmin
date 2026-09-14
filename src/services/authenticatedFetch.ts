import { auth } from "../firebase";

let tokenCache: { uid: string; value: string; expiresAt: number } | null = null;
let tokenRequest: Promise<string> | null = null;
const TOKEN_CACHE_DURATION = 50_000;

export async function getCachedAuthHeaders() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No hay usuario autenticado");
  }

  const now = Date.now();
  if (tokenCache && tokenCache.uid === user.uid && tokenCache.expiresAt > now) {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenCache.value}`,
    };
  }

  tokenRequest ??= user.getIdToken();

  let token: string;
  try {
    token = await tokenRequest;
  } finally {
    tokenRequest = null;
  }

  if (!token) {
    throw new Error("No hay usuario autenticado");
  }

  tokenCache = {
    uid: user.uid,
    value: token,
    expiresAt: now + TOKEN_CACHE_DURATION,
  };

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}
