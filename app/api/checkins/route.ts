import { NextResponse } from "next/server";
import { allDogPhones, appendThread, getDog, getThread, saveDog } from "@/lib/store";
import { writeDogTexts } from "@/lib/dog";
import { sendTexts } from "@/lib/sms";
import { isQuiet, planNext } from "@/lib/schedule";

export const runtime = "nodejs";
export const maxDuration = 300;

// Runs every few minutes (GitHub Actions). Sends each dog's check in when it's due.
async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const report = { checked: 0, sent: 0, rescheduled: 0, failed: 0 };

  for (const phone of await allDogPhones()) {
    const dog = await getDog(phone);
    if (!dog || dog.paused || !dog.welcomed) continue;
    report.checked++;

    if (!dog.nextCheckinAt) {
      await saveDog({ ...dog, nextCheckinAt: planNext(now, dog) });
      report.rescheduled++;
      continue;
    }
    if (dog.nextCheckinAt > now) continue;

    if (isQuiet(now, dog)) {
      await saveDog({ ...dog, nextCheckinAt: planNext(now, dog) });
      report.rescheduled++;
      continue;
    }

    try {
      // Claim this check in first so overlapping runs can't double send.
      await saveDog({ ...dog, nextCheckinAt: planNext(now, dog) });
      const texts = await writeDogTexts(dog, await getThread(phone), "checkin");
      await sendTexts(phone, texts);
      await appendThread(phone, ...texts.map((text) => ({ from: "dog" as const, text, at: Date.now() })));
      report.sent++;
    } catch (err) {
      console.error("checkin failed", phone.slice(-4), err);
      report.failed++;
    }
  }

  return NextResponse.json(report);
}

export const GET = run;
export const POST = run;
