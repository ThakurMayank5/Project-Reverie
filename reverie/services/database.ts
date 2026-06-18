/**
 * Reverie Local Database Service
 *
 * Uses expo-sqlite async API for local message persistence.
 * Messages are stored AES-256-GCM encrypted (with the internal key).
 * firestoreId UNIQUE constraint prevents duplicate inserts.
 */

import * as SQLite from 'expo-sqlite';

export type MessageStatus = 'sending' | 'sent' | 'failed';

export interface LocalMessage {
  id: number;
  firestoreId: string;
  sender: string;
  encryptedContent: string;
  timestamp: number;
  seen: number;
  status: MessageStatus;
  type: string;
}

let _db: SQLite.SQLiteDatabase | null = null;

/**
 * Open the database and create tables if they don't exist.
 */
export async function initDB(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;

  _db = await SQLite.openDatabaseAsync('reverie.db');

  await _db.execAsync(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firestoreId TEXT UNIQUE,
      sender TEXT NOT NULL,
      encryptedContent TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      seen INTEGER DEFAULT 0,
      status TEXT DEFAULT 'sent',
      type TEXT DEFAULT 'text'
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  return _db;
}

/**
 * Get the database instance (must call initDB first).
 */
function getDB(): SQLite.SQLiteDatabase {
  if (!_db) throw new Error('Database not initialised. Call initDB() first.');
  return _db;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/**
 * Save a message received from Firestore.
 * Uses INSERT OR IGNORE — firestoreId UNIQUE prevents duplicates.
 */
export async function saveMessage(msg: {
  firestoreId: string;
  sender: string;
  encryptedContent: string;
  timestamp: number;
  type?: string;
}): Promise<void> {
  const db = getDB();
  await db.runAsync(
    `INSERT OR IGNORE INTO messages (firestoreId, sender, encryptedContent, timestamp, status, type)
     VALUES (?, ?, ?, ?, 'sent', ?)`,
    [msg.firestoreId, msg.sender, msg.encryptedContent, msg.timestamp, msg.type ?? 'text']
  );
}

/**
 * Insert an outgoing message with status 'sending'.
 * Returns the local row id so we can update status later.
 */
export async function saveOutgoingMessage(msg: {
  tempId: string;
  sender: string;
  encryptedContent: string;
  timestamp: number;
  type?: string;
}): Promise<number> {
  const db = getDB();
  const result = await db.runAsync(
    `INSERT INTO messages (firestoreId, sender, encryptedContent, timestamp, status, type)
     VALUES (?, ?, ?, ?, 'sending', ?)`,
    [msg.tempId, msg.sender, msg.encryptedContent, msg.timestamp, msg.type ?? 'text']
  );
  return result.lastInsertRowId;
}

/**
 * Update the status of a message and optionally set its firestoreId.
 */
export async function updateMessageStatus(
  localId: number,
  status: MessageStatus,
  firestoreId?: string
): Promise<void> {
  const db = getDB();
  if (firestoreId) {
    await db.runAsync(
      `UPDATE messages SET status = ?, firestoreId = ? WHERE id = ?`,
      [status, firestoreId, localId]
    );
  } else {
    await db.runAsync(
      `UPDATE messages SET status = ? WHERE id = ?`,
      [status, localId]
    );
  }
}

/**
 * Get all messages ordered by timestamp ascending.
 */
export async function getMessages(): Promise<LocalMessage[]> {
  const db = getDB();
  return db.getAllAsync<LocalMessage>(
    `SELECT * FROM messages ORDER BY timestamp ASC`
  );
}

/**
 * Check whether a message with a given firestoreId exists locally.
 */
export async function messageExists(firestoreId: string): Promise<boolean> {
  const db = getDB();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM messages WHERE firestoreId = ?`,
    [firestoreId]
  );
  return (row?.count ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Settings (username stored here, passphrases in SecureStore)
// ---------------------------------------------------------------------------

export async function getSettingValue(key: string): Promise<string | null> {
  const db = getDB();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = ?`,
    [key]
  );
  return row?.value ?? null;
}

export async function setSettingValue(key: string, value: string): Promise<void> {
  const db = getDB();
  await db.runAsync(
    `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
    [key, value]
  );
}

export async function getUsername(): Promise<string | null> {
  return getSettingValue('username');
}

export async function setUsername(username: string): Promise<void> {
  return setSettingValue('username', username);
}
