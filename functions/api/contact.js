import { createMimeMessage } from "mimetext";
import { validateSubmission } from "../lib/validate.js";

const SENDER = "form@stuartgilbertlandrovers.co.uk";

const errorPage = (msg) =>
  new Response(
    `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Message not sent</title></head>
   <body style="font-family:system-ui,sans-serif;max-width:38rem;margin:4rem auto;padding:0 1rem;line-height:1.6">
   <h1>Sorry — that didn't send</h1><p>${msg}</p>
   <p>Please call us on <a href="tel:+441795843116">01795 843116</a> — you'll speak to Stuart or David — or <a href="/contact/">go back and try again</a>.</p>
   </body></html>`,
    { status: 400, headers: { "content-type": "text/html;charset=utf-8" } }
  );

async function verifyTurnstile(token, secret, ip) {
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret, response: token, remoteip: ip || "" })
  });
  return res.json();
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const form = await request.formData();
  const fields = Object.fromEntries(
    ["name", "contact", "message", "company"].map((k) => [k, form.get(k) || ""])
  );

  const v = validateSubmission(fields);
  // Honeypot: pretend success so bots don't learn anything.
  if (v.spam) return Response.redirect(new URL("/contact/sent/", request.url), 303);
  if (!v.ok) {
    return errorPage("Please fill in your name, a phone number or email, and a short message.");
  }

  const token = form.get("cf-turnstile-response");
  if (!token) {
    return errorPage("The spam check needs JavaScript to run. If you'd rather not enable it, just give us a ring.");
  }
  const outcome = await verifyTurnstile(token, env.TURNSTILE_SECRET, request.headers.get("cf-connecting-ip"));
  if (!outcome.success) {
    return errorPage("The spam check didn't pass. Sorry about that.");
  }

  const msg = createMimeMessage();
  msg.setSender({ name: "SGLR Website", addr: SENDER });
  msg.setRecipient(env.CONTACT_DEST);
  msg.setSubject(`Website enquiry from ${v.data.name}`);
  msg.addMessage({
    contentType: "text/plain",
    data: `Name: ${v.data.name}\nContact: ${v.data.contact}\n\n${v.data.message}\n`
  });

  // Pages Functions can't use the cloudflare:email send_email binding, so hand the
  // raw message to the dedicated mailer Worker (which holds the binding) over a
  // private service binding. A failed send must be visible, not silently swallowed.
  const sent = await env.MAILER.fetch("https://mailer.internal/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ from: SENDER, to: env.CONTACT_DEST, raw: msg.asRaw() })
  });
  if (!sent.ok) {
    return errorPage("We couldn't send your message just now. Please give us a ring and we'll get it sorted.");
  }

  return Response.redirect(new URL("/contact/sent/", request.url), 303);
}
