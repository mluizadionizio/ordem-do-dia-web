import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { VotingSession, VotingItem, VoteOption } from "./types";

// ── Sessions ─────────────────────────────────────────────────────────────────

export function listenToSessions(
  onChange: (sessions: VotingSession[]) => void
) {
  const q = query(collection(db, "sessions"), orderBy("importedAt", "desc"));
  return onSnapshot(q, (snap) => {
    const sessions = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        sessionTitle: data.sessionTitle ?? "",
        filename: data.filename ?? "",
        importedAt: (data.importedAt as Timestamp)?.toDate() ?? new Date(),
        importedBy: data.importedBy ?? "",
      } as VotingSession;
    });
    onChange(sessions);
  });
}

export async function createSession(
  session: VotingSession,
  items: VotingItem[]
): Promise<void> {
  const sessionRef = doc(db, "sessions", session.id);
  await setDoc(sessionRef, {
    sessionTitle: session.sessionTitle,
    filename: session.filename,
    importedAt: serverTimestamp(),
    importedBy: session.importedBy,
  });

  // Write items in batches of 400
  const chunks: VotingItem[][] = [];
  for (let i = 0; i < items.length; i += 400) {
    chunks.push(items.slice(i, i + 400));
  }

  try {
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      for (const item of chunk) {
        const itemRef = doc(sessionRef, "items", item.id);
        batch.set(itemRef, {
          index: item.index,
          itemType: item.itemType,
          itemNumber: item.itemNumber,
          author: item.author,
          fullText: item.fullText,
          destaque: item.destaque ?? null,
          docSuggestion: item.docSuggestion ?? null,
          vote: item.vote ?? null,
          fazerAparte: item.fazerAparte,
          fazerDestaque: item.fazerDestaque ?? false,
          notes: item.notes,
          voteUpdatedBy: null,
          voteUpdatedAt: null,
          aparteUpdatedBy: null,
          destaqueUpdatedBy: null,
          notesUpdatedBy: null,
        });
      }
      await batch.commit();
    }
  } catch (err) {
    await deleteDoc(sessionRef);
    throw err;
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  const sessionRef = doc(db, "sessions", sessionId);
  const itemsSnap = await getDocs(collection(sessionRef, "items"));
  const batch = writeBatch(db);
  itemsSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(sessionRef);
  await batch.commit();
}

// ── Items ─────────────────────────────────────────────────────────────────────

export function listenToItems(
  sessionId: string,
  onChange: (items: VotingItem[]) => void
) {
  const q = query(
    collection(db, "sessions", sessionId, "items"),
    orderBy("index")
  );
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        index: data.index ?? 0,
        itemType: data.itemType ?? "OUTRO",
        itemNumber: data.itemNumber ?? "",
        author: data.author ?? "",
        fullText: data.fullText ?? "",
        destaque: data.destaque ?? undefined,
        docSuggestion: data.docSuggestion ?? undefined,
        vote: data.vote ?? null,
        fazerAparte: data.fazerAparte ?? false,
        fazerDestaque: data.fazerDestaque ?? false,
        notes: data.notes ?? "",
        voteUpdatedBy: data.voteUpdatedBy ?? undefined,
        voteUpdatedAt: (data.voteUpdatedAt as Timestamp)?.toDate() ?? undefined,
        aparteUpdatedBy: data.aparteUpdatedBy ?? undefined,
        destaqueUpdatedBy: data.destaqueUpdatedBy ?? undefined,
        notesUpdatedBy: data.notesUpdatedBy ?? undefined,
      } as VotingItem;
    });
    onChange(items);
  });
}

export async function updateVote(
  sessionId: string,
  itemId: string,
  vote: VoteOption,
  byUser: string
): Promise<void> {
  const ref = doc(db, "sessions", sessionId, "items", itemId);
  await updateDoc(ref, {
    vote: vote ?? null,
    voteUpdatedBy: byUser,
    voteUpdatedAt: serverTimestamp(),
  });
}

export async function updateAparte(
  sessionId: string,
  itemId: string,
  fazerAparte: boolean,
  byUser: string
): Promise<void> {
  const ref = doc(db, "sessions", sessionId, "items", itemId);
  await updateDoc(ref, {
    fazerAparte,
    aparteUpdatedBy: byUser,
    aparteUpdatedAt: serverTimestamp(),
  });
}

export async function updateDestaque(
  sessionId: string,
  itemId: string,
  fazerDestaque: boolean,
  byUser: string
): Promise<void> {
  const ref = doc(db, "sessions", sessionId, "items", itemId);
  await updateDoc(ref, {
    fazerDestaque,
    destaqueUpdatedBy: byUser,
    destaqueUpdatedAt: serverTimestamp(),
  });
}

export async function updateNotes(
  sessionId: string,
  itemId: string,
  notes: string,
  byUser: string
): Promise<void> {
  const ref = doc(db, "sessions", sessionId, "items", itemId);
  await updateDoc(ref, {
    notes,
    notesUpdatedBy: byUser,
    notesUpdatedAt: serverTimestamp(),
  });
}

// ── Manual item addition ───────────────────────────────────────────────────────

export async function addItemToSession(
  sessionId: string,
  item: VotingItem
): Promise<void> {
  const ref = doc(db, "sessions", sessionId, "items", item.id);
  await setDoc(ref, {
    index: item.index,
    itemType: item.itemType,
    itemNumber: item.itemNumber,
    author: item.author,
    fullText: item.fullText,
    destaque: item.destaque ?? null,
    docSuggestion: item.docSuggestion ?? null,
    vote: null,
    fazerAparte: false,
    fazerDestaque: false,
    notes: "",
    voteUpdatedBy: null,
    voteUpdatedAt: null,
    aparteUpdatedBy: null,
    destaqueUpdatedBy: null,
    notesUpdatedBy: null,
  });
}

// ── Reordering ────────────────────────────────────────────────────────────────

/** Troca os índices de dois itens (usado para mover para cima/baixo) */
export async function swapItemIndexes(
  sessionId: string,
  itemA: VotingItem,
  itemB: VotingItem
): Promise<void> {
  const batch = writeBatch(db);
  const refA = doc(db, "sessions", sessionId, "items", itemA.id);
  const refB = doc(db, "sessions", sessionId, "items", itemB.id);
  batch.update(refA, { index: itemB.index });
  batch.update(refB, { index: itemA.index });
  await batch.commit();
}
