import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { firebaseDb } from "./firebase";
import type { Budget, Expense } from "./expense-utils";

/* ---------------------------------- users --------------------------------- */

export async function upsertUserDoc(input: {
  uid: string;
  username: string;
  email: string;
  photoURL?: string | null;
  provider: string;
}) {
  const ref = doc(firebaseDb(), "users", input.uid);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await updateDoc(ref, {
      username: input.username || existing.data()['username'] || "",
      email: input.email,
      photoURL: input.photoURL ?? existing.data()['photoURL'] ?? null,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      uid: input.uid,
      username: input.username,
      email: input.email,
      photoURL: input.photoURL ?? null,
      provider: input.provider,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  return (await getDoc(ref)).data() ?? null;
}

export async function fetchUserDoc(uid: string) {
  const snap = await getDoc(doc(firebaseDb(), "users", uid));
  return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
}

export async function updateUserDoc(uid: string, patch: Record<string, unknown>) {
  await updateDoc(doc(firebaseDb(), "users", uid), { ...patch, updatedAt: serverTimestamp() });
}

/* -------------------------------- expenses -------------------------------- */

export async function fetchExpenses(userId: string): Promise<Expense[]> {
  const q = query(
    collection(firebaseDb(), "expenses"),
    where("userId", "==", userId),
    orderBy("date", "desc"),
    limit(1000),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Expense, "id">) }));
}

export async function fetchExpense(id: string): Promise<Expense | null> {
  const snap = await getDoc(doc(firebaseDb(), "expenses", id));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Expense, "id">) }) : null;
}

export type ExpenseInput = {
  title: string;
  amount: number;
  category: string;
  date: string;
  description?: string;
  imageUrl?: string | null;
};

export async function createExpense(userId: string, input: ExpenseInput) {
  const ref = await addDoc(collection(firebaseDb(), "expenses"), {
    userId,
    ...input,
    description: input.description ?? "",
    imageUrl: input.imageUrl ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function saveExpense(id: string, input: ExpenseInput) {
  await updateDoc(doc(firebaseDb(), "expenses", id), {
    ...input,
    description: input.description ?? "",
    imageUrl: input.imageUrl ?? null,
    updatedAt: serverTimestamp(),
  });
}

export async function removeExpense(id: string) {
  await deleteDoc(doc(firebaseDb(), "expenses", id));
}

/* --------------------------------- budgets -------------------------------- */

export async function fetchBudgets(userId: string): Promise<Budget[]> {
  const q = query(collection(firebaseDb(), "budgets"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Budget, "id">) }))
    .sort((a, b) => (a.month < b.month ? 1 : -1));
}

/** One budget per user + month: the document id is deterministic. */
export async function saveBudget(userId: string, month: string, amount: number) {
  const id = `${userId}_${month}`;
  const ref = doc(firebaseDb(), "budgets", id);
  const existing = await getDoc(ref);
  await setDoc(
    ref,
    {
      userId,
      month,
      budget: amount,
      createdAt: existing.exists() ? existing.data()['createdAt'] : serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return id;
}

export async function removeBudget(userId: string, month: string) {
  await deleteDoc(doc(firebaseDb(), "budgets", `${userId}_${month}`));
}
