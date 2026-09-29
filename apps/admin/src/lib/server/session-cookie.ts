import type { Cookies } from "@sveltejs/kit";
import { SESSION_TTL } from "./auth";

export const SESSION_COOKIE = "session";

/** HTTP-only, SameSite=Lax, and Secure whenever the site is served over HTTPS. */
export function setSessionCookie(cookies: Cookies, token: string, url: URL): void {
  cookies.set(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    maxAge: SESSION_TTL / 1000,
  });
}

export function clearSessionCookie(cookies: Cookies): void {
  cookies.delete(SESSION_COOKIE, { path: "/" });
}
