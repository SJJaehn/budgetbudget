import { useMemo } from 'react';
import type { Transaction, Category, MoneyMoneyRes } from '../moneymoney';
import { BudgetState } from './Types';
import useBudgets from './useBudgets';
import deriveBudgetCategories from './deriveBudgetCategories';

function transactionsLoaded(
  transactions: Transaction[] | Error | null,
): transactions is Transaction[] {
  return Array.isArray(transactions);
}

function categoriesLoaded(
  categories: Category[] | Error | null,
): categories is Category[] {
  return Array.isArray(categories);
}

export default function useBudgetData(
  state: BudgetState,
  { readCategories, readTransactions }: MoneyMoneyRes,
) {
  const { incomeCategories, budgetCategories } = state.settings;

  const transactions = readTransactions();
  const [categories, defaultCategories] = readCategories();
  const usableCategories = useMemo(() => {
    if (!categoriesLoaded(categories)) {
      return [];
    }
    const incomeCategoryIds = incomeCategories
      .map(({ id }) => id)
      .filter((id): id is string => id !== null);
    return categories.filter(({ uuid }) => !incomeCategoryIds.includes(uuid));
  }, [incomeCategories, categories]);

  const { categories: displayCategories, remap } = useMemo(
    () => deriveBudgetCategories(usableCategories, budgetCategories),
    [usableCategories, budgetCategories],
  );

  const [months, extendFuture] = useBudgets(
    transactionsLoaded(transactions) ? transactions : undefined,
    displayCategories,
    defaultCategories,
    state,
    remap,
  );

  return {
    months,
    categories: displayCategories,
    extendFuture,
  };
}
