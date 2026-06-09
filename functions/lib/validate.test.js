import test from "node:test";
import assert from "node:assert/strict";
import { validateSubmission } from "./validate.js";

test("rejects missing name", () => {
  assert.equal(validateSubmission({ name: "", contact: "07700 900000", message: "hi" }).ok, false);
});
test("rejects missing contact", () => {
  assert.equal(validateSubmission({ name: "A", contact: "", message: "hi" }).ok, false);
});
test("rejects missing message", () => {
  assert.equal(validateSubmission({ name: "A", contact: "a@b.c", message: "" }).ok, false);
});
test("accepts a valid submission and trims fields", () => {
  const r = validateSubmission({ name: " A ", contact: " a@b.c ", message: " hello " });
  assert.equal(r.ok, true);
  assert.equal(r.data.name, "A");
  assert.equal(r.data.contact, "a@b.c");
  assert.equal(r.data.message, "hello");
});
test("flags honeypot", () => {
  const r = validateSubmission({ name: "A", contact: "a@b.c", message: "hi", company: "x" });
  assert.equal(r.spam, true);
});
test("rejects over-long fields", () => {
  const long = "x".repeat(2001);
  assert.equal(validateSubmission({ name: "A", contact: "a@b.c", message: long }).ok, false);
});
