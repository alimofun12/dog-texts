import { NextResponse } from "next/server";
import { appendThread, getDog, phoneForContact, saveDog } from "@/lib/store";
import { writeDogTexts } from "@/lib/dog";
import { sendTexts } from "@/lib/sms";
import { planNext } from "@/lib/schedule";

export const runtime = "nodejs";
export const maxDuration = 60;

// Sends the dog's very first text once the owner has saved the contact.
export async function POST(req: Request) {
  const { contactId } = (await req.json().catch(() => ({}))) as { contactId?: string };
  if (!contactId) return NextResponse.json({ error: "Missing dog" }, { status: 400 });
  const phone = await phoneForContact(contactId);
  const dog = phone ? await getDog(phone) : null;
  if (!dog) return NextResponse.json({ error: "Dog not found" }, { status: 404 });
  if (dog.welcomed) return NextResponse.json({ ok: true, already: true });

  // Mark first so a double tap can't send two hellos.
  await saveDog({ ...dog, welcomed: true });
  try {
    const texts = await writeDogTexts(dog, [], "welcome");
    await sendTexts(dog.phone, texts);
    const now = Date.now();
    await appendThread(dog.phone, ...texts.map((text) => ({ from: "dog" as const, text, at: now })));
    await saveDog({ ...dog, welcomed: true, nextCheckinAt: planNext(now, dog) });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("hello failed", err);
    await saveDog({ ...dog, welcomed: false });
    return NextResponse.json({ error: "Couldn't send the first text. Try again in a minute." }, { status: 502 });
  }
}
