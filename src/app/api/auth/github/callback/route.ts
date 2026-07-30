import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getPrimaryEmail(
  token: string,
  fallbackEmail: string | null,
): Promise<string | null> {
  const res = await fetch("https://api.github.com/user/emails", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return fallbackEmail;
  const emails = await res.json();
  return (
    emails?.find?.((e: { primary: boolean }) => e.primary)?.email ??
    emails?.[0]?.email ??
    fallbackEmail
  );
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return Response.json({ error: "Missing code." }, { status: 400 });
  }

  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return Response.json(
      { error: "GitHub OAuth not configured." },
      { status: 500 },
    );
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return Response.json(
      { error: "Failed to get access token." },
      { status: 400 },
    );
  }

  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const githubUser = await userRes.json();

  const primaryEmail = await getPrimaryEmail(accessToken, githubUser.email);

  if (!primaryEmail) {
    return Response.json(
      {
        error:
          "Email is required. Ensure your GitHub app has 'Email addresses' read permission or set a public email.",
      },
      { status: 400 },
    );
  }

  let user = await prisma.user.findUnique({
    where: { githubId: String(githubUser.id) },
  });

  if (!user && primaryEmail) {
    user = await prisma.user.findUnique({
      where: { email: primaryEmail },
    });
  }
  const nameParts = (githubUser.name ?? githubUser.login ?? "").split(" ");
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        githubId: String(githubUser.id),
        githubToken: accessToken,
        avatarUrl: githubUser.avatar_url,
        email: primaryEmail,
        firstName: nameParts[0] || "",
        lastName: nameParts[1] ?? "",
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        email: primaryEmail,
        githubId: String(githubUser.id),
        githubToken: accessToken,
        avatarUrl: githubUser.avatar_url,
        firstName: nameParts[0] || "",
        lastName: nameParts[1] ?? "",
      },
    });
  }

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    },
  });

  const url = `${process.env.NEXT_PUBLIC_URL}/dashboard`;
  (await cookies()).set("session_token", session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return NextResponse.redirect(url);
}
