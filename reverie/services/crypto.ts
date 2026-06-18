/**
 * Reverie Crypto Service
 *
 * AES-256-GCM encryption with PBKDF2 key derivation.
 * Keys are derived once from passphrases and cached in memory via KeyManager.
 *
 * Uses:
 * - @noble/ciphers for AES-256-GCM
 * - @noble/hashes for PBKDF2-SHA256
 * - crypto.getRandomValues (polyfilled by react-native-get-random-values)
 */

import { gcm } from '@noble/ciphers/aes.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes, bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { randomBytes } from '@noble/ciphers/utils.js';

// Fixed application salt for PBKDF2 derivation
const APP_SALT = utf8ToBytes('reverie-v1');
const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 32; // 256 bits
const NONCE_LENGTH = 12; // 96 bits for GCM

// ---------------------------------------------------------------------------
// KeyManager — singleton, in-memory key cache
// ---------------------------------------------------------------------------

let _internalKey: Uint8Array | null = null;
let _messageKey: Uint8Array | null = null;

/**
 * Derive a 256-bit AES key from a passphrase using PBKDF2-SHA256.
 */
async function deriveKey(passphrase: string): Promise<Uint8Array> {
  const passwordBytes = utf8ToBytes(passphrase);
  return pbkdf2Async(sha256, passwordBytes, APP_SALT, {
    c: PBKDF2_ITERATIONS,
    dkLen: KEY_LENGTH,
  });
}

export const KeyManager = {
  /**
   * Derive both keys from passphrases and cache them in memory.
   * Call once on startup / chat mount.
   */
  async init(
    internalPassphrase: string,
    messagePassphrase: string
  ): Promise<void> {
    const [ik, mk] = await Promise.all([
      deriveKey(internalPassphrase),
      deriveKey(messagePassphrase),
    ]);
    _internalKey = ik;
    _messageKey = mk;
  },

  getInternalKey(): Uint8Array {
    if (!_internalKey) throw new Error('KeyManager not initialised');
    return _internalKey;
  },

  getMessageKey(): Uint8Array {
    if (!_messageKey) throw new Error('KeyManager not initialised');
    return _messageKey;
  },

  isInitialized(): boolean {
    return _internalKey !== null && _messageKey !== null;
  },

  clear(): void {
    if (_internalKey) _internalKey.fill(0);
    if (_messageKey) _messageKey.fill(0);
    _internalKey = null;
    _messageKey = null;
  },
};

// ---------------------------------------------------------------------------
// Encrypt / Decrypt  (operate on pre-derived keys, never passphrases)
// ---------------------------------------------------------------------------

/**
 * Encrypt plaintext with AES-256-GCM.
 * Returns hex string: nonceHex + ciphertextWithTagHex
 */
export function encryptMessage(plaintext: string, key: Uint8Array): string {
  const nonce = randomBytes(NONCE_LENGTH);
  const data = utf8ToBytes(plaintext);
  const aes = gcm(key, nonce);
  const sealed = aes.encrypt(data); // ciphertext + 16-byte auth tag
  // Concatenate nonce (12 bytes) + sealed (ciphertext + tag)
  const combined = new Uint8Array(nonce.length + sealed.length);
  combined.set(nonce, 0);
  combined.set(sealed, nonce.length);
  return bytesToHex(combined);
}

/**
 * Decrypt a hex string produced by encryptMessage.
 */
export function decryptMessage(encrypted: string, key: Uint8Array): string {
  const combined = hexToBytes(encrypted);
  const nonce = combined.slice(0, NONCE_LENGTH);
  const sealed = combined.slice(NONCE_LENGTH);
  const aes = gcm(key, nonce);
  const plainBytes = aes.decrypt(sealed);
  return new TextDecoder().decode(plainBytes);
}
