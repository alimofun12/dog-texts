import { Redis } from "@upstash/redis";
import type { DogProfile, ThreadMessage } from "./types";

let client: Redis | null = null;

function redis(): Redis {
  if (client) return client;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Redis is not configured. Connect Upstash Redis in Vercel > Storage.");
  client = new Redis({ url, token });
  return client;
}

const k = {
  dog: (phone: string) => `dog:${phone}`,
  avatar: (phone: string) => `dog:${phone}:avatar`,
  photos: (phone: string) => `dog:${phone}:photos`,
  thread: (phone: string) => `dog:${phone}:thread`,
  contact: (id: string) => `contact:${id}`,
  all: "dogs:all",
};

const THREAD_KEEP = 40;

export async function getDog(phone: string): Promise<DogProfile | null> {
  return (await redis().get<DogProfile>(k.dog(phone))) ?? null;
}

export async function saveDog(p: DogProfile): Promise<void> {
  const r = redis();
  await r.set(k.dog(p.phone), p);
  await r.set(k.contact(p.contactId), p.phone);
  await r.sadd(k.all, p.phone);
}

export async function savePhotos(phone: string, avatar: string | null, photos: string[]): Promise<void> {
  const r = redis();
  if (avatar) await r.set(k.avatar(phone), avatar);
  else await r.del(k.avatar(phone));
  await r.set(k.photos(phone), photos);
}

export async function getAvatar(phone: string): Promise<string | null> {
  return (await redis().get<string>(k.avatar(phone))) ?? null;
}

export async function phoneForContact(id: string): Promise<string | null> {
  return (await redis().get<string>(k.contact(id))) ?? null;
}

export async function allDogPhones(): Promise<string[]> {
  return (await redis().smembers(k.all)) as string[];
}

export async function appendThread(phone: string, ...msgs: ThreadMessage[]): Promise<void> {
  if (!msgs.length) return;
  const r = redis();
  await r.rpush(k.thread(phone), ...msgs.map((m) => JSON.stringify(m)));
  await r.ltrim(k.thread(phone), -THREAD_KEEP, -1);
}

export async function getThread(phone: string): Promise<ThreadMessage[]> {
  const rows = await redis().lrange(k.thread(phone), 0, -1);
  return rows
    .map((row) => {
      if (typeof row === "string") {
        try {
          return JSON.parse(row) as ThreadMessage;
        } catch {
          return null;
        }
      }
      return row as unknown as ThreadMessage;
    })
    .filter((m): m is ThreadMessage => !!m && typeof m.text === "string");
}
