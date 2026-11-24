import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { env } from "~/env";

/** Staff login is optional infrastructure: patient pages never require it. */
export const authConfigured = Boolean(env.AUTH_SECRET && env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({ clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET }),
  ],
  secret: env.AUTH_SECRET,
  // JWT cookie sessions: no user tables needed. Vercel / localhost host headers are trusted.
  session: { strategy: "jwt", maxAge: 7 * 24 * 3600 },
  trustHost: true,
});

/** STAFF_EMAILS empty = any signed-in Google account (hackathon default); otherwise an allowlist. */
export function isStaff(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (env.STAFF_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.length === 0 || list.includes(email.toLowerCase());
}

/** The signed-in staff member, or null. Never throws (e.g. when login is not configured). */
export async function getStaff() {
  if (!authConfigured) return null;
  try {
    const session = await auth();
    const email = session?.user?.email;
    return email && isStaff(email) ? { email, name: session.user?.name ?? email } : null;
  } catch {
    return null;
  }
}
