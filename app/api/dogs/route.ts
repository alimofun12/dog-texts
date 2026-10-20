import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getDog, saveDog, savePhotos } from "@/lib/store";
import { normalizePhone, prettyPhone } from "@/lib/phone";
import { dogLine } from "@/lib/sms";
import type { Answers, DogProfile } from "@/lib/types";

export const runtime = "nodejs";

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
const strList = (v: unknown, max = 12) =>
  Array.isArray(v) ? v.filter((x) => typeof x === "string").map((x) => (x as string).slice(0, 60)).slice(0, max) : undefined;
const isImage = (v: unknown, maxChars: number) =>
  typeof v === "string" && v.startsWith("data:image/jpeg;base64,") && v.length <= maxChars;
const hour = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 23 ? n : fallback;
};
const validZone = (tz: unknown) => {
  if (typeof tz !== "string") return "America/New_York";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "America/New_York";
  }
};

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const phone = normalizePhone(String(body.phone ?? ""));
  if (!phone) return NextResponse.json({ error: "That phone number doesn't look right." }, { status: 400 });

  const raw = (body.answers ?? {}) as Record<string, unknown>;
  const answers: Answers = {
    name: str(raw.name, 40),
    callMe: str(raw.callMe, 60),
    breed: str(raw.breed, 80),
    energy: str(raw.energy, 60),
    food: strList(raw.food),
    nap: str(raw.nap, 60),
    scared: strList(raw.scared),
    nemesis: str(raw.nemesis, 80),
    toy: str(raw.toy, 80),
    greet: str(raw.greet, 60),
    quirk: str(raw.quirk, 160),
    notes: str(raw.notes, 1500),
  };
  if (!answers.name) return NextResponse.json({ error: "Your dog needs a name." }, { status: 400 });

  const photos = Array.isArray(body.photos) ? body.photos.filter((x) => isImage(x, 400_000)).slice(0, 6) as string[] : [];
  const avatar = isImage(body.avatar, 300_000) ? (body.avatar as string) : null;

  const existing = await getDog(phone);
  const profile: DogProfile = {
    phone,
    contactId: existing?.contactId ?? randomBytes(9).toString("base64url"),
    name: answers.name,
    answers,
    chat: body.chat === "checkins" ? "checkins" : "chat",
    freq: Math.min(Math.max(Math.round(Number(body.freq) || 3), 1), 5),
    quietStart: hour(body.quietStart, 22),
    quietEnd: hour(body.quietEnd, 8),
    timezone: validZone(body.timezone),
    createdAt: existing?.createdAt ?? Date.now(),
    welcomed: false,
    paused: false,
    nextCheckinAt: null,
  };

  await saveDog(profile);
  await savePhotos(phone, avatar, photos);

  const line = dogLine();
  return NextResponse.json({ contactId: profile.contactId, dogLine: line, dogLinePretty: prettyPhone(line) });
}
