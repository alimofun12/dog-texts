// The personality test, shared by the setup screens.
export type Question = {
  id: string;
  type: "text" | "chips" | "multi" | "area" | "breed";
  title: string;
  sub: string;
  placeholder?: string;
  options?: string[];
};

export function quickQuestions(N: string): Question[] {
  return [
    { id: "name", type: "text", title: "What's your dog's name?", sub: "The name they answer to. Mostly.", placeholder: "Biscuit" },
    { id: "callMe", type: "chips", title: `What does ${N} call you?`, sub: "They might adore you. They might just tolerate you. Be honest.", options: ["Mom", "Dad", "My human", "The food person", "The one who keeps leaving", "Roommate", "Depends if I have snacks"] },
    { id: "breed", type: "breed", title: "What kind of dog?", sub: "Tap one or type it. Spelling does not count.", placeholder: "Golden retriever mix", options: ["Mystery mutt", "Labrador Retriever", "Golden Retriever", "French Bulldog", "German Shepherd", "Pit Bull", "Goldendoodle", "Dachshund", "Chihuahua", "Corgi"] },
    { id: "energy", type: "chips", title: "Energy level?", sub: "Be honest.", options: ["Couch potato", "Chill", "Zoomies on schedule", "Total chaos"] },
    { id: "food", type: "multi", title: "Favorite foods and treats?", sub: "Pick all that apply.", options: ["Chicken", "Peanut butter", "Cheese", "Carrots", "Bacon", "Anything that hits the floor"] },
    { id: "nap", type: "chips", title: "Favorite nap spot?", sub: "Where they disappear to.", options: ["Your side of the bed", "The sunny spot", "The couch", "Their crate", "On top of you"] },
  ];
}

export function deepQuestions(N: string): Question[] {
  return [
    { id: "scared", type: "multi", title: `What is ${N} scared of?`, sub: "Pick all that apply.", options: ["Vacuum", "Thunder", "Mailman", "Skateboards", "The doorbell", "Nothing, fearless"] },
    { id: "nemesis", type: "text", title: "Who is the nemesis?", sub: "Every dog has one.", placeholder: "The neighbor's cat" },
    { id: "toy", type: "text", title: "Favorite toy?", sub: "The one that goes everywhere.", placeholder: "Squeaky duck" },
    { id: "greet", type: "chips", title: "How do they greet you at the door?", sub: "The big moment.", options: ["Full body wiggle", "Bring a toy", "Scream", "Play it cool", "Pretend to be asleep"] },
    { id: "quirk", type: "text", title: `Only ${N} does this...`, sub: "The weird little thing you love.", placeholder: "Sneezes when happy" },
  ];
}

export function notesQuestion(N: string): Question {
  return { id: "notes", type: "area", title: "Anything else?", sub: `Your own notes. Inside jokes, habits, things only you know. ${N} will use them.`, placeholder: "Hates baths but loves the hose. Steals socks. Judges what we watch on TV." };
}

export const BREEDS = ["Labrador Retriever", "Golden Retriever", "French Bulldog", "German Shepherd", "Poodle", "Bulldog", "Beagle", "Rottweiler", "Dachshund", "Corgi", "Australian Shepherd", "Yorkshire Terrier", "Boxer", "Cavalier King Charles Spaniel", "Doberman", "Great Dane", "Miniature Schnauzer", "Shih Tzu", "Boston Terrier", "Bernese Mountain Dog", "Pomeranian", "Havanese", "Siberian Husky", "Shiba Inu", "Chihuahua", "Border Collie", "Pit Bull", "Pug", "Maltese", "Greyhound", "Whippet", "Cocker Spaniel", "Goldendoodle", "Labradoodle", "Bichon Frise", "Jack Russell Terrier", "Akita", "Samoyed", "Basset Hound", "Weimaraner", "Vizsla", "Bloodhound", "Newfoundland", "Mystery mutt"];

export function lev(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

// Nicknames and sound alike spellings people actually type.
const ALIASES: Record<string, string> = {
  chiwawa: "Chihuahua", chiwauwa: "Chihuahua", chihuawa: "Chihuahua",
  frenchie: "French Bulldog", frenchy: "French Bulldog",
  lab: "Labrador Retriever", golden: "Golden Retriever", goldie: "Golden Retriever",
  doodle: "Goldendoodle", pittie: "Pit Bull", pitty: "Pit Bull", pitbull: "Pit Bull",
  yorkie: "Yorkshire Terrier", doxie: "Dachshund", wiener: "Dachshund", "sausage dog": "Dachshund", dashund: "Dachshund",
  aussie: "Australian Shepherd", husky: "Siberian Husky", shiba: "Shiba Inu", gsd: "German Shepherd",
  cavalier: "Cavalier King Charles Spaniel", schnauzer: "Miniature Schnauzer", berner: "Bernese Mountain Dog",
  pom: "Pomeranian", mutt: "Mystery mutt", mix: "Mystery mutt", "mixed breed": "Mystery mutt", rottie: "Rottweiler",
  dobie: "Doberman", bichon: "Bichon Frise", "jack russell": "Jack Russell Terrier", sheltie: "Border Collie",
};

/** "goldn retrivr" → ["Golden Retriever"]. Empty when it's already exact or too short to guess. */
export function suggestBreeds(input: string): string[] {
  const t = (input || "").trim().toLowerCase();
  if (t.length < 3 || BREEDS.some((b) => b.toLowerCase() === t)) return [];
  const alias = Object.keys(ALIASES).find((a) => a === t || (a.length > 4 && lev(a, t) <= 1));
  if (alias) return [ALIASES[alias]];
  const words = t.split(/\s+/);
  const limit = Math.max(2, Math.ceil(t.length * 0.4));
  return BREEDS.map((b) => {
    const bl = b.toLowerCase();
    if (bl.includes(t)) return { b, s: 0 };
    let s = lev(t, bl);
    const bw = bl.split(" ");
    for (const w of words) if (w.length > 2) for (const x of bw) s = Math.min(s, lev(w, x) + (bw.length > 1 ? 0.5 : 0));
    return { b, s };
  })
    .filter((x) => x.s <= limit)
    .sort((x, y) => x.s - y.s)
    .slice(0, 3)
    .map((x) => x.b);
}

export const QUIET_START = [
  { label: "8 PM", hour: 20 },
  { label: "9 PM", hour: 21 },
  { label: "10 PM", hour: 22 },
  { label: "11 PM", hour: 23 },
  { label: "Midnight", hour: 0 },
];
export const QUIET_END = [
  { label: "6 AM", hour: 6 },
  { label: "7 AM", hour: 7 },
  { label: "8 AM", hour: 8 },
  { label: "9 AM", hour: 9 },
];
export const FREQ_LABELS = ["A couple a day", "A few a day", "Regular check ins", "Lots of love", "Needy"];
