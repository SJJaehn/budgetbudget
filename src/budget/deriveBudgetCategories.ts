import { Category } from '../moneymoney';

export const OTHERS_UUID = '__OTHERS__';

/**
 * A category as shown in the budget grid / sidebar. Extends the raw MoneyMoney
 * category with budget-specific display flags:
 * - `aggregate` + `members`: a selected folder collapsed into one budget line;
 *   `members` are the uuids whose spending it aggregates.
 * - `readOnly` + `aggregateParent`: a subcategory shown underneath an aggregate
 *   folder purely to reveal where the money went (no budget of its own).
 */
export type BudgetDisplayCategory = Category & {
  aggregate?: boolean;
  members?: string[];
  readOnly?: boolean;
  aggregateParent?: string;
};

export type CategoryRemap = { [uuid: string]: string };
export type DerivedBudgetCategories = {
  /** display list for the sidebar and month grids */
  categories: BudgetDisplayCategory[];
  /** original category uuid -> budget bucket uuid (only used for "Others") */
  remap: CategoryRemap;
};

function othersCategory(currency: string): BudgetDisplayCategory {
  return {
    budget: {},
    name: 'Others',
    currency,
    default: false,
    group: false,
    icon: '',
    indentation: 0,
    uuid: OTHERS_UUID,
  };
}

type StackEntry = {
  indentation: number;
  uuid: string;
  selected: boolean;
  /** keep-flag for unselected group headers; undefined for other groups */
  headerRef?: { keep: boolean };
  /** the emitted aggregate leaf, when this group is a selected folder */
  aggregateLeaf?: BudgetDisplayCategory;
};

/**
 * Turns the raw (income-excluded) MoneyMoney category tree into the list of
 * categories that are actually budgeted, based on an explicit selection.
 *
 * - A selected folder becomes a single budgetable aggregate line, followed by
 *   its subcategories as read-only rows (so spending can be inspected).
 * - A selected leaf stays as-is.
 * - Everything unselected is collapsed into a single "Others" leaf.
 * - Unselected group headers are only kept when they still contain a selected
 *   descendant (guarantees contiguous indentation for downstream consumers).
 *
 * `budgetCategories === undefined` means "budget every category individually"
 * (the backwards-compatible default) and returns the input untouched.
 */
export default function deriveBudgetCategories(
  categories: Category[],
  budgetCategories?: string[],
): DerivedBudgetCategories {
  if (budgetCategories == null) {
    return { categories, remap: {} };
  }

  const selected = new Set(budgetCategories);
  const remap: CategoryRemap = {};
  const output: BudgetDisplayCategory[] = [];
  const headerRefs = new Map<BudgetDisplayCategory, { keep: boolean }>();
  const stack: StackEntry[] = [];
  let hasOthers = false;

  const markAncestorHeaders = () => {
    stack.forEach((entry) => {
      if (entry.headerRef) {
        entry.headerRef.keep = true;
      }
    });
  };

  const selectedAncestor = (): StackEntry | undefined => {
    for (let i = stack.length - 1; i >= 0; i -= 1) {
      if (stack[i].selected) {
        return stack[i];
      }
    }
    return undefined;
  };

  categories.forEach((cat) => {
    const { indentation, uuid, group } = cat;

    while (
      stack.length &&
      stack[stack.length - 1].indentation >= indentation
    ) {
      stack.pop();
    }

    const ancestor = selectedAncestor();

    if (ancestor) {
      /* inside a selected (aggregated) folder */
      if (!group) {
        /* subcategory -> read-only breakdown row under the aggregate leaf */
        output.push({
          ...cat,
          readOnly: true,
          aggregateParent: ancestor.uuid,
          indentation: ancestor.indentation + 1,
        });
        ancestor.aggregateLeaf!.members!.push(uuid);
      }
      /* keep sub-groups on the stack for ancestry, but don't emit them */
      if (group) {
        stack.push({ indentation, uuid, selected: false });
      }
      return;
    }

    if (group) {
      if (selected.has(uuid)) {
        /* selected folder -> single budgetable aggregate line */
        const leaf: BudgetDisplayCategory = {
          ...cat,
          group: false,
          aggregate: true,
          members: [],
        };
        markAncestorHeaders();
        output.push(leaf);
        stack.push({
          indentation,
          uuid,
          selected: true,
          aggregateLeaf: leaf,
        });
      } else {
        /* unselected header, kept only if it ends up with content */
        const headerRef = { keep: false };
        headerRefs.set(cat, headerRef);
        output.push(cat);
        stack.push({ indentation, uuid, selected: false, headerRef });
      }
    } else if (selected.has(uuid)) {
      markAncestorHeaders();
      output.push(cat);
    } else {
      remap[uuid] = OTHERS_UUID;
      hasOthers = true;
    }
  });

  const finalCategories = output.filter((cat) => {
    const ref = headerRefs.get(cat);
    return !ref || ref.keep;
  });

  if (hasOthers) {
    finalCategories.push(othersCategory(categories[0]?.currency || ''));
  }

  return { categories: finalCategories, remap };
}
