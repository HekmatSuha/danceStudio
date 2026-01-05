import { NextRequest, NextResponse } from "next/server";
import { generateTokens } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { refresh } = body;
    
    // In a real app, verify the refresh token signature and check db
    if (!refresh || !refresh.startsWith('fake.refresh.')) {
         return NextResponse.json({ detail: "Token is invalid or expired" }, { status: 401 });
    }

    // Extract user_id from fake token
    const parts = refresh.split('.');
    const payload = JSON.parse(Buffer.from(parts[2], 'base64').toString('utf-8'));
    
    const tokens = generateTokens(payload.user_id);
    return NextResponse.json(tokens);
  } catch (error) {
    return NextResponse.json({ detail: "Invalid request" }, { status: 400 });
  }
}
