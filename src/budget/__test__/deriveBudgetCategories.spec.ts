import deriveBudgetCategories, {
  OTHERS_UUID,
} from '../deriveBudgetCategories';
import { Category } from '../../moneymoney';

function cat(uuid: string, indentation: number, group = false): Category {
  return {
    budget: {},
    name: uuid,
    currency: 'EUR',
    default: false,
    group,
    icon: '',
    indentation,
    uuid,
  };
}

/*
 * Food (group)
 *   Groceries
 *   Restaurants
 * Rent
 */
const flatTree: Category[] = [
  cat('Food', 0, true),
  cat('Groceries', 1),
  cat('Restaurants', 1),
  cat('Rent', 0),
];

/*
 * A (group)
 *   B (group)
 *     C
 *   D
 */
const nestedTree: Category[] = [
  cat('A', 0, true),
  cat('B', 1, true),
  cat('C', 2),
  cat('D', 1),
];

const uuids = (cats: Category[]) => cats.map((c) => c.uuid);

describe('deriveBudgetCategories', () => {
  it('returns the input untouched when there is no explicit selection', () => {
    const result = deriveBudgetCategories(flatTree, undefined);
    expect(result.categories).toBe(flatTree);
    expect(result.remap).toEqual({});
  });

  it('collapses everything unselected into a single "Others" leaf', () => {
    const { categories, remap } = deriveBudgetCategories(flatTree, [
      'Groceries',
    ]);
    /* Food kept as header (has a selected descendant), Groceries kept, Others appended */
    expect(uuids(categories)).toEqual(['Food', 'Groceries', OTHERS_UUID]);
    const food = categories.find((c) => c.uuid === 'Food')!;
    expect(food.group).toBe(true);
    const others = categories.find((c) => c.uuid === OTHERS_UUID)!;
    expect(others.group).toBe(false);
    expect(remap).toEqual({
      Restaurants: OTHERS_UUID,
      Rent: OTHERS_UUID,
    });
  });

  it('turns a selected folder into a budgetable aggregate + read-only children', () => {
    const { categories, remap } = deriveBudgetCategories(flatTree, ['Food']);
    /* Food becomes a budgetable leaf; its children follow as read-only rows */
    expect(uuids(categories)).toEqual([
      'Food',
      'Groceries',
      'Restaurants',
      OTHERS_UUID,
    ]);
    const food = categories.find((c) => c.uuid === 'Food')!;
    expect(food.group).toBe(false);
    expect(food.aggregate).toBe(true);
    expect(food.members).toEqual(['Groceries', 'Restaurants']);
    const groceries = categories.find((c) => c.uuid === 'Groceries')!;
    expect(groceries.readOnly).toBe(true);
    expect(groceries.aggregateParent).toBe('Food');
    expect(groceries.indentation).toBe(1);
    /* aggregated children keep their own balances -> only Rent -> Others */
    expect(remap).toEqual({ Rent: OTHERS_UUID });
  });

  it('does not append "Others" when everything is budgeted', () => {
    const { categories, remap } = deriveBudgetCategories(flatTree, [
      'Groceries',
      'Restaurants',
      'Rent',
    ]);
    expect(uuids(categories)).toEqual([
      'Food',
      'Groceries',
      'Restaurants',
      'Rent',
    ]);
    expect(remap).toEqual({});
  });

  it('flattens the whole subtree of a selected nested folder into read-only leaves', () => {
    const { categories, remap } = deriveBudgetCategories(nestedTree, ['A']);
    /* A is the aggregate line; the sub-group B is dropped, its leaves C & D
       become read-only children of A */
    expect(uuids(categories)).toEqual(['A', 'C', 'D']);
    const a = categories[0];
    expect(a.group).toBe(false);
    expect(a.aggregate).toBe(true);
    expect(a.members).toEqual(['C', 'D']);
    expect(categories[1].readOnly).toBe(true);
    expect(categories[1].aggregateParent).toBe('A');
    expect(categories[1].indentation).toBe(1);
    expect(remap).toEqual({});
  });

  it('keeps ancestor headers of a selected sub-folder (contiguous indentation)', () => {
    const { categories, remap } = deriveBudgetCategories(nestedTree, ['B']);
    /* A stays a header, B becomes the aggregate line with read-only child C */
    expect(uuids(categories)).toEqual(['A', 'B', 'C', OTHERS_UUID]);
    expect(categories.find((c) => c.uuid === 'A')!.group).toBe(true);
    const b = categories.find((c) => c.uuid === 'B')!;
    expect(b.group).toBe(false);
    expect(b.aggregate).toBe(true);
    expect(b.members).toEqual(['C']);
    expect(categories.find((c) => c.uuid === 'C')!.readOnly).toBe(true);
    expect(remap).toEqual({ D: OTHERS_UUID });
  });

  it('drops group headers that end up with no selected descendant', () => {
    /* selecting only Rent leaves the Food group empty -> dropped */
    const { categories } = deriveBudgetCategories(flatTree, ['Rent']);
    expect(uuids(categories)).toEqual(['Rent', OTHERS_UUID]);
  });
});
