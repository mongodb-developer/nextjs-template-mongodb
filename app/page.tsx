import { connection } from "next/server";

import { BookmarkForm } from "@/components/bookmark-form";
import { BookmarkItem } from "@/components/bookmark-item";
import {
  listBookmarks,
} from "@/db/bookmarks";
import type { BookmarkView } from "@/lib/bookmark-types";
import Link from "next/link";

// MongoDB is reached from Node.js server code only.
export const runtime = "nodejs";

// The page reads the database on every request; never connect during a
// static build.

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ before?: string | string[] }>;
}) {
  // Marks the page dynamic and waits for a request connection, so the
  // database is only queried for real visitors, never at build time.
  await connection();

  let bookmarks: BookmarkView[] = [];
  const { before } = await searchParams;
  let nextCursor: string | null = null;
  let isOlderPage = false;
  let isDatabaseUnavailable = false;

  try {
    const result = await listBookmarks(before);
    bookmarks = result.bookmarks;
    nextCursor = result.nextCursor;
    isOlderPage = result.isOlderPage;
  } catch {
    // Distinguish "database down" from "empty database" for the visitor.
    // Do not log raw driver errors or connection details here.
    console.error("Failed to read bookmarks from the database.");
    isDatabaseUnavailable = true;
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1C2B26]">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Bookmarks
            </h1>
            <p className="mt-2 text-base text-[#4B5F58]">
              A small place for links worth keeping.
            </p>
          </div>
        </header>

        <main className="mt-8 grid items-start gap-8 lg:grid-cols-[21rem_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-[#1C2B26]/10 bg-white p-5 shadow-sm lg:sticky lg:top-8">
            <h2 className="text-lg font-semibold">Add a bookmark</h2>
            <p className="mt-1 text-sm text-[#4B5F58]">
              Save a link with a title and an optional note.
            </p>
            <BookmarkForm />
          </aside>

          <section aria-label="Saved bookmarks" className="min-w-0">
            {isDatabaseUnavailable ? (
              <div
                role="alert"
                className="rounded-2xl border border-[#B3261E]/30 bg-[#B3261E]/5 p-6"
              >
                <h2 className="text-lg font-semibold text-[#8C1D18]">
                  Couldn’t load bookmarks
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#8C1D18]">
                  Please try again in a moment.
                </p>
              </div>
            ) : bookmarks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#1C2B26]/20 bg-white/60 p-8 text-center">
                <h2 className="text-lg font-semibold">
                  {isOlderPage ? "No older bookmarks" : "No bookmarks yet"}
                </h2>
                <p className="mt-2 text-sm text-[#4B5F58]">
                  {isOlderPage
                    ? "You’ve reached the end of the list."
                    : "Add your first link with the form on this page."}
                </p>
              </div>
            ) : (
              <>
                <ul className="space-y-3">
                  {bookmarks.map((bookmark) => (
                    <BookmarkItem key={bookmark.id} bookmark={bookmark} />
                  ))}
                </ul>
              </>
            )}
            {!isDatabaseUnavailable && (isOlderPage || nextCursor) ? (
              <nav aria-label="Bookmark pages" className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
                {isOlderPage ? (
                  <Link href="/" className="rounded-lg px-3 py-2 font-medium text-[#00684A] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00684A]">
                    Back to newest
                  </Link>
                ) : <span />}
                {nextCursor ? (
                  <Link href={`/?${new URLSearchParams({ before: nextCursor })}`} className="rounded-lg border border-[#1C2B26]/15 bg-white px-3 py-2 font-medium text-[#00684A] hover:bg-[#1C2B26]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00684A]">
                    Older bookmarks
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </section>
        </main>

      </div>
    </div>
  );
}
