// Application-level validation for bookmark documents. There is no JSON
// schema validation on the MongoDB collection itself — this module is the
// single source of truth for what a bookmark may contain.

export type BookmarkValidationErrors = {
  title?: string;
  url?: string;
  note?: string;
};

export type BookmarkValidationResult =
  | { success: true; data: { title: string; url: string; note: string } }
  | { success: false; errors: BookmarkValidationErrors };

const MAX_TITLE_LENGTH = 120;
const MAX_URL_LENGTH = 2048;
const MAX_NOTE_LENGTH = 1000;

const BOOKMARK_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

/**
 * Validates raw, untrusted form input. Values that are not strings (missing
 * fields, files, numbers, …) are rejected, never coerced.
 */
export function validateBookmark(input: {
  title: unknown;
  url: unknown;
  note: unknown;
}): BookmarkValidationResult {
  const errors: BookmarkValidationErrors = {};

  const title = readTrimmedString(input.title);
  if (title === null || title.length === 0) {
    errors.title = "Title is required.";
  } else if (title.length > MAX_TITLE_LENGTH) {
    errors.title = `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`;
  }

  const url = readTrimmedString(input.url);
  if (url === null || url.length === 0) {
    errors.url = "URL is required.";
  } else if (url.length > MAX_URL_LENGTH) {
    errors.url = `URL must be ${MAX_URL_LENGTH} characters or fewer.`;
  } else {
    const urlError = validateUrl(url);
    if (urlError) {
      errors.url = urlError;
    }
  }

  const note = readTrimmedString(input.note);
  if (note === null) {
    errors.note = "Note must be text.";
  } else if (note.length > MAX_NOTE_LENGTH) {
    errors.note = `Note must be ${MAX_NOTE_LENGTH} characters or fewer.`;
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      // A note may be empty; the empty string is persisted.
      title: title as string,
      url: url as string,
      note: note as string,
    },
  };
}

/**
 * Returns true only for an exact 24-character hex string, i.e. the string
 * form of a MongoDB ObjectId. Always validate before calling `new ObjectId()`.
 */
export function isBookmarkId(value: unknown): value is string {
  return typeof value === "string" && BOOKMARK_ID_PATTERN.test(value);
}

function readTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  return value.trim();
}

function validateUrl(url: string): string | null {
  if (!/^https?:\/\//i.test(url)) {
    return "Enter an absolute http or https URL, for example https://example.com.";
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "Enter a valid URL, for example https://example.com.";
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "Only http and https URLs are supported.";
  }
  if (parsed.hostname.length === 0) {
    return "The URL must include a hostname.";
  }
  if (parsed.username !== "" || parsed.password !== "") {
    return "URLs with a username or password are not allowed.";
  }
  return null;
}
