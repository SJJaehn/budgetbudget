import getMonthData from '../getMonthData';
import { BudgetDisplayCategory } from '../deriveBudgetCategories';
import { InterMonthData } from '../Types';
import { Balance } from '../../moneymoney';

function displayCat(
  uuid: string,
  indentation: number,
  extra: Partial<BudgetDisplayCategory> = {},
): BudgetDisplayCategory {
  return {
    budget: {},
    name: uuid,
    currency: 'EUR',
    default: false,
    group: false,
    icon: '',
    indentation,
    uuid,
    ...extra,
  };
}

const initial: InterMonthData = {
  uncategorized: { amount: 0, transactions: [] },
  total: { budgeted: 0, spend: 0, balance: 0 },
  categories: [],
  overspendPrevMonth: 0,
  toBudget: 0,
  income: { amount: 0, transactions: [] },
  overspendRolloverState: {},
  rollover: { total: 0 },
  availableThisMonth: { amount: 0, transactions: [] },
  available: [{ amount: 0, transactions: [] }],
};

describe('getMonthData with aggregate folders', () => {
  it('sums member spend onto the aggregate line without double-counting read-only rows', () => {
    const categories: BudgetDisplayCategory[] = [
      displayCat('Food', 0, {
        aggregate: true,
        members: ['Groceries', 'Restaurants'],
      }),
      displayCat('Groceries', 1, {
        readOnly: true,
        aggregateParent: 'Food',
      }),
      displayCat('Restaurants', 1, {
        readOnly: true,
        aggregateParent: 'Food',
      }),
    ];
    const balance: Balance = {
      total: -150,
      categories: {
        Groceries: { amount: -100, transactions: [] },
        Restaurants: { amount: -50, transactions: [] },
      },
      uncategorised: { amount: 0, transactions: [] },
    };
    const budget = { categories: { Food: { amount: 200 } } };

    const data = getMonthData('2021-03')(
      () => initial,
      balance,
      budget,
      categories,
      [],
      (v) => v,
    ).get();

    const [food, groceries, restaurants] = data.categories;

    /* aggregate line: single budget, summed spend */
    expect(food.uuid).toBe('Food');
    expect(food.group).toBe(false);
    expect((food as any).aggregate).toBe(true);
    expect(food.budgeted).toBe(200);
    expect(food.spend).toBe(-150);
    expect(food.balance).toBe(50);

    /* read-only rows: own spend, no budget, no balance */
    expect((groceries as any).readOnly).toBe(true);
    expect(groceries.budgeted).toBe(0);
    expect(groceries.spend).toBe(-100);
    expect(groceries.balance).toBe(0);
    expect(restaurants.spend).toBe(-50);

    /* totals count the folder once, not the read-only breakdown rows */
    expect(data.total.budgeted).toBe(200);
    expect(data.total.spend).toBe(-150);
    expect(data.total.balance).toBe(50);
  });
});
