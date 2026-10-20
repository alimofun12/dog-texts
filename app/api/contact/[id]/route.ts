import { getAvatar, getDog, phoneForContact } from "@/lib/store";
import { dogLine } from "@/lib/sms";
import { buildVCard } from "@/lib/vcard";

export const runtime = "nodejs";

// The contact card: the dog's name, the dog line, and their real photo.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const phone = await phoneForContact(id);
  const dog = phone ? await getDog(phone) : null;
  if (!dog) return new Response("Not found", { status: 404 });

  const avatar = await getAvatar(dog.phone);
  const card = buildVCard({
    name: dog.name,
    phone: dogLine(),
    photoBase64: avatar ? avatar.replace(/^data:image\/jpeg;base64,/, "") : null,
  });
  const file = dog.name.replace(/[^\w ]/g, "").trim() || "My dog";
  return new Response(card, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}.vcf"`,
      "Cache-Control": "no-store",
    },
  });
}
