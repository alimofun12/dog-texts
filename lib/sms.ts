import twilio from "twilio";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

export function dogLine(): string {
  return env("TWILIO_PHONE_NUMBER");
}

export async function sendSms(to: string, body: string): Promise<void> {
  const client = twilio(env("TWILIO_ACCOUNT_SID"), env("TWILIO_AUTH_TOKEN"));
  await client.messages.create({ from: dogLine(), to, body });
}

/** Sends a few texts in order with a short pause, like a dog double texting. */
export async function sendTexts(to: string, texts: string[]): Promise<void> {
  for (let i = 0; i < texts.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 2500));
    await sendSms(to, texts[i]);
  }
}

/** Confirms a webhook really came from Twilio. */
export function isFromTwilio(signature: string | null, url: string, params: Record<string, string>): boolean {
  if (!signature) return false;
  return twilio.validateRequest(env("TWILIO_AUTH_TOKEN"), signature, url, params);
}
