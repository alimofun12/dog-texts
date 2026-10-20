const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\r?\n/g, "\\n");

// vCard lines over 75 characters must be folded with CRLF plus a space.
function fold(line: string): string {
  if (line.length <= 75) return line;
  const out = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) out.push(" " + line.slice(i, i + 74));
  return out.join("\r\n");
}

export function buildVCard(c: { name: string; phone: string; photoBase64: string | null }): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:;${esc(c.name)};;;`,
    `FN:${esc(c.name)}`,
    `TEL;TYPE=CELL:${c.phone}`,
    "NOTE:Your dog. Text anytime.",
  ];
  if (c.photoBase64) lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${c.photoBase64}`);
  lines.push("END:VCARD");
  return lines.map(fold).join("\r\n") + "\r\n";
}
