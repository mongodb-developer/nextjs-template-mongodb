import { test, expect, type Page } from "@playwright/test";
import { MongoClient, type Collection, type Document } from "mongodb";

if (process.env.BOOKMARKS_TEST_RUN !== "1") throw new Error("Disposable test run required.");
const rawURI = process.env.BOOKMARKS_TEST_URI;
if (!rawURI) throw new Error("Missing disposable database URI.");
const parsedURI = new URL(rawURI);
if (parsedURI.protocol !== "mongodb:" || parsedURI.hostname !== "127.0.0.1" || !/^\/bookmarks_test_[a-zA-Z0-9_]+$/.test(parsedURI.pathname) || parsedURI.username || parsedURI.password) {
  throw new Error("Tests may only mutate a loopback bookmarks_test_ database.");
}
const scenario = process.env.BOOKMARKS_TEST_SCENARIO;
if (!["healthy", "missing", "unreachable"].includes(scenario ?? "")) throw new Error("Unknown verification scenario.");
const healthy = scenario === "healthy";
if (healthy && process.env.MONGODB_URI !== rawURI) throw new Error("Application and tests must share the disposable database.");
let client: MongoClient;
let bookmarks: Collection<Document>;
test.beforeAll(async () => {
  client = await new MongoClient(rawURI, { serverSelectionTimeoutMS: 5000 }).connect();
  bookmarks = client.db().collection("bookmarks");
});
test.afterAll(async () => { await client?.close(); });
test.beforeEach(async () => { await bookmarks.deleteMany({}); });

