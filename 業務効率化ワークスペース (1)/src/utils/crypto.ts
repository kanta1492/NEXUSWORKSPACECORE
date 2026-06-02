/**
 * Security and Cryptographic Utilities
 */

import { SecurityLog } from "../types";

/**
 * Creates an elegant SHA-255 salt-extended password hash using browser native Web Crypto API.
 * This ensures that passwords are never stored in plain text.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = "NEXUS_SECURITY_SALT_2026";
  const textEncoder = new TextEncoder();
  const data = textEncoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

/**
 * Validates whether an email has a standard email syntax to prevent injection and errors.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Generates a mock but realistic Client Identity (IP Address, Browser UA) for Audit Logs.
 */
export function getClientEnvironment(): { ip: string; userAgent: string } {
  // Safe realistic client markers for local sandbox environment
  const possibleIps = ["192.168.1.102", "127.0.0.1", "10.0.0.15", "172.16.2.40"];
  // We can pick a random IP from the list or stick to 127.0.0.1 for high fidelity local feel
  const ip = "127.0.0.1";
  
  const ua = navigator.userAgent;
  let browserName = "Chrome/Modern Browser";
  if (ua.indexOf("Firefox") > -1) browserName = "Firefox/Gecko Engine";
  else if (ua.indexOf("Safari") > -1 && ua.indexOf("Chrome") === -1) browserName = "Safari/WebKit Engine";
  else if (ua.indexOf("Edge") > -1) browserName = "Edge/Chromium Engine";

  return {
    ip,
    userAgent: `${browserName} (${navigator.platform || "x86_64"})`
  };
}

/**
 * Helper to build standard Security Audit Logs
 */
export function createSecurityLogEntry(
  event: string,
  category: SecurityLog["category"],
  status: SecurityLog["status"]
): SecurityLog {
  const env = getClientEnvironment();
  return {
    id: `sec-log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }),
    event,
    category,
    ipAddress: env.ip,
    userAgent: env.userAgent,
    status
  };
}
