"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { deleteBookmarkAction, updateBookmarkAction } from "@/app/actions";
import type { BookmarkView } from "@/lib/bookmark-types";
import { emptyActionState } from "@/lib/bookmark-types";

const inputClasses =
  "w-full rounded-lg border border-[#1C2B26]/15 bg-white px-3 py-2 text-sm text-[#1C2B26] shadow-sm placeholder:text-[#1C2B26]/40 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00684A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F0] " +
  "aria-[invalid=true]:border-[#B3261E] disabled:opacity-60";

const secondaryButtonClasses =
  "inline-flex h-8 items-center rounded-lg border border-[#1C2B26]/15 bg-white px-3 text-xs font-semibold text-[#1C2B26] " +
  "transition-colors hover:bg-[#1C2B26]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00684A] " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F0] disabled:cursor-not-allowed disabled:opacity-60";

const deleteButtonClasses =
  "inline-flex h-8 items-center rounded-lg border border-[#B3261E]/30 bg-white px-3 text-xs font-semibold text-[#B3261E] " +
  "transition-colors hover:bg-[#B3261E]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B3261E] " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F0] disabled:cursor-not-allowed disabled:opacity-60";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate));
}

function SaveEditButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center justify-center rounded-lg bg-[#00684A] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#005238] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00684A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F0] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

function ConfirmDeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={deleteButtonClasses}>
      {pending ? "Deleting…" : "Confirm delete"}
    </button>
  );
}

function EditBookmarkForm({
  bookmark,
  onDone,
}: {
  bookmark: BookmarkView;
  onDone: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    updateBookmarkAction,
    emptyActionState,
  );
  const previousStatus = useRef(state.status);

  // A successful edit exits edit mode; rejected submissions stay open.
  useEffect(() => {
    if (state.status === "success" && previousStatus.current !== "success") {
      onDone();
    }
    previousStatus.current = state.status;
  }, [state, onDone]);

  return (
    <form action={formAction} className="mt-3 space-y-3" aria-busy={isPending} noValidate>
      <input type="hidden" name="id" value={bookmark.id} />
      <div className="space-y-1.5">
        <label
          htmlFor={`edit-title-${bookmark.id}`}
          className="block text-sm font-medium text-[#1C2B26]"
        >
          Title
        </label>
        <input
          id={`edit-title-${bookmark.id}`}
          name="title"
          type="text"
          autoComplete="off"
          readOnly={isPending}
          defaultValue={state.status === "idle" ? bookmark.title : state.values.title}
          aria-invalid={state.fieldErrors.title ? true : undefined}
          aria-describedby={
            state.fieldErrors.title ? `edit-title-error-${bookmark.id}` : undefined
          }
          className={inputClasses}
        />
        {state.fieldErrors.title ? (
          <p id={`edit-title-error-${bookmark.id}`} className="text-sm text-[#B3261E]">
            {state.fieldErrors.title}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor={`edit-url-${bookmark.id}`}
          className="block text-sm font-medium text-[#1C2B26]"
        >
          URL
        </label>
        <input
          id={`edit-url-${bookmark.id}`}
          name="url"
          type="url"
          autoComplete="off"
          readOnly={isPending}
          defaultValue={state.status === "idle" ? bookmark.url : state.values.url}
          aria-invalid={state.fieldErrors.url ? true : undefined}
          aria-describedby={
            state.fieldErrors.url ? `edit-url-error-${bookmark.id}` : undefined
          }
          className={inputClasses}
        />
        {state.fieldErrors.url ? (
          <p id={`edit-url-error-${bookmark.id}`} className="text-sm text-[#B3261E]">
            {state.fieldErrors.url}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor={`edit-note-${bookmark.id}`}
          className="block text-sm font-medium text-[#1C2B26]"
        >
          Note <span className="font-normal text-[#4B5F58]">(optional)</span>
        </label>
        <textarea
          id={`edit-note-${bookmark.id}`}
          name="note"
          rows={3}
          readOnly={isPending}
          defaultValue={state.status === "idle" ? bookmark.note : state.values.note}
          aria-invalid={state.fieldErrors.note ? true : undefined}
          aria-describedby={
            state.fieldErrors.note ? `edit-note-error-${bookmark.id}` : undefined
          }
          className={inputClasses}
        />
        {state.fieldErrors.note ? (
          <p id={`edit-note-error-${bookmark.id}`} className="text-sm text-[#B3261E]">
            {state.fieldErrors.note}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <SaveEditButton />
        <button type="button" disabled={isPending} onClick={onDone} className={secondaryButtonClasses}>
          Cancel
        </button>
      </div>

      {state.status !== "idle" && state.message ? (
        <p
          aria-live="polite"
          role={state.status === "error" ? "alert" : "status"}
          className={
            state.status === "error"
              ? "text-sm font-medium text-[#B3261E]"
              : "text-sm font-medium text-[#00684A]"
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function BookmarkItem({ bookmark }: { bookmark: BookmarkView }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteState, deleteFormAction, isDeleting] = useActionState(
    deleteBookmarkAction,
    emptyActionState,
  );

  const wasUpdated = bookmark.updatedAt !== bookmark.createdAt;

  return (
    <li className="rounded-2xl border border-[#1C2B26]/10 bg-white p-4 shadow-sm">
      {isEditing ? (
        <EditBookmarkForm bookmark={bookmark} onDone={() => setIsEditing(false)} />
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-words font-semibold text-[#00684A] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00684A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F0]"
              >
                {bookmark.title}
              </a>
              <p className="mt-0.5 truncate text-sm text-[#4B5F58]">
                {bookmark.url}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => { setIsConfirmingDelete(false); setIsEditing(true); }}
                disabled={isDeleting}
                className={secondaryButtonClasses}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                disabled={isDeleting}
                className={deleteButtonClasses}
              >
                Delete
              </button>
            </div>
          </div>

          {bookmark.note ? (
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#1C2B26]">
              {bookmark.note}
            </p>
          ) : null}

          <p className="mt-2 text-xs text-[#4B5F58]">
            Added {formatDate(bookmark.createdAt)}
            {wasUpdated ? ` · Updated ${formatDate(bookmark.updatedAt)}` : ""}
          </p>

          {isConfirmingDelete ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#1C2B26]/10 pt-3">
              <form action={deleteFormAction} className="flex flex-wrap items-center gap-2" noValidate>
                <input type="hidden" name="id" value={bookmark.id} />
                <span className="text-xs font-medium text-[#1C2B26]">
                  Delete this bookmark?
                </span>
                <ConfirmDeleteButton />
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  disabled={isDeleting}
                  className={secondaryButtonClasses}
                >
                  Cancel
                </button>
              </form>
            </div>
          ) : null}

          {deleteState.status === "error" && deleteState.message ? (
            <p aria-live="polite" role="alert" className="mt-2 text-sm font-medium text-[#B3261E]">
              {deleteState.message}
            </p>
          ) : null}
        </>
      )}
    </li>
  );
}
