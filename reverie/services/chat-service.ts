/**
 * Reverie Chat Service
 *
 * Handles Firestore message sync:
 * - Send: encrypt → Firestore → update SQLite status
 * - Receive: onSnapshot → decrypt → re-encrypt → SQLite (INSERT OR IGNORE)
 * - Seen: update seenBy via arrayUnion (no deletion)
 *
 * Firestore path: /chats/main/messages
 */

import {
  setDoc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  doc,
  serverTimestamp,
  arrayUnion,
  type Unsubscribe,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';

import { getMessagesCollection, db } from './firebase-config';
import { KeyManager, encryptMessage, decryptMessage } from './crypto';
import {
  saveMessage,
  saveOutgoingMessage,
  updateMessageStatus,
  messageExists,
  type LocalMessage,
} from './database';

const MESSAGE_VERSION = '1.0';

// ---------------------------------------------------------------------------
// Send
// ---------------------------------------------------------------------------

export interface SendResult {
  localId: number;
  firestoreId: string;
}

/**
 * Send a message:
 * 1. Encrypt with internal key → save to SQLite (status: sending)
 * 2. Encrypt with message key → write to Firestore
 * 3. On success → update SQLite (status: sent, set firestoreId)
 * 4. On failure → update SQLite (status: failed)
 */
export async function sendMessage(
  text: string,
  sender: string
): Promise<SendResult> {
  const internalKey = KeyManager.getInternalKey();
  const messageKey = KeyManager.getMessageKey();

  // Encrypt for local storage
  const localEncrypted = encryptMessage(text, internalKey);
  const now = Date.now(); // local timestamp for optimistic insert
  
  // 1. Generate Firestore doc ID upfront
  const docRef = doc(getMessagesCollection());
  
  // 2. Optimistic local insert using the actual Firestore ID
  const localId = await saveOutgoingMessage({
    tempId: docRef.id,
    sender,
    encryptedContent: localEncrypted,
    timestamp: now,
    type: 'text',
  });

  try {
    // Encrypt for Firestore transit
    const firestoreEncrypted = encryptMessage(text, messageKey);

    // 3. Write to Firestore
    await setDoc(docRef, {
      sender,
      encryptedContent: firestoreEncrypted,
      timestamp: serverTimestamp(),
      seenBy: [sender],
      version: MESSAGE_VERSION,
      type: 'text',
    });

    // Success — update local status to sent (firestoreId is already set correctly)
    await updateMessageStatus(localId, 'sent', docRef.id);

    return { localId, firestoreId: docRef.id };
  } catch (error) {
    // Failure — mark as failed
    await updateMessageStatus(localId, 'failed');
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Receive / Sync (onSnapshot listener)
// ---------------------------------------------------------------------------

/**
 * Start listening for Firestore messages.
 *
 * - New messages not in SQLite are decrypted (message key), re-encrypted
 *   (internal key), and saved locally via INSERT OR IGNORE.
 * - The callback receives the updated list of *all* local messages
 *   so the UI can re-render.
 *
 * Returns an unsubscribe function.
 */
export function subscribeToMessages(
  currentUsername: string,
  onUpdate: (messages: LocalMessage[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const messagesRef = getMessagesCollection();
  const q = query(messagesRef, orderBy('timestamp', 'asc'));

  return onSnapshot(
    q,
    async (snapshot: QuerySnapshot<DocumentData>) => {
      try {
        const internalKey = KeyManager.getInternalKey();
        const messageKey = KeyManager.getMessageKey();
        const docsToMarkSeen: string[] = [];

        for (const change of snapshot.docChanges()) {
          if (change.type === 'added' || change.type === 'modified') {
            const docData = change.doc.data();
            const firestoreId = change.doc.id;

            // Skip if already in local DB
            const exists = await messageExists(firestoreId);
            if (exists) {
              // Still check if we need to mark as seen
              const seenBy: string[] = docData.seenBy ?? [];
              if (!seenBy.includes(currentUsername)) {
                docsToMarkSeen.push(firestoreId);
              }
              continue;
            }

            // Decrypt with message key, re-encrypt with internal key
            try {
              const plaintext = decryptMessage(docData.encryptedContent, messageKey);
              const localEncrypted = encryptMessage(plaintext, internalKey);

              // Extract timestamp — Firestore serverTimestamp may be null on pending writes
              let timestamp = Date.now();
              if (docData.timestamp && typeof docData.timestamp.toMillis === 'function') {
                timestamp = docData.timestamp.toMillis();
              }

              await saveMessage({
                firestoreId,
                sender: docData.sender,
                encryptedContent: localEncrypted,
                timestamp,
                type: docData.type ?? 'text',
              });
            } catch {
              // Decryption failed — wrong key or corrupt data; skip silently
              console.warn(`[Reverie] Failed to decrypt message ${firestoreId}`);
              continue;
            }

            // Mark as seen if it's from the other user
            const seenBy: string[] = docData.seenBy ?? [];
            if (!seenBy.includes(currentUsername)) {
              docsToMarkSeen.push(firestoreId);
            }
          }
        }

        // Batch-update seenBy for messages we just saw
        await Promise.all(
          docsToMarkSeen.map((docId) =>
            updateDoc(doc(db, 'chats', 'main', 'messages', docId), {
              seenBy: arrayUnion(currentUsername),
            }).catch(() => {
              // Non-critical — just means seenBy wasn't updated this time
            })
          )
        );

        // Fetch all local messages and notify the UI
        const { getMessages } = await import('./database');
        const allMessages = await getMessages();
        onUpdate(allMessages);
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    },
    (error) => {
      onError?.(error);
    }
  );
}