function createForm(page: Page) { return page.locator("form").filter({ has: page.locator("#create-title") }); }
async function add(page: Page, title: string, url = "https://example.com", note = "") {
  const form = createForm(page);
  await form.getByLabel("Title", { exact: true }).fill(title);
  await form.getByLabel("URL", { exact: true }).fill(url);
  await form.getByLabel(/Note/).fill(note);
  await form.getByRole("button", { name: "Add bookmark", exact: true }).click();
  return form;
}
function item(page: Page, title: string) { return page.getByRole("listitem").filter({ has: page.getByRole("link", { name: title, exact: true }) }); }
async function seed(title = "Seed bookmark", extra: Document = {}) {
  const now = new Date("2025-01-01T12:00:00.000Z");
  const doc = { title, url: "https://example.com", note: "Original note", createdAt: now, updatedAt: now, ...extra };
  const result = await bookmarks.insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

test.describe("healthy database", () => {
  test.skip(!healthy, "Only run against the healthy disposable database.");

  test("empty state; two consecutive creates clear fields and persist through reload", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "No bookmarks yet" })).toBeVisible();
    await expect(page).toHaveTitle("Bookmarks");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Save your useful links in one place.");
    await expect(page.getByText("Couldn’t load bookmarks", { exact: true })).toHaveCount(0);
    await createForm(page).evaluate((form) => {
      for (const [name, value] of [["createdAt", "2000-01-01"], ["unexpected", "must not persist"]]) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }
    });
    for (const title of ["First bookmark", "Second bookmark"]) {
      const form = await add(page, `  ${title}  `, "  https://example.com/guide  ", "  A useful guide  ");
      await expect(item(page, title)).toBeVisible();
      await expect(form.getByLabel("Title", { exact: true })).toHaveValue("");
      await expect(form.getByLabel("URL", { exact: true })).toHaveValue("");
      await expect(form.getByLabel(/Note/)).toHaveValue("");
    }
    await page.reload();
    await expect(page.getByRole("listitem")).toHaveCount(2);
    await expect(page.getByRole("listitem").first().getByRole("link")).toHaveText("Second bookmark");
    const documents = await bookmarks.find().sort({ createdAt: -1, _id: -1 }).toArray();
    expect(documents.map((doc) => doc.title)).toEqual(["Second bookmark", "First bookmark"]);
    for (const doc of documents) {
      expect(doc.url).toBe("https://example.com/guide");
      expect(doc.note).toBe("A useful guide");
      expect(doc.createdAt).toBeInstanceOf(Date);
      expect(doc.createdAt.getTime()).toBeGreaterThan(Date.parse("2025-01-01"));
      expect(doc.updatedAt.getTime()).toBe(doc.createdAt.getTime());
      expect(Object.keys(doc).sort()).toEqual(["_id", "createdAt", "note", "title", "updatedAt", "url"]);
    }
  });

  test("edit persists exact fields and preserves creation timestamp; cancel does not write", async ({ page }) => {
    const original = await seed();
    await page.goto("/");
    let card = page.getByRole("listitem").first();
    await card.getByRole("button", { name: "Edit", exact: true }).click();
    await card.getByLabel("Title", { exact: true }).fill("Discarded title");
    await card.getByRole("button", { name: "Cancel", exact: true }).click();
    expect((await bookmarks.findOne({ _id: original._id }))?.title).toBe(original.title);
    await card.getByRole("button", { name: "Edit", exact: true }).click();
    await card.getByLabel("Title", { exact: true }).fill("Updated bookmark");
    await card.getByLabel("URL", { exact: true }).fill("https://example.org/updated");
    await card.getByLabel(/Note/).fill("Updated note");
    await card.getByRole("button", { name: /Save changes/ }).click();
    card = item(page, "Updated bookmark");
    await expect(card).toBeVisible();
    await expect(card.getByText(/Updated note/)).toBeVisible();
    const stored = await bookmarks.findOne({ _id: original._id });
    expect(stored?.createdAt.getTime()).toBe(original.createdAt.getTime());
    expect(stored?.updatedAt.getTime()).toBeGreaterThan(original.updatedAt.getTime());
    expect(stored?.url).toBe("https://example.org/updated");
    expect(stored?.note).toBe("Updated note");
    await page.reload();
    await expect(item(page, "Updated bookmark")).toBeVisible();
    expect(await bookmarks.countDocuments()).toBe(1);
  });

  test("delete requires confirmation and cancel leaves the document intact", async ({ page }) => {
    const original = await seed();
    await page.goto("/");
    const card = item(page, original.title);
    await card.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(card.getByText("Delete this bookmark?", { exact: true })).toBeVisible();
    await card.getByRole("button", { name: "Cancel", exact: true }).click();
    expect(await bookmarks.countDocuments()).toBe(1);
    await card.getByRole("button", { name: "Delete", exact: true }).click();
    await card.getByRole("button", { name: "Confirm delete", exact: true }).click();
    await expect(page.getByRole("heading", { name: "No bookmarks yet" })).toBeVisible();
    expect(await bookmarks.countDocuments()).toBe(0);
    await page.reload();
    await expect(page.getByRole("heading", { name: "No bookmarks yet" })).toBeVisible();
  });

  test("invalid fields are rejected server-side and inputs are retained", async ({ page }) => {
    await page.goto("/");
    const cases = [
      { title: "   ", url: "https://example.com", note: "Keep this note", error: /Title is required/ },
      { title: "Keep this title", url: "   ", note: "Keep this note", error: /URL is required/ },
      { title: "Keep this title", url: "javascript:alert(1)", note: "Keep this note", error: /http.*https/ },
      { title: "x".repeat(121), url: "https://example.com", note: "Keep this note", error: /Title must be 120/ },
      { title: "Keep this title", url: "https://example.com/" + "x".repeat(2048), note: "Keep this note", error: /URL must be 2048/ },
      { title: "Keep this title", url: "https://example.com", note: "x".repeat(1001), error: /Note must be 1000/ },
    ];
    for (const input of cases) {
      const form = await add(page, input.title, input.url, input.note);
      await expect(form.getByText(input.error)).toBeVisible();
      await expect(form.getByLabel("Title", { exact: true })).toHaveValue(input.title);
      await expect(form.getByLabel("URL", { exact: true })).toHaveValue(input.url.trim());
      await expect(form.getByLabel(/Note/)).toHaveValue(input.note);
      expect(await bookmarks.countDocuments()).toBe(0);
    }
  });

  test("pending mutations disable submission and in-flight cancellation", async ({ page }) => {
    await seed();
    await page.goto("/");
    for (const operation of ["edit", "delete"] as const) {
      const card = page.getByRole("listitem").first();
      await card.getByRole("button", { name: operation === "edit" ? "Edit" : "Delete", exact: true }).click();
      let release!: () => void;
      const gate = new Promise<void>((resolve) => { release = resolve; });
      await page.route("**/*", async (route) => {
        if (route.request().method() === "POST") await gate;
        await route.continue();
      });
      try {
        await card.getByRole("button", { name: operation === "edit" ? "Save changes" : "Confirm delete", exact: true }).click();
        await expect(card.getByRole("button", { name: operation === "edit" ? "Saving…" : "Deleting…", exact: true })).toBeDisabled();
        await expect(card.getByRole("button", { name: "Cancel", exact: true })).toBeDisabled();
        if (operation === "edit") {
          for (const field of [card.getByLabel("Title", { exact: true }), card.getByLabel("URL", { exact: true }), card.getByLabel(/Note/)]) await expect(field).not.toBeEditable();
        }
      } finally { release(); }
      if (operation === "edit") await expect(card.getByRole("button", { name: "Edit", exact: true })).toBeVisible();
      else await expect(page.getByRole("heading", { name: "No bookmarks yet" })).toBeVisible();
      await page.unrouteAll({ behavior: "wait" });
    }
  });

  test("HTML-like notes remain plain text and external links have safe attributes", async ({ page }) => {
    const note = '<img src=x onerror="window.bookmarkXSS=1"><script>window.bookmarkXSS=1</script>';
    await page.goto("/");
    await add(page, "Escaped note", "https://example.com", note);
    const card = item(page, "Escaped note");
    await expect(card.getByText(note, { exact: true })).toBeVisible();
    await expect(card.locator("img, script")).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { bookmarkXSS?: number }).bookmarkXSS)).toBeUndefined();
    await expect(card.getByRole("link")).toHaveAttribute("target", "_blank");
    await expect(card.getByRole("link")).toHaveAttribute("rel", /noopener/);
    await expect(card.getByRole("link")).toHaveAttribute("rel", /noreferrer/);
    expect((await bookmarks.findOne({ title: "Escaped note" }))?.note).toBe(note);
  });

  test("invalid hidden update/delete IDs fail without changing another record", async ({ page }) => {
    const original = await seed();
    await page.goto("/");
    let card = page.getByRole("listitem").first();
    await card.getByRole("button", { name: "Edit", exact: true }).click();
    await card.getByLabel("Title", { exact: true }).fill("Rejected edit");
    await card.locator('input[name="id"]').evaluate((element) => { (element as HTMLInputElement).value = "not-an-object-id"; });
    await card.getByRole("button", { name: /Save changes/ }).click();
    await expect(card.getByRole("alert")).toContainText(/could not be updated|no longer exists/);
    expect((await bookmarks.findOne({ _id: original._id }))?.title).toBe(original.title);
    await page.reload();
    card = item(page, original.title);
    await card.getByRole("button", { name: "Delete", exact: true }).click();
    await card.locator('input[name="id"]').evaluate((element) => { (element as HTMLInputElement).value = "invalid"; });
    await card.getByRole("button", { name: "Confirm delete", exact: true }).click();
    await expect(card.getByRole("alert")).toContainText(/no longer exists/);
    expect(await bookmarks.countDocuments()).toBe(1);
  });

  test("stale update and delete show recovery guidance", async ({ page }) => {
    for (const operation of ["edit", "delete"]) {
      const original = await seed(`Stale ${operation}`);
      await page.goto("/");
      const card = page.getByRole("listitem").first();
      await card.getByRole("button", { name: operation === "edit" ? "Edit" : "Delete", exact: true }).click();
      await bookmarks.deleteOne({ _id: original._id });
      await card.getByRole("button", { name: operation === "edit" ? /Save changes/ : "Confirm delete" }).click();
      await expect(card.getByRole("alert")).toContainText(/no longer exists/);
      await expect(card.getByRole("alert")).toContainText(/Refresh the page/);
      expect(await bookmarks.countDocuments()).toBe(0);
    }
  });

  test("older pages include tied timestamps without skipping records; malformed cursors recover", async ({ page }) => {
    const createdAt = new Date("2025-01-01T00:00:00.000Z");
    await bookmarks.insertMany(Array.from({ length: 205 }, (_, index) => ({ title: `Bookmark ${String(index).padStart(3, "0")}`, url: "https://example.com", note: "", createdAt: new Date(createdAt.getTime() + Math.floor(index / 70) * 1000), updatedAt: createdAt })));
    const expected = (await bookmarks.find().sort({ createdAt: -1, _id: -1 }).toArray()).map((doc) => doc.title);
    const seen: string[] = [];
    await page.goto("/");
    for (const size of [100, 100, 5]) {
      await expect(page.getByRole("listitem").first().getByRole("link")).toHaveText(expected[seen.length]);
      await expect(page.getByRole("listitem")).toHaveCount(size);
      seen.push(...await page.getByRole("listitem").getByRole("link").allTextContents());
      if (seen.length < 205) await page.getByRole("link", { name: "Older bookmarks", exact: true }).click();
    }
    expect(seen).toEqual(expected);
    await expect(page.getByRole("link", { name: "Older bookmarks", exact: true })).toHaveCount(0);
    await page.getByRole("link", { name: "Back to newest", exact: true }).click();
    await expect(page.getByRole("listitem")).toHaveCount(100);
    for (const query of ["before=bad", "before=bad&before=bad", "before=2025-99-01_0123456789abcdef01234567"]) {
      await page.goto(`/?${query}`);
      await expect(page.getByRole("listitem").first().getByRole("link")).toHaveText(expected[0]);
    }
    await page.getByRole("link", { name: "Older bookmarks", exact: true }).click();
    await add(page, "New link from an older page");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("listitem").first().getByRole("link")).toHaveText("New link from an older page");
  });

  test("empty older pages offer a way back, and the sort index is installed", async ({ page }) => {
    const original = await seed();
    const cursor = `${original.createdAt.toISOString()}_${original._id.toHexString()}`;
    await page.goto(`/?${new URLSearchParams({ before: cursor })}`);
    await expect(page.getByRole("heading", { name: "No older bookmarks", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to newest", exact: true })).toBeVisible();
    const indexes = await bookmarks.listIndexes().toArray();
    expect(indexes.find((index) => index.name === "bookmarks_newest_first")?.key).toEqual({ createdAt: -1, _id: -1 });
  });

  test("creating a bookmark locks the fields until the save finishes", async ({ page }) => {
    await page.goto("/");
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/*", async (route) => {
      if (route.request().method() === "POST") await gate;
      await route.continue();
    });
    try {
      const form = await add(page, "Pending bookmark", "https://example.com", "Keep this note");
      await expect(form.getByRole("button", { name: "Saving…", exact: true })).toBeDisabled();
      for (const field of [form.getByLabel("Title", { exact: true }), form.getByLabel("URL", { exact: true }), form.getByLabel(/Note/)]) {
        await expect(field).not.toBeEditable();
      }
    } finally { release(); }
    await expect(item(page, "Pending bookmark")).toBeVisible();
    await expect(createForm(page).getByLabel("Title", { exact: true })).toBeEditable();
    await page.unrouteAll({ behavior: "wait" });
  });

  test("long unbroken text fits a narrow mobile viewport", async ({ page }) => {
    await seed("T".repeat(120), { url: "https://example.com/" + "u".repeat(1000), note: "N".repeat(1000) });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.getByRole("listitem")).toHaveCount(1);
    const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport);
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});

test.describe("database unavailable", () => {
  test.skip(healthy, "Run in both missing and unreachable URI scenarios.");
  test("shows an outage rather than empty data, and retains rejected mutation input", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Couldn’t load bookmarks", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "No bookmarks yet" })).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(/MONGODB_URI|MongoServerSelectionError|mongodb:\/\//);
    const form = await add(page, "Preserve my bookmark", "https://example.com/outage", "Retry later");
    await expect(form.getByRole("alert")).toContainText(/Could not confirm that the bookmark was saved/);
    await expect(form.getByLabel("Title", { exact: true })).toHaveValue("Preserve my bookmark");
    await expect(form.getByLabel("URL", { exact: true })).toHaveValue("https://example.com/outage");
    await expect(form.getByLabel(/Note/)).toHaveValue("Retry later");
    expect(await bookmarks.countDocuments()).toBe(0);
  });
});
