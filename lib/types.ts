export type Answers = {
  name?: string;
  callMe?: string;
  breed?: string;
  energy?: string;
  food?: string[];
  nap?: string;
  scared?: string[];
  nemesis?: string;
  toy?: string;
  greet?: string;
  quirk?: string;
  notes?: string;
};

export type ChatMode = "chat" | "checkins";

export type DogProfile = {
  phone: string; // owner's phone, E.164
  contactId: string; // random id used in the contact card link
  name: string;
  answers: Answers;
  chat: ChatMode;
  freq: number; // 1 to 5
  quietStart: number; // hour 0..23 when quiet hours begin
  quietEnd: number; // hour 0..23 when quiet hours end
  timezone: string; // IANA zone from the owner's phone
  createdAt: number;
  welcomed: boolean; // first text sent
  paused: boolean; // owner texted STOP
  nextCheckinAt: number | null;
};

export type ThreadMessage = {
  from: "dog" | "human";
  text: string;
  at: number;
};
