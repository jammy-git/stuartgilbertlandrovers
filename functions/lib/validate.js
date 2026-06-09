const MAX = 2000;

/**
 * Validate a contact-form submission.
 * @param {{name?:string, contact?:string, message?:string, company?:string}} fields
 * @returns {{ok:boolean, spam:boolean, data:object, errors:string[]}}
 */
export function validateSubmission(fields = {}) {
  const company = (fields.company || "").trim();
  if (company) {
    // Honeypot filled — almost certainly a bot.
    return { ok: false, spam: true, data: {}, errors: ["spam"] };
  }

  const data = {
    name: (fields.name || "").trim(),
    contact: (fields.contact || "").trim(),
    message: (fields.message || "").trim()
  };

  const errors = [];
  if (!data.name) errors.push("name");
  if (!data.contact) errors.push("contact");
  if (!data.message) errors.push("message");
  for (const [k, v] of Object.entries(data)) {
    if (v.length > MAX) errors.push(`${k}-too-long`);
  }

  return { ok: errors.length === 0, spam: false, data, errors };
}
