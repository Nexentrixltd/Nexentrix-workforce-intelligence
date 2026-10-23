import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth/jwt";
import { sessionIdFromPayload } from "./session-active";

export async function getCurrentSessionId(): Promise<string | null> {
  try {
    const token = (await cookies()).get("sessionToken")?.value;
    const session = token ? await verifySession(token) : null;
    return session ? sessionIdFromPayload(session) : null;
  } catch {
    return null;
  }
}