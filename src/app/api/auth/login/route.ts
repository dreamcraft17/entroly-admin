import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const REMEMBER_ME_DAYS = 30;
const SESSION_HOURS = 12;

export async function POST(req: NextRequest) {
  const { email, password, rememberMe } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.password || !user.adminRole) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const secret = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!);

  const maxAgeSeconds = rememberMe
    ? 60 * 60 * 24 * REMEMBER_ME_DAYS
    : 60 * 60 * SESSION_HOURS;
  const exp = rememberMe ? `${REMEMBER_ME_DAYS}d` : `${SESSION_HOURS}h`;

  const token = await new SignJWT({
    email: user.email,
    name: user.name,
    adminRole: user.adminRole,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(secret);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: maxAgeSeconds,
    path: "/",
  });

  return res;
}
