// Pure shared types for the bookmarks app. Safe to import from both server
// and client code — this file must not import server-only modules.

export interface BookmarkInput {
  title: string;
  url: string;
  note: string;
}

// Client-facing view model: `id` is the hex string form of `_id` and dates
// are ISO strings, so this shape can cross the server/client boundary.
export interface BookmarkView {
  id: string;
  title: string;
  url: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export type BookmarkFieldErrors = {
  title?: string;
  url?: string;
  note?: string;
};

export interface BookmarkValues {
  id: string;
  title: string;
  url: string;
  note: string;
}

// Shape returned by the server actions used with `useActionState`.
export interface ActionState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: BookmarkFieldErrors;
  values: BookmarkValues;
}

export const emptyActionState: ActionState = {
  status: "idle",
  message: "",
  fieldErrors: {},
  values: { id: "", title: "", url: "", note: "" },
};
