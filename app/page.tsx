"use client";

import { useMemo, useState } from "react";
import { deepQuestions, FREQ_LABELS, notesQuestion, QUIET_END, QUIET_START, quickQuestions, suggestBreeds, type Question } from "@/lib/quiz";
import { resizePhoto, squareAvatar } from "@/lib/images";
import { Back, Bell, Bubble, Check, Close, Lock, Paw, Plus, Star } from "./icons";

type Screen = "welcome" | "path" | "quiz" | "photos" | "reveal" | "settings" | "phone" | "contact" | "done";
type AnswerValue = string | string[];

const ENERGY: Record<string, number> = { "Couch potato": 20, "Chill": 45, "Zoomies on schedule": 75, "Total chaos": 98 };
const NAP: Record<string, number> = { "Your side of the bed": 92, "On top of you": 96, "The couch": 78, "The sunny spot": 84, "Their crate": 62 };
const GREET: Record<string, number> = { "Scream": 45, "Full body wiggle": 30, "Bring a toy": 20, "Play it cool": 8, "Pretend to be asleep": 25 };
const CLASS: Record<string, string> = { "Couch potato": "The Professional Napper", "Chill": "The Gentle Soul", "Zoomies on schedule": "The Zoomie Athlete", "Total chaos": "The Chaos Goblin" };
const LEVELS = ["Pup", "Good Dog", "Very Good Dog", "Best Dog", "Legend"];

const filled = (v: AnswerValue | undefined) => (Array.isArray(v) ? v.length > 0 : !!(v || "").trim());

