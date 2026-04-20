import { promises as fs } from "fs";
import path from "path";

type TokenRecord = {
  userId: string;
  email?: string;
  refresh_token: string;
  scope?: string;
  token_type?: string;
};

const STORE_PATH = path.join(process.cwd(), ".data", "tokens.json");

async function readStore(): Promise<Record<string, TokenRecord>> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    return JSON.parse(raw);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw err;
  }
}

async function writeStore(data: Record<string, TokenRecord>): Promise<void> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
}

export async function saveTokenRecord(record: TokenRecord): Promise<void> {
  const store = await readStore();
  store[record.userId] = { ...store[record.userId], ...record };
  await writeStore(store);
}

export async function getRefreshToken(userId: string): Promise<string> {
  const store = await readStore();
  const record = store[userId];
  if (!record?.refresh_token) {
    throw new Error(`No refresh token for user ${userId}`);
  }
  return record.refresh_token;
}

export async function getUserEmail(userId: string): Promise<string | undefined> {
  const store = await readStore();
  return store[userId]?.email;
}

export async function hasRefreshToken(userId: string): Promise<boolean> {
  const store = await readStore();
  return Boolean(store[userId]?.refresh_token);
}
