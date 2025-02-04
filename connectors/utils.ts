import { UUID } from "crypto";
import { Credentials } from "../services/supabase/server";

export function isTokenExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false; // If we don't have an expiresAt, assume it's not expired
  const now = Date.now();
  const expiryTime = new Date(expiresAt).getTime();
  return now >= expiryTime;
}

export async function constructCredentials(userId: UUID, tokenName: string, tokenType: string, token?: string, createdAt?: string, expiresAt?: string): Promise<Credentials> {
  return {
    userId: userId,
    tokenName: tokenName,
    tokenType: tokenType,
    token: token || "",
    createdAt: createdAt || new Date().toISOString(),
    expiresAt: expiresAt ? new Date().toISOString() : undefined
  };
}