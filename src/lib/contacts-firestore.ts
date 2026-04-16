import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { User } from "firebase/auth";
import { db } from "./firebase";
import { Contact } from "./types";

function docToContact(docData: Record<string, unknown>, id: string): Contact {
  const toDate = (v: unknown): Date =>
    v instanceof Timestamp ? v.toDate() : (v as Date);

  return {
    id,
    name: docData.name as string,
    nickname: docData.nickname as string | undefined,
    category: docData.category as Contact["category"],
    phone: docData.phone as string | undefined,
    email: docData.email as string | undefined,
    address: docData.address as string | undefined,
    neighborhood: docData.neighborhood as string | undefined,
    city: docData.city as string | undefined,
    tags: (docData.tags as string[]) ?? [],
    notes: docData.notes as string | undefined,
    createdAt: toDate(docData.createdAt),
    createdBy: docData.createdBy as string,
    updatedAt: docData.updatedAt ? toDate(docData.updatedAt) : undefined,
    updatedBy: docData.updatedBy as string | undefined,
  };
}

export function listenToContacts(
  onChange: (contacts: Contact[]) => void
): () => void {
  const q = query(collection(db, "contacts"), orderBy("name", "asc"));
  return onSnapshot(q, (snapshot) => {
    const contacts = snapshot.docs.map((d) =>
      docToContact(d.data() as Record<string, unknown>, d.id)
    );
    onChange(contacts);
  });
}

export async function createContact(
  data: Omit<Contact, "id" | "createdAt" | "createdBy">,
  user: User
): Promise<string> {
  const ref = await addDoc(collection(db, "contacts"), {
    ...data,
    createdAt: serverTimestamp(),
    createdBy: user.email ?? user.uid,
  });
  return ref.id;
}

export async function updateContact(
  id: string,
  updates: Partial<Omit<Contact, "id" | "createdAt" | "createdBy">>,
  user: User
): Promise<void> {
  await updateDoc(doc(db, "contacts", id), {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedBy: user.email ?? user.uid,
  });
}

export async function deleteContact(id: string): Promise<void> {
  await deleteDoc(doc(db, "contacts", id));
}

export async function getContactsSnapshot(): Promise<Contact[]> {
  const q = query(collection(db, "contacts"), orderBy("name", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) =>
    docToContact(d.data() as Record<string, unknown>, d.id)
  );
}
