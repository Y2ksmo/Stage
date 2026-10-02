import assert from "node:assert/strict";
import { getRightOfReplyEmailHtml, escapeHtml } from "../src/services/emailTemplates";

const base = { itemTitle: "Plain title", deadlineDateStr: "15 oktober 2026 om 17:00 (UTC)", replyUrl: "https://pfpa.example/reply?token=abc_DEF-123" };

// normal rendering: Dutch, both parts, link present in text and html
const ok = getRightOfReplyEmailHtml({ ...base, recipientName: "Jan Jansen" });
assert.equal(ok.subject, "Verzoek tot wederhoor: Plain title");
assert.match(ok.text, /^Beste Jan Jansen,/);
assert.ok(ok.text.includes(base.replyUrl) && ok.html.includes(`href="${base.replyUrl}"`));
assert.match(getRightOfReplyEmailHtml(base).text, /^Geachte heer\/mevrouw,/);
assert.match(ok.text, /Er is niets als vaststaand feit gepubliceerd/);

// user-controlled values cannot inject markup or attributes
const evil = getRightOfReplyEmailHtml({
  ...base,
  recipientName: `<b onmouseover="x()">Bob</b>`,
  itemTitle: `<script>alert(1)</script> "quoted" & <img src=x onerror=y>`,
  deadlineDateStr: "<i>soon</i>",
});
assert.ok(!/<script|<img|<b onmouseover|<i>/.test(evil.html), "no raw tags from user input");
assert.ok(evil.html.includes("&lt;script&gt;alert(1)&lt;/script&gt; &quot;quoted&quot; &amp; &lt;img src=x onerror=y&gt;"));

// header injection: newlines never reach the subject
const hdr = getRightOfReplyEmailHtml({ ...base, itemTitle: "Title\r\nBcc: attacker@evil.example" });
assert.ok(!/[\r\n]/.test(hdr.subject));

// link attribute can't be broken out of, and non-http(s) links are refused
const q = getRightOfReplyEmailHtml({ ...base, replyUrl: 'https://pfpa.example/reply?token=a"onmouseover="x' });
assert.ok(!q.html.includes('"onmouseover="'));
assert.throws(() => getRightOfReplyEmailHtml({ ...base, replyUrl: "javascript:alert(1)" }), /http\(s\)/);

assert.equal(escapeHtml(`&<>"'`), "&amp;&lt;&gt;&quot;&#39;");
console.log("EMAIL TEMPLATE TESTS PASSED");
