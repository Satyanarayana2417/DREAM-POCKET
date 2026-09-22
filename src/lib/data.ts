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
import type { Budget, Expense, Family, FamilyMember, FamilyBudget, FamilyExpense, FamilyInvitation } from "./expense-utils";

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
      username: input.username || existing.data()["username"] || "",
      email: input.email,
      photoURL: input.photoURL ?? existing.data()["photoURL"] ?? null,
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

export async function fetchUsersByIds(uids: string[]) {
  if (!uids.length) return [];
  const q = query(collection(firebaseDb(), "users"), where("uid", "in", uids));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
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
  return snap.exists() ? { id: snap.id, ...(snap.data() as Omit<Expense, "id">) } : null;
}

export type ExpenseInput = {
  title: string;
  amount: number;
  category: string;
  date: string;
  description?: string;
  imageUrl?: string | null;
  isBudgetExpense?: boolean;
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
      createdAt: existing.exists() ? existing.data()["createdAt"] : serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return id;
}

export async function removeBudget(userId: string, month: string) {
  await deleteDoc(doc(firebaseDb(), "budgets", `${userId}_${month}`));
}

/* --------------------------------- families ------------------------------- */

export async function createFamily(name: string, ownerId: string, initialBudget: number) {
  const familyRef = await addDoc(collection(firebaseDb(), "families"), {
    familyName: name,
    ownerId,
    memberIds: [ownerId],
    pendingMemberIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const memberRef = doc(firebaseDb(), `families/${familyRef.id}/members`, ownerId);
  await setDoc(memberRef, {
    userId: ownerId,
    role: "owner",
    status: "active",
    joinedAt: serverTimestamp(),
  });

  if (initialBudget > 0) {
    const d = new Date();
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    await saveFamilyMemberBudget(familyRef.id, ownerId, month, initialBudget);
  }

  return familyRef.id;
}

export async function fetchFamilies(userId: string): Promise<Family[]> {
  const q = query(
    collection(firebaseDb(), "families"),
    where("memberIds", "array-contains", userId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Family, "id">) }));
}

export async function fetchFamilyById(familyId: string): Promise<Family | null> {
  const snap = await getDoc(doc(firebaseDb(), "families", familyId));
  return snap.exists() ? { id: snap.id, ...(snap.data() as Omit<Family, "id">) } : null;
}

export async function fetchAllUsers() {
  const q = query(
    collection(firebaseDb(), "users"),
    limit(100)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function createFamilyInvitation(familyId: string, familyName: string, invitedUserId: string, invitedBy: string) {
  const familyRef = doc(firebaseDb(), "families", familyId);
  const fam = await getDoc(familyRef);
  if (!fam.exists()) throw new Error("Family not found");

  const pendingMemberIds = (fam.data()?.["pendingMemberIds"] as string[]) || [];
  const memberIds = (fam.data()?.["memberIds"] as string[]) || [];
  
  if (!pendingMemberIds.includes(invitedUserId) && !memberIds.includes(invitedUserId)) {
    await updateDoc(familyRef, {
      pendingMemberIds: [...pendingMemberIds, invitedUserId],
      updatedAt: serverTimestamp(),
    });
  }

  await addDoc(collection(firebaseDb(), "familyInvitations"), {
    familyId,
    familyName,
    invitedUserId,
    invitedBy,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

export async function acceptInvitation(familyId: string, userId: string, invitationId?: string) {
  const familyRef = doc(firebaseDb(), "families", familyId);
  const fam = await getDoc(familyRef);
  if (!fam.exists()) return;

  const pendingMemberIds = (fam.data()?.["pendingMemberIds"] as string[]) || [];
  const memberIds = (fam.data()?.["memberIds"] as string[]) || [];

  await updateDoc(familyRef, {
    pendingMemberIds: pendingMemberIds.filter((id) => id !== userId),
    memberIds: [...new Set([...memberIds, userId])],
    updatedAt: serverTimestamp(),
  });

  const memberRef = doc(firebaseDb(), `families/${familyId}/members`, userId);
  await setDoc(memberRef, {
    userId: userId,
    role: "member",
    status: "active",
    joinedAt: serverTimestamp(),
  });

  if (invitationId) {
    await updateDoc(doc(firebaseDb(), "familyInvitations", invitationId), { status: "accepted" });
  }
}

export async function rejectInvitation(familyId: string, userId: string, invitationId?: string) {
  const familyRef = doc(firebaseDb(), "families", familyId);
  const fam = await getDoc(familyRef);
  if (!fam.exists()) return;

  const pendingMemberIds = (fam.data()?.["pendingMemberIds"] as string[]) || [];

  await updateDoc(familyRef, {
    pendingMemberIds: pendingMemberIds.filter((id) => id !== userId),
    updatedAt: serverTimestamp(),
  });

  if (invitationId) {
    await updateDoc(doc(firebaseDb(), "familyInvitations", invitationId), { status: "declined" });
  }
}

export async function fetchPendingInvitations(userId: string): Promise<FamilyInvitation[]> {
  const q = query(
    collection(firebaseDb(), "familyInvitations"),
    where("invitedUserId", "==", userId),
    where("status", "==", "pending")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FamilyInvitation, "id">) }));
}

export async function fetchFamilyMembers(familyId: string): Promise<FamilyMember[]> {
  const snap = await getDocs(collection(firebaseDb(), `families/${familyId}/members`));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FamilyMember, "id">) }));
}

/* ----------------------------- family budgets ----------------------------- */

export async function fetchFamilyBudgets(familyId: string): Promise<FamilyBudget[]> {
  const q = query(collection(firebaseDb(), `familyBudgets`), where("familyId", "==", familyId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<FamilyBudget, "id">) }))
    .sort((a, b) => (a.month < b.month ? 1 : -1));
}

export async function saveFamilyMemberBudget(familyId: string, userId: string, month: string, amount: number) {
  const id = `${familyId}_${userId}_${month}`;
  const ref = doc(firebaseDb(), `familyBudgets`, id);
  const existing = await getDoc(ref);
  await setDoc(
    ref,
    {
      familyId,
      userId,
      month,
      budget: amount,
      createdAt: existing.exists() ? existing.data()["createdAt"] : serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return id;
}

/* ----------------------------- family expenses ---------------------------- */

export async function fetchFamilyExpenses(familyId: string): Promise<FamilyExpense[]> {
  const q = query(
    collection(firebaseDb(), `families/${familyId}/expenses`),
    orderBy("date", "desc"),
    limit(1000)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FamilyExpense, "id">) }));
}

export async function createFamilyExpense(familyId: string, addedBy: string, input: ExpenseInput) {
  const ref = await addDoc(collection(firebaseDb(), `families/${familyId}/expenses`), {
    familyId,
    addedBy,
    ...input,
    description: input.description ?? "",
    imageUrl: input.imageUrl ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function removeFamilyExpense(familyId: string, expenseId: string) {
  await deleteDoc(doc(firebaseDb(), `families/${familyId}/expenses`, expenseId));
}
