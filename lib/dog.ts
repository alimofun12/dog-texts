import Anthropic from "@anthropic-ai/sdk";
import type { DogProfile, ThreadMessage } from "./types";
import { personaPrompt, splitTexts, taskPrompt, transcript, type Task } from "./voice";
import { describeLocalTime } from "./schedule";

let anthropic: Anthropic | null = null;

/** Asks Claude to write the dog's next text(s). */
export async function writeDogTexts(p: DogProfile, thread: ThreadMessage[], task: Task): Promise<string[]> {
  anthropic ??= new Anthropic();
  const now = Date.now();
  const res = await anthropic.messages.create({
    model: process.env.DOG_MODEL || "claude-haiku-5-5",
    max_tokens: 300,
    system: personaPrompt(p),
    messages: [
      {
        role: "user",
        content: `Recent texts between you and your human:\n${transcript(thread, p.name)}\n\n${taskPrompt(task, describeLocalTime(now, p.timezone))}`,
      },
    ],
  });
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const texts = splitTexts(text, p.name);
  return texts.length ? texts : ["woof"];
}
