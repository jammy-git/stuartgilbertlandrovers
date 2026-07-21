// Dedicated mailer Worker. Holds the Email Routing `send_email` binding, which is
// a Workers-only API (Pages Functions can't use `cloudflare:email`). The public
// contact Pages Function builds the MIME message and hands the raw bytes to this
// Worker over a private service binding; this Worker does the actual send.
import { EmailMessage } from "cloudflare:email";

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }
    let payload;
    try {
      payload = await request.json();
    } catch {
      return new Response("Bad Request", { status: 400 });
    }
    const { from, to, raw } = payload || {};
    if (!from || !to || !raw) {
      return new Response("Missing from/to/raw", { status: 400 });
    }
    try {
      await env.SEB.send(new EmailMessage(from, to, raw));
    } catch (e) {
      return new Response("send failed: " + (e && e.message ? e.message : String(e)), { status: 502 });
    }
    return new Response("sent", { status: 200 });
  }
};