export default function Setup() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [mode, setMode] = useState<"quick" | "deep">("quick");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [avatarIdx, setAvatarIdx] = useState(0);
  const [chat, setChat] = useState<"chat" | "checkins">("chat");
  const [freq, setFreq] = useState(3);
  const [quietStart, setQuietStart] = useState(22);
  const [quietEnd, setQuietEnd] = useState(8);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ contactId: string; dogLine: string; dogLinePretty: string } | null>(null);
  const [savedContact, setSavedContact] = useState(false);

  const name = String(answers.name || "").trim();
  const N = name || "your dog";
  const Name = name || "Your dog";

  const steps: Question[] = useMemo(() => {
    const quick = quickQuestions(N);
    return mode === "deep" ? [...quick, ...deepQuestions(N), notesQuestion(N)] : [...quick, notesQuestion(N)];
  }, [mode, N]);
  const q = steps[Math.min(step, steps.length - 1)];
  const val = answers[q.id];
  const isLast = step === steps.length - 1;

  const allQs = [...quickQuestions(N), ...deepQuestions(N), notesQuestion(N)];
  const xp = allQs.filter((x) => filled(answers[x.id])).length * 10 + Math.min(photos.length, 6) * 5 + (result ? 20 : 0);
  const level = 1 + Math.floor(xp / 60);

  const setAnswer = (id: string, v: AnswerValue) => setAnswers((a) => ({ ...a, [id]: v }));
  const go = (s: Screen) => {
    setError("");
    setScreen(s);
    window.scrollTo(0, 0);
  };

  const pick = (label: string) => {
    if (q.type === "multi") {
      const cur = Array.isArray(val) ? [...val] : [];
      const i = cur.indexOf(label);
      if (i > -1) cur.splice(i, 1);
      else cur.push(label);
      setAnswer(q.id, cur);
    } else setAnswer(q.id, label);
  };
  const selected = (label: string) => (Array.isArray(val) ? val.includes(label) : val === label);

  const next = () => {
    if (!isLast) setStep(step + 1);
    else go("photos");
  };
  const back = () => (step > 0 ? setStep(step - 1) : go("path"));

  async function addPhotos(files: FileList | null) {
    if (!files) return;
    const room = 6 - photos.length;
    const picked = Array.from(files).slice(0, Math.max(room, 0));
    const out: string[] = [];
    for (const f of picked) {
      try {
        out.push(await resizePhoto(f));
      } catch {
        setError("One of those photos couldn't be read. Try a different one.");
      }
    }
    if (out.length) setPhotos((p) => [...p, ...out].slice(0, 6));
  }
  const removePhoto = (i: number) => {
    setPhotos((p) => p.filter((_, j) => j !== i));
    setAvatarIdx((a) => (i < a ? a - 1 : i === a ? 0 : a));
  };
  const avatar = photos[Math.min(avatarIdx, Math.max(photos.length - 1, 0))];

  // Stats for the character card
  const foods = (answers.food as string[]) || [];
  const scared = ((answers.scared as string[]) || []).filter((x) => x !== "Nothing, fearless");
  const dramaOpen = mode === "deep" && (filled(answers.scared) || filled(answers.greet));
  const stats = [
    { label: "Energy", value: ENERGY[answers.energy as string] ?? 50, color: "var(--orange)" },
    { label: "Snack drive", value: foods.includes("Anything that hits the floor") ? 100 : Math.min(100, 20 + foods.length * 16), color: "var(--butter)" },
    { label: "Nap power", value: NAP[answers.nap as string] ?? 70, color: "var(--sky)" },
    { label: "Drama", value: Math.min(100, 15 + scared.length * 16 + (GREET[answers.greet as string] ?? 0)), color: "var(--pink)", locked: !dramaOpen },
  ];
  const loadout = [
    foods.length ? { label: "Snacks", value: foods.slice(0, 2).join(", ") } : null,
    answers.nap ? { label: "Nap spot", value: answers.nap as string } : null,
    filled(answers.toy) ? { label: "Toy", value: answers.toy as string } : null,
    filled(answers.nemesis) ? { label: "Nemesis", value: answers.nemesis as string } : null,
    scared.length ? { label: "Scared of", value: scared.slice(0, 2).join(", ") } : null,
    filled(answers.quirk) ? { label: "Quirk", value: answers.quirk as string } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const avatarSquare = avatar ? await squareAvatar(avatar) : null;
      const res = await fetch("/api/dogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          answers,
          chat,
          freq,
          quietStart,
          quietEnd,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          avatar: avatarSquare,
          photos,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setResult(data);
      go("contact");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function sayHello() {
    if (!result) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/hello", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: result.contactId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      go("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const Avatar = ({ size }: { size: number }) => (
    <div className="avatar" style={{ width: size, height: size }}>
      {avatar ? <img src={avatar} alt={Name} /> : <Paw size={size / 2} />}
    </div>
  );
  const Err = () => (error ? <div className="error" role="alert">{error}</div> : null);

  return (
    <main className="app">
      {screen === "welcome" && (
        <section className="screen" style={{ paddingTop: 48 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="card" style={{ alignSelf: "flex-start", padding: "12px 16px", borderRadius: "22px 22px 22px 6px", fontWeight: 800, fontSize: 17 }}>i miss you</div>
            <div className="card" style={{ alignSelf: "center", padding: "12px 16px", borderRadius: "22px 22px 22px 6px", fontWeight: 800, fontSize: 17, background: "var(--sky)" }}>is it snack time</div>
            <div className="card" style={{ alignSelf: "flex-end", padding: "12px 16px", borderRadius: "22px 22px 22px 6px", fontWeight: 800, fontSize: 17, background: "var(--butter)" }}>woof</div>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 180 }}>
            <div className="avatar" style={{ width: 160, height: 160, boxShadow: "0 6px 0 var(--ink)" }}>
              <Paw size={88} />
            </div>
          </div>
          <h1>Your dog is about to get your number.</h1>
          <p className="sub">Tell us who they are. They handle the texting.</p>
          <button className="cta" onClick={() => go("path")}>Press start</button>
        </section>
      )}

      {screen === "path" && (
        <section className="screen">
          <button className="iconbtn" aria-label="Back" onClick={() => go("welcome")}><Back /></button>
          <h1>Choose your quest</h1>
          <p className="sub">The more you share, the more your dog sounds like your dog.</p>
          <button className="card quest" onClick={() => { setMode("quick"); setStep(0); go("quiz"); }}>
            <div className="row"><span className="name">Quick quiz</span><span className="xp" style={{ background: "var(--mint)" }}>+70 XP</span></div>
            <span className="sub" style={{ fontSize: 15 }}>7 questions, about 2 minutes. The essentials.</span>
          </button>
          <button className="card quest" style={{ background: "var(--butter)" }} onClick={() => { setMode("deep"); setStep(0); go("quiz"); }}>
            <div className="row"><span className="name">Deep dive</span><span className="xp">+120 XP</span></div>
            <span style={{ fontWeight: 700, fontSize: 15 }}>12 questions, about 5 minutes. Fears, nemesis, favorite toy. Unlocks the Drama stat.</span>
          </button>
        </section>
      )}

      {screen === "quiz" && (
        <section className="screen">
          <div className="topbar">
            <button className="iconbtn" aria-label="Back" onClick={back}><Back /></button>
            <div className="progress" aria-hidden="true"><div style={{ width: `${Math.round(((step + 1) / steps.length) * 100)}%` }} /></div>
            <span className="pill">{xp} XP</span>
          </div>
          <p className="small" style={{ fontFamily: "var(--display)", fontSize: 15 }}>
            {mode === "deep" ? "Deep dive" : "Quick quiz"}, {step + 1} of {steps.length}
          </p>
          <h2>{q.title}</h2>
          <p className="sub">{q.sub}</p>
          <div className="scroll">
            {(q.type === "text" || q.type === "breed") && (
              <input
                className="field"
                type="text"
                aria-label={q.title}
                placeholder={q.placeholder}
                value={typeof val === "string" ? val : ""}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !(q.id === "name" && !name)) next(); }}
                autoFocus
              />
            )}
            {q.type === "breed" && suggestBreeds(String(val || "")).length > 0 && (
              <div className="chips" style={{ alignItems: "center" }}>
                <span className="small" style={{ fontSize: 14 }}>Did you mean</span>
                {suggestBreeds(String(val || "")).map((b) => (
                  <button key={b} className="chip suggest" onClick={() => setAnswer("breed", b)}>{b}</button>
                ))}
              </div>
            )}
            {q.type === "area" && (
              <textarea className="field" aria-label={q.title} placeholder={q.placeholder} value={typeof val === "string" ? val : ""} onChange={(e) => setAnswer(q.id, e.target.value)} />
            )}
            {q.type === "breed" && <p className="small" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Popular</p>}
            {(q.type === "chips" || q.type === "multi" || q.type === "breed") && (
              <div className="chips">
                {q.options!.map((o) => (
                  <button key={o} className="chip" aria-pressed={selected(o)} onClick={() => pick(o)}>
                    {selected(o) && <Check />}
                    {o}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="bottom">
            <button className="cta" disabled={q.id === "name" && !name} onClick={next}>{isLast ? "Next: photos" : "Next"}</button>
            {q.id !== "name" && !filled(val) && <button className="ghost" onClick={next}>Skip for now</button>}
          </div>
        </section>
      )}

      {screen === "photos" && (
        <section className="screen">
          <div className="topbar">
            <button className="iconbtn" aria-label="Back" onClick={() => go("quiz")}><Back /></button>
            <div style={{ flex: 1 }} />
            <span className="pill">{xp} XP</span>
          </div>
          <h2>Add photos of {Name}</h2>
          <p className="sub">Real photos only. Tap the star on the one you want as their contact photo. +5 XP each.</p>
          <Err />
          <div className="photos">
            {photos.map((src, i) => (
              <div className="photo" key={i}>
                <img src={src} alt={`${Name}, photo ${i + 1}`} />
                <button className="dot star" aria-label="Use as contact photo" aria-pressed={i === avatarIdx} onClick={() => setAvatarIdx(i)}><Star filled={i === avatarIdx} /></button>
                <button className="dot remove" aria-label="Remove photo" onClick={() => removePhoto(i)}><Close /></button>
              </div>
            ))}
            {photos.length < 6 && (
              <label className="add">
                <Plus />
                Add photo
                <input className="sr" type="file" accept="image/*" multiple onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
              </label>
            )}
            {Array.from({ length: Math.max(0, 2 - photos.length) }).map((_, i) => (
              <div className="empty" key={`e${i}`}><Paw size={34} /></div>
            ))}
          </div>
          <p className="small center">{photos.length} of 6 added. 3 or more recommended.</p>
          <div className="bottom">
            <button className="cta" disabled={!photos.length} onClick={() => go("reveal")}>Reveal {Name}</button>
          </div>
        </section>
      )}

      {screen === "reveal" && (
        <section className="screen">
          <span className="pill mint">Personality unlocked</span>
          <div className="card" style={{ padding: "22px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <Avatar size={124} />
            <div className="center">
              <div style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 30 }}>{Name}</div>
              <div style={{ fontWeight: 800, color: "var(--muted)" }}>{CLASS[answers.energy as string] || "The Mystery Pup"}</div>
              {answers.breed && <div className="small" style={{ fontSize: 14 }}>{answers.breed as string}</div>}
            </div>
            <span className="pill">Level {level}, {LEVELS[Math.min(level - 1, 4)]}, {xp} XP</span>
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
              {stats.map((s) => (
                <div className="stat" key={s.label}>
                  <span className="label">{s.label}</span>
                  {s.locked ? (
                    <span className="locked"><Lock /> Deep dive</span>
                  ) : (
                    <div className="bar"><div style={{ width: `${s.value}%`, background: s.color }} /></div>
                  )}
                </div>
              ))}
            </div>
          </div>
          {loadout.length > 0 && (
            <div className="loadout">
              {loadout.map((l) => (
                <div key={l.label}><span>{l.label}</span><span>{l.value}</span></div>
              ))}
            </div>
          )}
          <div className="bottom">
            <button className="cta" onClick={() => go("settings")}>Set up texting</button>
          </div>
        </section>
      )}

      {screen === "settings" && (
        <section className="screen">
          <button className="iconbtn" aria-label="Back" onClick={() => go("reveal")}><Back /></button>
          <h2>How should {Name} text you?</h2>
          <div className="modes">
            <button className="card mode" aria-pressed={chat === "chat"} onClick={() => setChat("chat")}>
              <Bubble />
              <strong>Chat back</strong>
              <span>Reply anytime. {Name} answers.</span>
            </button>
            <button className="card mode" aria-pressed={chat === "checkins"} onClick={() => setChat("checkins")}>
              <Bell />
              <strong>Just check ins</strong>
              <span>Hellos through the day. No replies needed.</span>
            </button>
          </div>
          <div className="card panel">
            <label htmlFor="freq" className="title">How often</label>
            <input id="freq" type="range" min={1} max={5} step={1} value={freq} onChange={(e) => setFreq(Number(e.target.value))} />
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 13, color: "var(--muted)" }}>
              <span>Chill</span><span style={{ color: "var(--ink)", fontSize: 15 }}>{FREQ_LABELS[freq - 1]}</span><span>Needy</span>
            </div>
          </div>
          <div className="card panel">
            <span className="title">Quiet hours</span>
            <span className="small" style={{ fontSize: 14 }}>{Name} naps too. No texts during these hours.</span>
            <div className="two">
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label htmlFor="qs" className="small">From</label>
                <select id="qs" className="field" style={{ padding: "10px 12px", fontSize: 16 }} value={quietStart} onChange={(e) => setQuietStart(Number(e.target.value))}>
                  {QUIET_START.map((o) => <option key={o.hour} value={o.hour}>{o.label}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label htmlFor="qe" className="small">Until</label>
                <select id="qe" className="field" style={{ padding: "10px 12px", fontSize: 16 }} value={quietEnd} onChange={(e) => setQuietEnd(Number(e.target.value))}>
                  {QUIET_END.map((o) => <option key={o.hour} value={o.hour}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="bottom">
            <button className="cta" onClick={() => go("phone")}>Next</button>
          </div>
        </section>
      )}

      {screen === "phone" && (
        <section className="screen">
          <button className="iconbtn" aria-label="Back" onClick={() => go("settings")}><Back /></button>
          <label htmlFor="phone"><h2>What's your number?</h2></label>
          <p className="sub">{Name} needs it to text you.</p>
          <input id="phone" className="field" type="tel" inputMode="tel" autoComplete="tel" placeholder="(555) 010 1234" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ fontSize: 22 }} />
          <p className="small">Regular texts from a dog line. Reply STOP anytime to pause. Message and data rates may apply.</p>
          <Err />
          <div className="bottom">
            <button className="cta" disabled={!phone.trim() || busy} onClick={submit}>{busy ? "Saving..." : `Get ${Name}'s number`}</button>
          </div>
        </section>
      )}

      {screen === "contact" && result && (
        <section className="screen" style={{ paddingTop: 36 }}>
          <span className="pill">New contact unlocked</span>
          <div className="card" style={{ padding: "28px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <Avatar size={140} />
            <div style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 32 }}>{Name}</div>
            <div style={{ width: "100%", borderTop: "3px solid var(--ink)", paddingTop: 14 }}>
              <div className="small">mobile</div>
              <div style={{ fontWeight: 800, fontSize: 19 }}>{result.dogLinePretty}</div>
            </div>
          </div>
          <Err />
          <div className="bottom">
            <a className="cta" href={`/api/contact/${result.contactId}`} onClick={() => setSavedContact(true)}>
              1. Save {Name} to contacts
            </a>
            <p className="small center">Opens the contact card. Tap Create New Contact, then come back here.</p>
            <button className="cta mint" disabled={!savedContact || busy} onClick={sayHello}>
              {busy ? `${Name} is typing...` : `2. Done. Text me, ${Name}`}
            </button>
            {!savedContact && <button className="ghost" onClick={() => setSavedContact(true)}>I'll save it later</button>}
          </div>
        </section>
      )}

      {screen === "done" && result && (
        <section className="screen" style={{ paddingTop: 36 }}>
          <span className="pill mint">All set</span>
          <h1>Check your phone.</h1>
          <p className="sub">{Name} just texted you. From here on, everything happens in Messages.</p>
          <div className="card notif">
            <Avatar size={48} />
            <div style={{ flex: 1 }}>
              <div className="who"><span>{Name}</span><span className="small">now</span></div>
              <div style={{ fontWeight: 700 }}>New message</div>
            </div>
          </div>
          <div className="bottom">
            <a className="cta" href={`sms:${result.dogLine}`}>Open Messages</a>
            <p className="small center">Want to change something? Run setup again with the same number.</p>
          </div>
        </section>
      )}
    </main>
  );
}
