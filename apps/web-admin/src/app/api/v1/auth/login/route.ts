import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server-db";
import { generateTokens } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    const user = db.users.find(u => (u.username === username || u.email === username) && u.password === password);

    if (!user) {
      return NextResponse.json({ detail: "No active account found with the given credentials" }, { status: 401 });
    }

    const tokens = generateTokens(user.uuid);
    return NextResponse.json(tokens);
  } catch (error) {
    return NextResponse.json({ detail: "Invalid request" }, { status: 400 });
  }
}
