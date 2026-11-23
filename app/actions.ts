"use server";

import { revalidatePath } from "next/cache";

import {
  createBookmark,
  deleteBookmark,
  updateBookmark,
} from "@/db/bookmarks";
import { isBookmarkId, validateBookmark } from "@/lib/bookmark-validation";
import type {
  ActionState,
  BookmarkFieldErrors,
  BookmarkValues,
} from "@/lib/bookmark-types";
import { emptyActionState } from "@/lib/bookmark-types";

const UNCONFIRMED_WRITE_SUFFIX =
  "Refresh the page to check the result before trying again.";
const RECORD_GONE_SUFFIX =
  "Refresh the page to see the current list.";

function readFormValue(formData: FormData, field: string): string {
  const value = formData.get(field);
  // Anything that is not a string (e.g. a file upload) is treated as missing
  // and rejected by validateBookmark.
  return typeof value === "string" ? value : "";
}

function readValues(formData: FormData): BookmarkValues {
  return {
    id: readFormValue(formData, "id"),
    title: readFormValue(formData, "title"),
    url: readFormValue(formData, "url"),
    note: readFormValue(formData, "note"),
  };
}

function errorState(
  message: string,
  fieldErrors: BookmarkFieldErrors,
  values: BookmarkValues,
): ActionState {
  return { status: "error", message, fieldErrors, values };
}

export async function createBookmarkAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = readValues(formData);
  const parsed = validateBookmark({
    title: formData.get("title"),
    url: formData.get("url"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return errorState(
      "Please fix the highlighted fields.",
      parsed.errors,
      values,
    );
  }

  try {
    await createBookmark(parsed.data);
  } catch {
    return errorState(
      `Could not confirm that the bookmark was saved. ${UNCONFIRMED_WRITE_SUFFIX}`,
      {},
      values,
    );
  }

  revalidatePath("/");
  return {
    status: "success",
    message: "Bookmark saved.",
    fieldErrors: {},
    values: { id: "", title: "", url: "", note: "" },
  };
}

export async function updateBookmarkAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = readValues(formData);

  if (!isBookmarkId(values.id)) {
    return errorState(
      `This bookmark could not be updated — it may have been deleted. ${RECORD_GONE_SUFFIX}`,
      {},
      values,
    );
  }

  const parsed = validateBookmark({
    title: formData.get("title"),
    url: formData.get("url"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return errorState("Please fix the highlighted fields.", parsed.errors, values);
  }

  try {
    const updated = await updateBookmark(values.id, parsed.data);
    if (!updated) {
      return errorState(
        `This bookmark no longer exists — it may have been deleted. ${RECORD_GONE_SUFFIX}`,
        {},
        values,
      );
    }
  } catch {
    return errorState(
      `Could not confirm your changes. ${UNCONFIRMED_WRITE_SUFFIX}`,
      {},
      values,
    );
  }

  revalidatePath("/");
  return { status: "success", message: "Bookmark updated.", fieldErrors: {}, values };
}

export async function deleteBookmarkAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = readFormValue(formData, "id");

  if (!isBookmarkId(id)) {
    return {
      ...emptyActionState,
      status: "error",
      message: `This bookmark no longer exists — it may have already been deleted. ${RECORD_GONE_SUFFIX}`,
    };
  }

  try {
    const deleted = await deleteBookmark(id);
    if (!deleted) {
      return {
        ...emptyActionState,
        status: "error",
        message: `This bookmark no longer exists — it may have already been deleted. ${RECORD_GONE_SUFFIX}`,
      };
    }
  } catch {
    return {
      ...emptyActionState,
      status: "error",
      message: `Could not confirm the deletion. ${UNCONFIRMED_WRITE_SUFFIX}`,
    };
  }

  revalidatePath("/");
  return { ...emptyActionState, status: "success", message: "Bookmark deleted." };
}
