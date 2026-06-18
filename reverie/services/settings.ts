/**
 * Reverie Settings Service
 *
 * Passphrases (only) → expo-secure-store
 * Username → SQLite settings table
 */

import * as SecureStore from 'expo-secure-store';
import { KeyManager } from './crypto';
import { initDB, getUsername as dbGetUsername, setUsername as dbSetUsername } from './database';

const INTERNAL_PASSPHRASE_KEY = 'reverie_internal_passphrase';
const MESSAGE_PASSPHRASE_KEY = 'reverie_message_passphrase';

// ---------------------------------------------------------------------------
// SecureStore — passphrases only
// ---------------------------------------------------------------------------

export async function getInternalPassphrase(): Promise<string | null> {
  return SecureStore.getItemAsync(INTERNAL_PASSPHRASE_KEY);
}

export async function setInternalPassphrase(value: string): Promise<void> {
  await SecureStore.setItemAsync(INTERNAL_PASSPHRASE_KEY, value);
}

export async function getMessagePassphrase(): Promise<string | null> {
  return SecureStore.getItemAsync(MESSAGE_PASSPHRASE_KEY);
}

export async function setMessagePassphrase(value: string): Promise<void> {
  await SecureStore.setItemAsync(MESSAGE_PASSPHRASE_KEY, value);
}

// ---------------------------------------------------------------------------
// SQLite — username
// ---------------------------------------------------------------------------

export async function getUsername(): Promise<string | null> {
  await initDB();
  return dbGetUsername();
}

export async function setUsername(value: string): Promise<void> {
  await initDB();
  return dbSetUsername(value);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check whether all required settings (username + both passphrases) are configured.
 */
export async function isConfigured(): Promise<boolean> {
  const [username, ip, mp] = await Promise.all([
    getUsername(),
    getInternalPassphrase(),
    getMessagePassphrase(),
  ]);
  return Boolean(username && ip && mp);
}

/**
 * Read passphrases from SecureStore and derive + cache both AES keys
 * via KeyManager.  Call once on chat mount / startup.
 */
export async function loadAndInitKeys(): Promise<void> {
  const [ip, mp] = await Promise.all([
    getInternalPassphrase(),
    getMessagePassphrase(),
  ]);

  if (!ip || !mp) {
    throw new Error('Passphrases not configured');
  }

  await KeyManager.init(ip, mp);
}
