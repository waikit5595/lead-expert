import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

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

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    const message = value?.messages?.[0];
    const contact = value?.contacts?.[0];

    if (message) {
      const from = message.from;
      const text = message.text?.body || "No text";
      const name = contact?.profile?.name || "Unknown";

      console.log("📩 Saving message:", text);

      // 🔥 存进 Firestore
      await addDoc(collection(db, "messages"), {
        from,
        name,
        text,
        createdAt: serverTimestamp(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    return NextResponse.json({ error: "ok" }, { status: 200 });
  }
}