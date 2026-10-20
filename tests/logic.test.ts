import { test } from "node:test";
import assert from "node:assert/strict";
import { isQuiet, isQuietAt, localMinutes, planNext, quietHoursLength, textsPerDay } from "../lib/schedule.ts";
import { suggestBreeds } from "../lib/quiz.ts";
import { personaPrompt, splitTexts } from "../lib/voice.ts";
import { normalizePhone } from "../lib/phone.ts";
import { buildVCard } from "../lib/vcard.ts";

const NY = "America/New_York";
const p = { freq: 3, quietStart: 22, quietEnd: 8, timezone: NY };

test("quiet hours across midnight", () => {
  assert.equal(isQuietAt(23 * 60, 22, 8), true);
  assert.equal(isQuietAt(3 * 60, 22, 8), true);
  assert.equal(isQuietAt(8 * 60, 22, 8), false);
  assert.equal(isQuietAt(14 * 60, 22, 8), false);
  assert.equal(isQuietAt(1 * 60, 0, 7), true);
  assert.equal(isQuietAt(23 * 60, 0, 7), false);
  assert.equal(quietHoursLength(22, 8), 10);
  assert.equal(quietHoursLength(0, 6), 6);
});

test("local time respects the owner's time zone", () => {
  // 2026-10-20 18:00 UTC is 2:00 PM in New York (EDT)
  assert.equal(localMinutes(Date.UTC(2026, 9, 20, 18, 0), NY), 14 * 60);
});

test("frequency maps to texts per day", () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(textsPerDay), [2, 3, 5, 7, 10]);
  assert.equal(textsPerDay(99), 10);
});

test("next check in never lands in quiet hours", () => {
  let now = Date.UTC(2026, 9, 20, 12, 0);
  for (let i = 0; i < 500; i++) {
    const next = planNext(now, p);
    assert.ok(next > now, "moves forward");
    assert.equal(isQuiet(next, p), false, `quiet at ${new Date(next).toISOString()}`);
    now = next;
  }
});

test("a needy dog texts more than a chill one", () => {
  const start = Date.UTC(2026, 9, 20, 13, 0);
  const count = (freq: number) => {
    let t = start, n = 0;
    while (t < start + 7 * 86400_000) { t = planNext(t, { ...p, freq }); n++; }
    return n / 7;
  };
  const chill = count(1), needy = count(5);
  assert.ok(chill >= 1.5 && chill <= 3, `chill ${chill}`);
  assert.ok(needy >= 7 && needy <= 13, `needy ${needy}`);
});

test("breed suggestions forgive spelling", () => {
  assert.equal(suggestBreeds("goldn retrivr")[0], "Golden Retriever");
  assert.equal(suggestBreeds("labardor")[0], "Labrador Retriever");
  assert.equal(suggestBreeds("chiwawa")[0], "Chihuahua");
  assert.equal(suggestBreeds("frenchie")[0], "French Bulldog");
  assert.deepEqual(suggestBreeds("Pug"), []);
  assert.deepEqual(suggestBreeds("xq"), []);
});

test("dog texts are cleaned up", () => {
  assert.deepEqual(splitTexts('Biscuit: "where are you" ||| woof', "Biscuit"), ["where are you", "woof"]);
  assert.deepEqual(splitTexts("i ate a sock — it was fine", "Biscuit"), ["i ate a sock, it was fine"]);
  assert.deepEqual(splitTexts("a|||b|||c", "Biscuit"), ["a", "b"]);
  assert.deepEqual(splitTexts("   ", "Biscuit"), []);
});

test("persona includes the quiz answers and the owner's notes", () => {
  const prompt = personaPrompt({
    name: "Biscuit",
    chat: "chat",
    answers: { callMe: "The one who keeps leaving", nemesis: "The neighbor's cat", food: ["Cheese"], notes: "Steals socks." },
  });
  assert.match(prompt, /You are Biscuit/);
  assert.match(prompt, /salty/);
  assert.match(prompt, /neighbor's cat/);
  assert.match(prompt, /Steals socks/);
  assert.match(prompt, /Never break character/);
});

test("phone numbers normalize to E.164", () => {
  assert.equal(normalizePhone("(917) 555-0142"), "+19175550142");
  assert.equal(normalizePhone("1 917 555 0142"), "+19175550142");
  assert.equal(normalizePhone("+44 7700 900123"), "+447700900123");
  assert.equal(normalizePhone("12345"), null);
});

test("contact card is valid and folds long lines", () => {
  const card = buildVCard({ name: "Biscuit", phone: "+15550100142", photoBase64: "A".repeat(500) });
  assert.match(card, /^BEGIN:VCARD\r\nVERSION:3\.0\r\n/);
  assert.match(card, /FN:Biscuit\r\n/);
  assert.match(card, /TEL;TYPE=CELL:\+15550100142/);
  assert.ok(card.split("\r\n").every((l) => l.length <= 75), "lines folded");
  assert.match(card, /END:VCARD\r\n$/);
});
