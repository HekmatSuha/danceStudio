import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server-db";
import { getUserFromRequest } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  const userId = getUserFromRequest(req);
  if (!userId) {
    return NextResponse.json({ detail: "Authentication credentials were not provided." }, { status: 401 });
  }

  const user = db.users.find(u => u.uuid === userId);
  if (!user) {
    return NextResponse.json({ detail: "User not found." }, { status: 404 });
  }

  return NextResponse.json({
    uuid: user.uuid,
    username: user.username,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    phone_number: user.phone_number,
    roles: user.role, // Simple string in mock, typical logic often returns list
    gender: user.gender
  });
}

export async function PATCH(req: NextRequest) {
  const userId = getUserFromRequest(req);
  if (!userId) {
    return NextResponse.json({ detail: "Authentication credentials were not provided." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const updatedUser = db.users.update(userId, body);
    
    if (!updatedUser) {
      return NextResponse.json({ detail: "User not found." }, { status: 404 });
    }

    return NextResponse.json({
      uuid: updatedUser.uuid,
      username: updatedUser.username,
      email: updatedUser.email,
      first_name: updatedUser.first_name,
      last_name: updatedUser.last_name,
      phone_number: updatedUser.phone_number,
      roles: updatedUser.role,
      gender: updatedUser.gender
    });
  } catch {
    return NextResponse.json({ detail: "Invalid request" }, { status: 400 });
  }
}
