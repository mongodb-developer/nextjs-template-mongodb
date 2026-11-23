import "server-only";

import { ObjectId, type WithId } from "mongodb";

import { isBookmarkId } from "@/lib/bookmark-validation";
import type { BookmarkInput, BookmarkView } from "@/lib/bookmark-types";
import { getDatabase } from "@/lib/mongodb";

const COLLECTION_NAME = "bookmarks";

// Each page shows at most 100 bookmarks, with a cursor for older records.
export const BOOKMARK_LIST_LIMIT = 100;

interface BookmarkDocument {
  title: string;
  url: string;
  note: string;
  createdAt: Date;
  updatedAt: Date;
}

async function getCollection() {
  const database = await getDatabase();
  return database.collection<BookmarkDocument>(COLLECTION_NAME);
}

function toBookmarkView(document: WithId<BookmarkDocument>): BookmarkView {
  return {
    id: document._id.toString(),
    title: document.title,
    url: document.url,
    note: document.note,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

/** Reject malformed cursors before constructing a database filter. */
function readCursor(value: string | string[] | undefined) {
  if (typeof value !== "string" || value.length > 64) return null;
  const parts = value.split("_");
  if (parts.length !== 2 || !isBookmarkId(parts[1])) return null;
  const createdAt = new Date(parts[0]);
  if (!Number.isFinite(createdAt.getTime()) || createdAt.toISOString() !== parts[0]) {
    return null;
  }
  return { createdAt, _id: new ObjectId(parts[1]) };
}

/** Read one page plus one record to determine whether an older page exists. */
export async function listBookmarks(before?: string | string[]) {
  const cursor = readCursor(before);
  const collection = await getCollection();
  const filter = cursor
    ? { $or: [
        { createdAt: { $lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, _id: { $lt: cursor._id } },
      ] }
    : {};
  const documents = await collection
    .find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(BOOKMARK_LIST_LIMIT + 1)
    .toArray();
  const hasMore = documents.length > BOOKMARK_LIST_LIMIT;
  const bookmarks = documents.slice(0, BOOKMARK_LIST_LIMIT).map(toBookmarkView);
  const last = bookmarks.at(-1);
  return {
    bookmarks,
    nextCursor: hasMore && last ? `${last.createdAt}_${last.id}` : null,
    isOlderPage: cursor !== null,
  };
}

/**
 * Inserts a bookmark. Only the validated fields (title, url, note) plus
 * server-generated timestamps are written; callers pass typed, already
 * validated input (app/actions.ts validates before calling).
 */
export async function createBookmark(input: BookmarkInput): Promise<BookmarkView> {
  const now = new Date();
  const collection = await getCollection();
  const { insertedId } = await collection.insertOne({
    title: input.title,
    url: input.url,
    note: input.note,
    createdAt: now,
    updatedAt: now,
  });
  return {
    id: insertedId.toString(),
    title: input.title,
    url: input.url,
    note: input.note,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/** Updates title, url, note and updatedAt only; createdAt is preserved. */
export async function updateBookmark(
  id: string,
  input: BookmarkInput,
): Promise<boolean> {
  if (!isBookmarkId(id)) {
    return false;
  }
  const collection = await getCollection();
  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        title: input.title,
        url: input.url,
        note: input.note,
        updatedAt: new Date(),
      },
    },
  );
  return result.matchedCount > 0;
}

export async function deleteBookmark(id: string): Promise<boolean> {
  if (!isBookmarkId(id)) {
    return false;
  }
  const collection = await getCollection();
  const result = await collection.deleteOne({
    _id: new ObjectId(id),
  });
  return result.deletedCount > 0;
}
