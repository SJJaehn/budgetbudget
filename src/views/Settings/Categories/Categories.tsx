import React from 'react';
import { Props } from './Types';
import IncomeCategories from './IncomeCategories';
import BudgetCategories from './BudgetCategories';
import { MoneyMoneyRes } from '../../../moneymoney';

export default function CategorySettings({
  moneyMoney: { readCategories },
  ...props
}: Omit<Props, 'categories'> & {
  moneyMoney: MoneyMoneyRes;
}) {
  const [categories] = readCategories();

  return (
    <>
      <IncomeCategories {...props} categories={categories} />
      <BudgetCategories {...props} categories={categories} />
    </>
  );
}
