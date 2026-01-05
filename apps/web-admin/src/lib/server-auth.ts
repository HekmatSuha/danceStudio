import { NextRequest } from "next/server";

export function generateTokens(userUuid: string) {
  const payload = JSON.stringify({ user_id: userUuid, exp: Date.now() + 3600000 }); // 1 hour
  const b64 = Buffer.from(payload).toString('base64');
  return {
    access: `fake.access.${b64}`,
    refresh: `fake.refresh.${b64}`
  };
}

export function getUserFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[2], 'base64').toString('utf-8'));
    return payload.user_id;
  } catch {
    return null;
  }
}
