import { REPLY_WINDOW_DAYS } from "./constants";
import { VerificationError } from "./verification";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}
export type MailTransport = (message: MailMessage) => Promise<void>;

let transportOverride: MailTransport | null = null;
/** Test hook: replace the real transport (pass null to restore). */
export function setMailTransport(t: MailTransport | null) {
  transportOverride = t;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isProd = () => process.env.NODE_ENV === "production";

async function deliver(message: MailMessage) {
  if (transportOverride) return transportOverride(message);

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Never silently skip in production: an unsent notice would let the window expire unnoticed.
    if (isProd()) throw new VerificationError("UPSTREAM", "Email transport is not configured (RESEND_API_KEY).");
    console.log(`[DEV MODE - EMAIL NOT SENT] To: ${message.to}\n${message.text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "moderation@falseprophets.app", ...message }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    // Log provider detail server-side; don't leak it to API clients.
    console.error("Email provider rejected message", res.status, await res.text().catch(() => ""));
    throw new VerificationError("UPSTREAM", "Failed to send email notification.");
  }
}

export interface SendRightOfReplyNoticeParams {
  recipientEmail: string;
  leaderName: string;
  itemTitle: string;
  rawToken: string;
  deadline: Date;
  /** Defaults to APP_BASE_URL. Never derive from a request Host header. */
  baseUrl?: string;
}

export class NotificationService {
  /** Build the secret reply link and email the right-of-reply notice. The link is never returned or logged in production. */
  static async sendRightOfReplyNotice(params: SendRightOfReplyNoticeParams): Promise<void> {
    const { recipientEmail, leaderName, itemTitle, rawToken, deadline } = params;
    if (!EMAIL_RE.test(recipientEmail ?? "")) throw new VerificationError("INVALID", "Valid recipient email address is required.");

    const baseUrl = (params.baseUrl ?? process.env.APP_BASE_URL ?? "").replace(/\/+$/, "");
    if (!baseUrl || (isProd() && !baseUrl.startsWith("https://"))) {
      throw new VerificationError("UPSTREAM", "APP_BASE_URL is not configured (https required in production).");
    }
    const replyUrl = `${baseUrl}/reply?token=${encodeURIComponent(rawToken)}`;

    await deliver({
      to: recipientEmail,
      subject: `Notice: Right of Reply regarding ${leaderName}`,
      text: `
Dear Subject / Representative,

An item concerning ${leaderName} ("${itemTitle}") is under formal review on our platform. Nothing has been published as established fact.

You have a ${REPLY_WINDOW_DAYS}-day Right of Reply window ending on ${deadline.toUTCString()}.

To submit your statement or supporting documents, or to decline to respond, use this personal, single-use link (do not forward it):
${replyUrl}

Your reply, if you submit one, is published alongside the item. If you do not respond, the review continues after the window closes and this is recorded neutrally as "no response received"; it does not affect any assessment.

Moderation & Verification Team
`.trim(),
    });
  }
}
