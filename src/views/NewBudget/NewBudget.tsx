import React, { useState, Dispatch } from 'react';
import { Action, BudgetState } from '../../budget';
import { Content, Button, Header, HeaderSpacer } from '../../components';
import General from '../Settings/General';
import IncomeCategories from '../Settings/Categories/IncomeCategories';
import BudgetCategories from '../Settings/Categories/BudgetCategories';
import useMenu from '../../lib/useMenu';
import { MoneyMoneyRes } from '../../moneymoney';
import { useNumberFormatter } from '../../lib';

type Props = {
  state: BudgetState;
  dispatch: Dispatch<Action>;
  moneyMoney: MoneyMoneyRes;
  onCreate: () => void;
};

type Page = 'general' | 'income' | 'budget';

/* reads categories (may suspend), so only mounted on the category steps */
function CategoryStep({
  page,
  state,
  dispatch,
  readCategories,
}: {
  page: 'income' | 'budget';
  state: BudgetState;
  dispatch: Dispatch<Action>;
  readCategories: MoneyMoneyRes['readCategories'];
}) {
  const [categories] = readCategories();
  return page === 'income' ? (
    <IncomeCategories
      state={state}
      dispatch={dispatch}
      categories={categories}
    />
  ) : (
    <BudgetCategories
      state={state}
      dispatch={dispatch}
      categories={categories}
    />
  );
}

export default function NewBudget({
  onCreate,
  state,
  dispatch,
  moneyMoney,
}: Props) {
  const [page, setPage] = useState<Page>('general');
  useMenu(moneyMoney.refresh);

  if (state === null) {
    throw new Error('Unexpected non-initialized state');
  }

  const numberFormatter = useNumberFormatter(state.settings.fractionDigits);

  return (
    <Content
      padding
      scroll
      header={
        <Header>
          <span>Create a new Budget</span>
          <HeaderSpacer />
          {page === 'general' && (
            <Button
              primary
              disabled={!state.name.length || !state.settings.accounts.length}
              onClick={() => setPage('income')}
            >
              Choose Income Categories
            </Button>
          )}
          {page === 'income' && (
            <Button primary onClick={() => setPage('budget')}>
              Choose Budget Categories
            </Button>
          )}
          {page === 'budget' && (
            <Button primary onClick={onCreate}>
              Create "{state.name}"
            </Button>
          )}
        </Header>
      }
    >
      {page === 'general' && (
        <General
          moneyMoney={moneyMoney}
          state={state}
          dispatch={dispatch}
          numberFormatter={numberFormatter}
        />
      )}
      {page !== 'general' && (
        <CategoryStep
          page={page}
          state={state}
          dispatch={dispatch}
          readCategories={moneyMoney.readCategories}
        />
      )}
    </Content>
  );
}
