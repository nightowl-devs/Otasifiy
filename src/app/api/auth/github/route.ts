import { redirect } from "next/navigation";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;

export async function GET() {
  if (!GITHUB_CLIENT_ID) {
    return Response.json(
      { error: "GitHub OAuth not configured." },
      { status: 500 },
    );
  }

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/auth/github/callback`,
    scope: "read:user user:email repo",
  });

  redirect(`https://github.com/login/oauth/authorize?${params}`);
}
