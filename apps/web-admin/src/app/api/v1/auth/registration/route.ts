import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server-db";
import { generateTokens } from "@/lib/server-auth";
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, email, password, first_name, last_name, phone_number, gender, role } = body;

    if (db.users.find(u => u.username === username || u.email === email)) {
      return NextResponse.json({ detail: "User with this username or email already exists." }, { status: 400 });
    }

    const newUser = db.users.create({
      uuid: crypto.randomUUID(),
      username,
      email,
      password, // In a real app, hash this!
      first_name,
      last_name,
      phone_number,
      gender,
      role,
      created_at: new Date().toISOString()
    });

    const tokens = generateTokens(newUser.uuid);
    return NextResponse.json(tokens, { status: 201 });
  } catch (error) {
    return NextResponse.json({ detail: "Invalid request" }, { status: 400 });
  }
}
