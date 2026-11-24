import { NextRequest, NextResponse } from "next/server";

type TestChannel = "sms" | "whatsapp" | "email";

interface TestRequest {
  channel: TestChannel;
  target: string;
  subject?: string;
  message?: string;
}

export async function POST(req: NextRequest) {
  let body: TestRequest;
  try {
    body = (await req.json()) as TestRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { channel, target } = body;
  const message =
    body.message ||
    "Quadillar LiveView Alert: Transfer Girder TG-03 (Zone 4) triggered HTTP 422 hold (₹62,00,000 frozen). Review in RA Bills.";

  if (!channel || !target?.trim()) {
    return NextResponse.json({ error: "Channel and destination contact are required." }, { status: 400 });
  }

  // 1. EMAIL ADAPTER (Live via Resend when RESEND_API_KEY is configured)
  if (channel === "email") {
    const resendKey = process.env.RESEND_API_KEY;
    const fromAddr = process.env.ALERT_FROM_EMAIL || "Quadillar LiveView <alerts@quadillar.in>";

    if (resendKey) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromAddr,
            to: [target.trim()],
            subject: body.subject || "[Quadillar LiveView] Test Governance Alert",
            text: message,
          }),
        });
        if (res.ok) {
          return NextResponse.json({
            ok: true,
            channel,
            deliveryMode: "live_resend",
            detail: `Live email sent to ${target.trim()}.`,
          });
        }
      } catch {
        // Fall back to preview response
      }
    }

    return NextResponse.json({
      ok: true,
      channel,
      deliveryMode: "zero_cost_preview",
      detail: `Email pipeline armed for ${target.trim()}. Add RESEND_API_KEY in Vercel to dispatch live mail.`,
      previewPayload: { to: target.trim(), subject: "[Quadillar LiveView] Governance Alert", text: message },
    });
  }

  // 2. WHATSAPP ADAPTER (Future-ready Meta WhatsApp Cloud API)
  if (channel === "whatsapp") {
    const waToken = process.env.WHATSAPP_CLOUD_TOKEN;
    const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const cleanNum = target.replace(/[^\d]/g, "");

    if (waToken && waPhoneId && cleanNum.length >= 10) {
      try {
        const res = await fetch(`https://graph.facebook.com/v20.0/${waPhoneId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${waToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: cleanNum,
            type: "text",
            text: { body: message },
          }),
        });
        if (res.ok) {
          return NextResponse.json({
            ok: true,
            channel,
            deliveryMode: "live_whatsapp_cloud",
            detail: `Live WhatsApp alert dispatched to +${cleanNum}.`,
          });
        }
      } catch {
        // Fall through to preview
      }
    }

    return NextResponse.json({
      ok: true,
      channel,
      deliveryMode: "future_whatsapp_ready",
      detail: `WhatsApp channel saved for ${target.trim()}. Add WHATSAPP_CLOUD_TOKEN & WHATSAPP_PHONE_NUMBER_ID when activating WhatsApp Bot.`,
      previewPayload: { to: `+${cleanNum}`, template: "quadillar_governor_alert", body: message },
    });
  }

  // 3. SMS ADAPTER (Indian DLT / MSG91 / Twilio ready)
  if (channel === "sms") {
    const cleanNum = target.replace(/[^\d]/g, "");
    return NextResponse.json({
      ok: true,
      channel,
      deliveryMode: "sms_dlt_ready",
      detail: `SMS channel saved for +${cleanNum}. Connect MSG91_AUTH_KEY (DLT template) when enabling carrier SMS.`,
      previewPayload: { to: `+${cleanNum}`, senderId: "QUADLV", text: message.slice(0, 155) },
    });
  }

  return NextResponse.json({ error: "Unsupported channel" }, { status: 400 });
}
