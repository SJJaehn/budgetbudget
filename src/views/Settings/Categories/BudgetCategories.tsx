import React, { useMemo, useCallback } from 'react';
import classNames from 'classnames';
import Setting from '../Setting';
import { Props } from './Types';
import { Category } from '../../../moneymoney';
import {
  ACTION_SETTINGS_SET_BUDGET_CATEGORIES,
} from '../../../budget';
import styles from './Categories.module.scss';

function descendants(categories: Category[], index: number): Category[] {
  const { indentation } = categories[index];
  const result: Category[] = [];
  for (
    let j = index + 1;
    j < categories.length && categories[j].indentation > indentation;
    j += 1
  ) {
    result.push(categories[j]);
  }
  return result;
}

export default function BudgetCategories({
  state,
  dispatch,
  categories,
}: Props) {
  const { incomeCategories, budgetCategories } = state.settings;

  /* only categories that are actually budgetable (income handled separately) */
  const budgetableCategories = useMemo(() => {
    const incomeIds = incomeCategories
      .map(({ id }) => id)
      .filter((id): id is string => id !== null);
    return categories.filter(({ uuid }) => !incomeIds.includes(uuid));
  }, [categories, incomeCategories]);

  const allLeafUuids = useMemo(
    () =>
      budgetableCategories
        .filter(({ group }) => !group)
        .map(({ uuid }) => uuid),
    [budgetableCategories],
  );

  /* undefined selection means "budget every category individually" */
  const selection = budgetCategories ?? allLeafUuids;
  const selectedSet = useMemo(() => new Set(selection), [selection]);

  /* uuids that are absorbed into a selected (aggregated) parent folder */
  const covered = useMemo(() => {
    const result = new Set<string>();
    const stack: { indentation: number; selected: boolean }[] = [];
    budgetableCategories.forEach((cat) => {
      while (
        stack.length &&
        stack[stack.length - 1].indentation >= cat.indentation
      ) {
        stack.pop();
      }
      const underSelected = stack.some((entry) => entry.selected);
      if (underSelected) {
        result.add(cat.uuid);
      }
      if (cat.group) {
        stack.push({
          indentation: cat.indentation,
          selected: !underSelected && selectedSet.has(cat.uuid),
        });
      }
    });
    return result;
  }, [budgetableCategories, selectedSet]);

  const setSelection = useCallback(
    (next: string[]) => {
      dispatch({
        type: ACTION_SETTINGS_SET_BUDGET_CATEGORIES,
        payload: next,
      });
    },
    [dispatch],
  );

  const toggle = useCallback(
    (index: number) => {
      const cat = budgetableCategories[index];
      const next = new Set(selection);
      if (cat.group) {
        const subUuids = descendants(budgetableCategories, index).map(
          (c) => c.uuid,
        );
        if (selectedSet.has(cat.uuid)) {
          /* expand aggregate back to individual leaves */
          next.delete(cat.uuid);
          descendants(budgetableCategories, index).forEach((c) => {
            if (!c.group) {
              next.add(c.uuid);
            }
          });
        } else {
          /* collapse subtree into a single aggregate line */
          subUuids.forEach((uuid) => next.delete(uuid));
          next.add(cat.uuid);
        }
      } else if (selectedSet.has(cat.uuid)) {
        next.delete(cat.uuid);
      } else {
        next.add(cat.uuid);
      }
      setSelection([...next]);
    },
    [budgetableCategories, selection, selectedSet, setSelection],
  );

  return (
    <Setting label="Categories to budget">
      <p className={styles.budgetCategoriesHint}>
        Pick the categories you want to budget. Select a folder to budget it as a
        single aggregated line. Everything left unselected is grouped into
        “Others”.
      </p>
      <ul className={styles.budgetCategoryList}>
        {budgetableCategories.map((cat, index) => {
          const { uuid, name, group, indentation, icon } = cat;
          const isCovered = covered.has(uuid);
          const checked = isCovered || selectedSet.has(uuid);
          return (
            <li
              key={uuid}
              style={{ '--indentation': indentation } as any}
            >
              <label
                className={classNames(
                  styles.budgetCategoryEntry,
                  isCovered && styles.budgetCategoryCovered,
                  group && styles.budgetCategoryGroup,
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isCovered}
                  onChange={() => toggle(index)}
                />
                {icon && (
                  <img src={icon} alt="" className={styles.budgetCategoryIcon} />
                )}
                {name}
              </label>
            </li>
          );
        })}
      </ul>
    </Setting>
  );
}
