import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "./auth";
import { fetchBudgets, fetchExpenses } from "./data";
import type { Budget, Expense } from "./expense-utils";

export function useExpenses() {
  const { user } = useAuth();
  return useQuery<Expense[]>({
    queryKey: ["expenses", user?.uid],
    queryFn: () => fetchExpenses(user!.uid),
    enabled: Boolean(user?.uid),
    staleTime: 30_000,
  });
}

export function useBudgets() {
  const { user } = useAuth();
  return useQuery<Budget[]>({
    queryKey: ["budgets", user?.uid],
    queryFn: () => fetchBudgets(user!.uid),
    enabled: Boolean(user?.uid),
    staleTime: 30_000,
  });
}

export function useRefreshData() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["expenses", user?.uid] });
    void queryClient.invalidateQueries({ queryKey: ["budgets", user?.uid] });
  };
}
