import "server-only";

import { MongoClient, type Db, type MongoClientOptions } from "mongodb";

const uri = process.env.MONGODB_URI;

// Connection metadata so MongoDB can identify this app in monitoring and
// logs.
const appName = "devrel-tutorial-javascript-nextjstemplate";

// Wait up to five seconds to select a MongoDB server.
// This timeout does not limit the full HTTP request.
const serverSelectionTimeoutMS = 5000;

const options: MongoClientOptions = {
  appName,
  serverSelectionTimeoutMS,
};

let clientPromise: Promise<MongoClient> | null = null;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

/**
 * Lazily connects to MongoDB and returns a shared client promise. The client
 * is created only on first use (nothing connects at import time, so a static
 * build never opens a connection) and the promise is cached:
 * - development: on `globalThis`, so the client survives HMR reloads
 * - production: on this module
 * A failed connection attempt clears the cached promise so a later call can
 * retry. Connection details and raw driver errors are never logged here.
 */
export function getClient(): Promise<MongoClient> {
  if (!uri) {
    // Generic message only — never echo connection strings or secrets.
    throw new Error(
      "MongoDB is not configured. Set the MONGODB_URI environment variable.",
    );
  }

  if (process.env.NODE_ENV === "development") {
    if (global._mongoClientPromise) {
      return global._mongoClientPromise;
    }
    clientPromise = new MongoClient(uri, options)
      .connect()
      .catch((error) => {
        global._mongoClientPromise = undefined;
        clientPromise = null;
        throw error;
      });
    global._mongoClientPromise = clientPromise;
    return clientPromise;
  }

  if (!clientPromise) {
    clientPromise = new MongoClient(uri, options)
      .connect()
      .catch((error) => {
        clientPromise = null;
        throw error;
      });
  }
  return clientPromise;
}

/**
 * Returns the default database from MONGODB_URI. The database is never
 * selected from untrusted input.
 */
export async function getDatabase(): Promise<Db> {
  const client = await getClient();
  return client.db();
}

