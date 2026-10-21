import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const COOKIE_NAME = "sessionToken";
const SECRET = process.env.SESSION_SECRET ?? process.env.JWT_SECRET ?? "";
const SESSION_ID_CLAIM = "sid"; 

export async function getCurrentSessionId(): Promise<string | null> {
  try {
    const token = (await cookies()).get(COOKIE_NAME)?.value;
    if (!token || !SECRET) return null;
    const { payload } = await jwtVerify(token, new TextEncoder().encode(SECRET));
    const id = payload[SESSION_ID_CLAIM];
    return typeof id === "string" ? id : null;
  } catch {
    return null;
  }
}