import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isTokenExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false; // If we don't have an expiresAt, assume it's not expired
  const now = Date.now();
  const expiryTime = new Date(expiresAt).getTime();
  return now >= expiryTime;
}