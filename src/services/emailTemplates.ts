export interface RightOfReplyEmailParams {
  recipientName?: string;
  itemTitle: string;
  deadlineDateStr: string; // e.g. "15 oktober 2026 om 17:00 (UTC)"
  replyUrl: string;
}

/** Everything interpolated into HTML goes through this. Titles come from user submissions. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const oneLine = (s: string) => s.replace(/[\r\n\u2028\u2029]+/g, " ").trim();

export function getRightOfReplyEmailHtml({
  recipientName,
  itemTitle,
  deadlineDateStr,
  replyUrl,
}: RightOfReplyEmailParams): { subject: string; html: string; text: string } {
  // The link is the secret; only ever emit a plain http(s) URL (also blocks javascript: etc.).
  const parsed = new URL(replyUrl);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("replyUrl must be http(s).");

  const title = oneLine(itemTitle);
  const name = recipientName ? oneLine(recipientName) : "";
  const greeting = name ? `Beste ${name},` : "Geachte heer/mevrouw,";
  const subject = `Verzoek tot wederhoor: ${title}`.slice(0, 200);

  const text = `${greeting}

Op ons platform wordt een dossier beoordeeld waarin uw naam of organisatie wordt genoemd. Er is niets als vaststaand feit gepubliceerd. Om een zorgvuldige en evenwichtige beoordeling te waarborgen, bieden wij u het Recht op Wederhoor aan.

Dossier / Onderwerp: ${title}
Uiterste reactiedatum: ${deadlineDateStr}

U kunt uw reactie of onderbouwende documentatie indienen via onderstaande unieke en veilige link:
${parsed.toString()}

Via deze link kunt u ook aangeven dat u geen gebruik wenst te maken van het aanbod tot wederhoor. Reageert u niet, dan gaat de beoordeling na afloop van de termijn door; dit wordt neutraal vermeld als "geen reactie ontvangen" en heeft geen invloed op de beoordeling. Een ingediende reactie wordt na een redactionele controle naast het item gepubliceerd.

Let op: deze link is persoonlijk, eenmalig te gebruiken en geldig tot de genoemde uiterste reactiedatum. Deel de link niet.

Met vriendelijke groet,
Redactie / Dossierbeheer
`;

  const url = escapeHtml(parsed.toString());
  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111827; background-color: #f9fafb; margin: 0; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 32px;">
    <h2 style="margin-top: 0; color: #111827; font-size: 20px; font-weight: 700;">Verzoek tot Recht op Wederhoor</h2>
    <p style="margin-bottom: 16px;">${escapeHtml(greeting)}</p>
    <p style="margin-bottom: 16px;">
      Op ons platform wordt een dossier beoordeeld waarin u of uw organisatie wordt genoemd. Er is niets als vaststaand feit gepubliceerd. Om een zorgvuldige en objectieve beoordeling te garanderen, bieden wij u de gelegenheid om hierop te reageren.
    </p>

    <div style="background-color: #f3f4f6; border-left: 4px solid #111827; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Onderwerp:</strong> ${escapeHtml(title)}</p>
      <p style="margin: 0; font-size: 14px;"><strong>Uiterste reactiedatum:</strong> ${escapeHtml(deadlineDateStr)}</p>
    </div>

    <p style="margin-bottom: 24px;">
      Via onderstaande knop kunt u uw officiële reactie indienen, eventuele bewijsstukken toevoegen, of het aanbod formeel afwijzen. Een ingediende reactie wordt na een redactionele controle naast het item gepubliceerd. Reageert u niet, dan wordt dit neutraal vermeld als &ldquo;geen reactie ontvangen&rdquo; en heeft het geen invloed op de beoordeling.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${url}" style="background-color: #000000; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
        Bekijk en reageer op verzoek
      </a>
    </div>

    <p style="font-size: 12px; color: #6b7280; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
      Werkt de knop niet? Kopieer en plak dan de volgende URL in uw browser:<br>
      <a href="${url}" style="color: #2563eb; word-break: break-all;">${url}</a>
    </p>
    <p style="font-size: 12px; color: #9ca3af; margin-top: 8px;">
      Deze e-mail is vertrouwelijk en bevat een persoonlijke, eenmalige toegangslink. Deel deze niet.
    </p>
  </div>
</body>
</html>
`;

  return { subject, html, text };
}
