export async function GET() {
  return Response.json({ message: "Session is valid" }, { status: 200 });
}
