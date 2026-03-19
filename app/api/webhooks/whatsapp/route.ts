import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Verification failed", { status: 403 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("🔥 FULL WEBHOOK BODY:", JSON.stringify(body, null, 2));

    // 防止 undefined crash
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    const message = value?.messages?.[0];
    const contact = value?.contacts?.[0];

    if (message) {
      const from = message.from;
      const text = message.text?.body || "No text";
      const name = contact?.profile?.name || "Unknown";

      console.log("📩 Incoming Message:");
      console.log("From:", from);
      console.log("Name:", name);
      console.log("Text:", text);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 200 }); 
    // ⚠️ 一定要 return 200，不然 Meta 会一直 retry
  }
}