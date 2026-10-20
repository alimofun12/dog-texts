import { after } from "next/server";
import { appendThread, getDog, getThread, saveDog } from "@/lib/store";
import { writeDogTexts } from "@/lib/dog";
import { isFromTwilio, sendTexts } from "@/lib/sms";

export const runtime = "nodejs";
export const maxDuration = 60;

const STOP = new Set(["stop", "stopall", "unsubscribe", "cancel", "end", "quit", "optout", "revoke"]);
const START = new Set(["start", "unstop", "yes", "optin"]);

function twiml(message?: string) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = message ? `<Message>${esc(message)}</Message>` : "";
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

// Twilio calls this whenever someone texts the dog line.
export async function POST(req: Request) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, key) => {
    params[key] = String(v);
  });

  const base = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
  if (!isFromTwilio(req.headers.get("x-twilio-signature"), `${base}/api/sms`, params)) {
    return new Response("Forbidden", { status: 403 });
  }

  const from = params.From;
  const text = (params.Body || "").trim();
  const word = text.toLowerCase().replace(/[^a-z]/g, "");

  const dog = await getDog(from);
  if (!dog) {
    return twiml(`This number belongs to a dog. Set yours up at ${base}`);
  }

  // Twilio sends the official opt out and opt in replies itself. We just pause or resume.
  if (STOP.has(word)) {
    await saveDog({ ...dog, paused: true });
    return twiml();
  }
  if (START.has(word)) {
    await saveDog({ ...dog, paused: false });
    return twiml();
  }
  if (!text) return twiml();

  const now = Date.now();
  await appendThread(dog.phone, { from: "human", text, at: now });

  // Check ins only mode: the dog listens but doesn't text back.
  if (dog.chat === "checkins" || dog.paused) return twiml();

  // Answer after responding to Twilio, so slow replies never time out the webhook.
  after(async () => {
    try {
      const thread = await getThread(dog.phone);
      const texts = await writeDogTexts(dog, thread, "reply");
      await new Promise((r) => setTimeout(r, 1500)); // a beat, so it feels typed
      await sendTexts(dog.phone, texts);
      const sentAt = Date.now();
      await appendThread(dog.phone, ...texts.map((t) => ({ from: "dog" as const, text: t, at: sentAt })));
      // Don't follow a conversation with a random check in right away.
      const fresh = await getDog(dog.phone);
      if (fresh && fresh.nextCheckinAt && fresh.nextCheckinAt < sentAt + 45 * 60_000) {
        await saveDog({ ...fresh, nextCheckinAt: sentAt + (45 + Math.floor(Math.random() * 45)) * 60_000 });
      }
    } catch (err) {
      console.error("reply failed", err);
    }
  });

  return twiml();
}
