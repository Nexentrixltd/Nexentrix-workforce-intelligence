import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signSession } from "@/lib/auth/jwt";
import { getClientInfo, recordLogin } from "@/lib/auth/login-log";
import { signInSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";

const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);
const DAY = 24 * 60 * 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = signInSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const { password, remember } = parsed.data;
    const { ip, userAgent } = getClientInfo(req);

    // if (!email.endsWith("@nexius.com")) {
    //   return NextResponse.json(
    //     { message: "Enter a valid Nexius email" },
    //     { status: 400 },
    //   );
    // }

    const user = await prisma.user.findUnique({ where: { email } });

    const isValid = await bcrypt.compare(
      password,
      user?.passwordHash ?? DUMMY_HASH,
    );

    if (!user || !user.passwordHash || !isValid) {
      await recordLogin({
        userId: user?.id ?? null,
        email,
        success: false,
        reason: !user ? "UNKNOWN_EMAIL" : "BAD_PASSWORD",
        ip,
        userAgent,
      });

      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 },
      );
    }

    if (user.deactivatedAt) {
      return NextResponse.json(
        { error: "This account has been deactivated" },
        { status: 403 },
      );
    }

    const maxAge = (remember ? 30 : 1) * DAY;
    const expiresAt = new Date(Date.now() + maxAge * 1000);

    const session = await prisma.session.create({
      data: { userId: user.id, ip, userAgent, expiresAt },
    });

    const token = await signSession(user.id, user.role, session.id, maxAge);

    await Promise.all([
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
      recordLogin({
        userId: user.id,
        sessionId: session.id,
        email,
        success: true,
        ip,
        userAgent,
      }),
    ]);

    const { passwordHash, ...safeUser } = user;

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: safeUser,
    });

    response.cookies.set("sessionToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: "Something went wrong" },
      { status: 500 },
    );
  }
}
