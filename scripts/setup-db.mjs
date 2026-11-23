import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Set MONGODB_URI before preparing the database.");
  process.exit(1);
}

let client;
try {
  client = new MongoClient(uri, {
    appName: "devrel-tutorial-javascript-nextjstemplate",
    serverSelectionTimeoutMS: 5000,
  });
  await client.connect();
  await client.db().collection("bookmarks").createIndex(
    { createdAt: -1, _id: -1 },
    { name: "bookmarks_newest_first" },
  );
  console.log("Bookmark index is ready.");
} catch {
  console.error("Could not prepare the bookmark index. Check the connection and database permissions.");
  process.exitCode = 1;
} finally {
  await client?.close().catch(() => {
    console.error("Could not close the database connection.");
    process.exitCode = 1;
  });
}
