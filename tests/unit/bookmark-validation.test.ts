import assert from "node:assert/strict";
import { test } from "node:test";
import { isBookmarkId, validateBookmark } from "../../lib/bookmark-validation";

const valid = { title: "Example", url: "https://example.com", note: "" };
test("trims text and accepts an empty optional note", () => {
  assert.deepEqual(validateBookmark({ title: "  Example  ", url: " https://example.com ", note: "   " }), { success: true, data: valid });
});
test("rejects missing, whitespace-only and non-string required fields", () => {
  for (const field of ["title", "url"] as const) {
    for (const value of ["", " \n\t ", undefined, null, 10, {}, new Blob(["text"])]) {
      assert.equal(validateBookmark({ ...valid, [field]: value }).success, false, `${field}: ${String(value)}`);
    }
  }
});
test("rejects dangerous protocols, credentials and malformed URLs", () => {
  for (const url of ["http:example.com", "https:/example.com", "javascript:alert(1)", "data:text/html,hello", "ftp://example.com", "/relative", "example.com", "https://user:secret@example.com"]) {
    assert.equal(validateBookmark({ ...valid, url }).success, false, url);
  }
});
test("enforces field length boundaries", () => {
  for (const [field, limit] of [["title", 120], ["note", 1000], ["url", 2048]] as const) {
    const prefix = "https://example.com/";
    const value = field === "url" ? prefix + "x".repeat(limit - prefix.length) : "x".repeat(limit);
    assert.equal(validateBookmark({ ...valid, [field]: value }).success, true, field);
    assert.equal(validateBookmark({ ...valid, [field]: value + "x" }).success, false, field);
  }
});
test("only exact ObjectId hex strings are accepted", () => {
  assert.equal(isBookmarkId("0123456789abcdefABCDEF01"), true);
  for (const value of ["", "x".repeat(24), "a".repeat(23), "a".repeat(25), " a".repeat(12), null, {}, 123]) assert.equal(isBookmarkId(value), false);
});

test("rejects non-text optional notes", () => {
  for (const note of [null, undefined, {}, new Blob(["note"])]) {
    assert.equal(validateBookmark({ ...valid, note }).success, false);
  }
});
