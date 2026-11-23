"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { createBookmarkAction } from "@/app/actions";
import { emptyActionState } from "@/lib/bookmark-types";

const inputClasses =
  "w-full rounded-lg border border-[#1C2B26]/15 bg-white px-3 py-2 text-sm text-[#1C2B26] shadow-sm placeholder:text-[#1C2B26]/40 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00684A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F0] " +
  "aria-[invalid=true]:border-[#B3261E] disabled:opacity-60";

const buttonClasses =
  "inline-flex h-10 items-center justify-center rounded-lg bg-[#00684A] px-4 text-sm font-semibold text-white shadow-sm " +
  "transition-colors hover:bg-[#005238] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00684A] " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F0] disabled:cursor-not-allowed disabled:opacity-60";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClasses}>
      {pending ? "Saving…" : "Add bookmark"}
    </button>
  );
}

export function BookmarkForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    createBookmarkAction,
    emptyActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // A successful create returns empty values; clear the fields so the form
  // is ready for the next bookmark. Rejected submissions keep the values.
  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      router.replace("/", { scroll: false });
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={formAction} className="mt-4 space-y-4" aria-busy={isPending} noValidate>
      <div className="space-y-1.5">
        <label
          htmlFor="create-title"
          className="block text-sm font-medium text-[#1C2B26]"
        >
          Title
        </label>
        <input
          id="create-title"
          name="title"
          type="text"
          autoComplete="off"
          readOnly={isPending}
          defaultValue={state.values.title}
          aria-invalid={state.fieldErrors.title ? true : undefined}
          aria-describedby={
            state.fieldErrors.title ? "create-title-error" : undefined
          }
          className={inputClasses}
        />
        {state.fieldErrors.title ? (
          <p id="create-title-error" className="text-sm text-[#B3261E]">
            {state.fieldErrors.title}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="create-url"
          className="block text-sm font-medium text-[#1C2B26]"
        >
          URL
        </label>
        <input
          id="create-url"
          name="url"
          type="url"
          autoComplete="off"
          readOnly={isPending}
          defaultValue={state.values.url}
          aria-invalid={state.fieldErrors.url ? true : undefined}
          aria-describedby={
            state.fieldErrors.url ? "create-url-error" : undefined
          }
          className={inputClasses}
        />
        {state.fieldErrors.url ? (
          <p id="create-url-error" className="text-sm text-[#B3261E]">
            {state.fieldErrors.url}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="create-note"
          className="block text-sm font-medium text-[#1C2B26]"
        >
          Note <span className="font-normal text-[#4B5F58]">(optional)</span>
        </label>
        <textarea
          id="create-note"
          name="note"
          rows={3}
          readOnly={isPending}
          defaultValue={state.values.note}
          aria-invalid={state.fieldErrors.note ? true : undefined}
          aria-describedby={
            state.fieldErrors.note ? "create-note-error" : undefined
          }
          className={inputClasses}
        />
        {state.fieldErrors.note ? (
          <p id="create-note-error" className="text-sm text-[#B3261E]">
            {state.fieldErrors.note}
          </p>
        ) : null}
      </div>

      <SubmitButton />

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
