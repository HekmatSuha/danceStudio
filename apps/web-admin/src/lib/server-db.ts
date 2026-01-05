import fs from 'fs';
import path from 'path';

// This is a server-side only file
const DB_PATH = path.join(process.cwd(), 'server-db.json');

export type User = {
  uuid: string;
  username: string;
  email: string;
  password: string; // Stored in plain text for this mock!
  first_name: string;
  last_name: string;
  phone_number?: string;
  gender?: string;
  dance_level?: string;
  interests?: string[];
  role: string; // "STUDIO_OWNER" | "TRAINER" | "CLIENT"
  created_at: string;
};

type DB = {
  users: User[];
};

function readDB(): DB {
  if (!fs.existsSync(DB_PATH)) {
    return { users: [] };
  }
  try {
    const content = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { users: [] };
  }
}

function writeDB(db: DB) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export const db = {
  users: {
    find: (predicate: (u: User) => boolean) => readDB().users.find(predicate),
    create: (user: User) => {
      const data = readDB();
      data.users.push(user);
      writeDB(data);
      return user;
    },
    update: (uuid: string, updates: Partial<User>) => {
      const data = readDB();
      const index = data.users.findIndex(u => u.uuid === uuid);
      if (index === -1) return null;
      data.users[index] = { ...data.users[index], ...updates };
      writeDB(data);
      return data.users[index];
    }
  }
};
