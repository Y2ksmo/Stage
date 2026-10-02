import { getRightOfReplyEmailHtml } from "./emailTemplates";
import { VerificationError } from "./verification";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
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
  recipientName?: string;
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

    const deadlineDateStr =
      new Intl.DateTimeFormat("nl-NL", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" })
        .format(deadline)
        .replace(", ", " om ") + " (UTC)";
    const mail = getRightOfReplyEmailHtml({
      recipientName: params.recipientName,
      itemTitle: `${leaderName}: ${itemTitle}`,
      deadlineDateStr,
      replyUrl,
    });
    await deliver({ to: recipientEmail, ...mail });
  }
}
