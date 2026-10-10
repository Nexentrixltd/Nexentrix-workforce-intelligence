import { SignJWT, jwtVerify } from "jose";

const rawSecret = process.env.JWT_SECRET;
if (!rawSecret || rawSecret.length < 32) {
  throw new Error("JWT_SECRET must be set and at least 32 characters");
}
const secret = new TextEncoder().encode(rawSecret);

export type SessionPayload = { sub: string; role: string; sid: string };

export async function signSession(
  userId: string,
  role: string,
  sessionId: string,
  expiresInSeconds: number,
) {
  return new SignJWT({ role, sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .sign(secret);
}

export async function verifySession(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    if (
      !payload.sub ||
      typeof payload.role !== "string" ||
      typeof payload.sid !== "string"
    ) {
      return null;
    }
    return { sub: payload.sub, role: payload.role, sid: payload.sid };
  } catch {
    return null;
  }
}