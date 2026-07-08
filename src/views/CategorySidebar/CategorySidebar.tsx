import React, { MutableRefObject, useCallback, Dispatch } from 'react';
import classNames from 'classnames';
import { Sidebar, Row } from '../../components';
import styles from './CategorySidebar.module.scss';
import {
  Action,
  ACTION_SETTINGS_SET_CATEGORY_COLLAPSED,
  ACTION_SETTINGS_SET_CATEGORY_EXPANDED,
  BudgetDisplayCategory,
} from '../../budget';
import { mapCategories, filterExpanded } from '../../lib';

type Props = {
  categories: BudgetDisplayCategory[];
  innerRef: MutableRefObject<HTMLDivElement | null>;
  syncScrollY: MutableRefObject<HTMLDivElement | null>;
  budgetName: string;
  collapsedCategories?: string[];
  expandedCategories?: string[];
  dispatch: Dispatch<Action>;
};
export default function CategorySidebar({
  categories,
  innerRef,
  budgetName,
  collapsedCategories = [],
  expandedCategories = [],
  dispatch,
  syncScrollY,
}: Props) {
  const syncScroll = useCallback(
    ({ target: { scrollTop } }) => {
      if (syncScrollY.current) {
        syncScrollY.current.scrollTop = scrollTop;
      }
    },
    [syncScrollY],
  );
  const showCategory = useCallback(
    (ev: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      dispatch({
        type: ACTION_SETTINGS_SET_CATEGORY_COLLAPSED,
        payload: {
          id: (ev.target as HTMLButtonElement).name,
          collapsed: false,
        },
      });
    },
    [dispatch],
  );
  const hideCategory = useCallback(
    (ev: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      dispatch({
        type: ACTION_SETTINGS_SET_CATEGORY_COLLAPSED,
        payload: {
          id: (ev.target as HTMLButtonElement).name,
          collapsed: true,
        },
      });
    },
    [dispatch],
  );
  const expandCategory = useCallback(
    (ev: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      dispatch({
        type: ACTION_SETTINGS_SET_CATEGORY_EXPANDED,
        payload: {
          id: (ev.target as HTMLButtonElement).name,
          expanded: true,
        },
      });
    },
    [dispatch],
  );
  const collapseCategory = useCallback(
    (ev: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      dispatch({
        type: ACTION_SETTINGS_SET_CATEGORY_EXPANDED,
        payload: {
          id: (ev.target as HTMLButtonElement).name,
          expanded: false,
        },
      });
    },
    [dispatch],
  );

  return (
    <div className={styles.sidebarWrap}>
      <div className={styles.sidebarHeader}>
        <h3>{budgetName}</h3>
      </div>
      <Sidebar
        onScroll={syncScroll}
        innerRef={innerRef}
        className={styles.categorySidebar}
      >
        {mapCategories(
          filterExpanded(categories, expandedCategories),
          collapsedCategories,
          (category, i, groupClosed) => {
            const { uuid, name, group, indentation, icon } = category;
            return (
              <Row
                key={uuid}
                indent={indentation}
                leaf={!group}
                odd={!(i % 2)}
                groupClosed={groupClosed}
                className={classNames(
                  styles.row,
                  category.readOnly && styles.readOnlyRow,
                )}
              >
                {!group && !category.readOnly && (
                  <span
                    style={{ backgroundImage: `url(${icon})` }}
                    className={styles.icon}
                  />
                )}
                <span className={styles.title}>{name}</span>
                {category.aggregate && (
                  <>
                    <span className={styles.spacer} />
                    {expandedCategories.includes(uuid) ? (
                      <button
                        className={styles.showHide}
                        name={uuid}
                        onClick={collapseCategory}
                      >
                        Hide details
                      </button>
                    ) : (
                      <button
                        className={styles.showHide}
                        name={uuid}
                        onClick={expandCategory}
                      >
                        Show details
                      </button>
                    )}
                  </>
                )}
                {group && (
                  <>
                    <span className={styles.spacer} />
                    {collapsedCategories.includes(uuid) ? (
                      <button
                        className={styles.showHide}
                        name={uuid}
                        onClick={showCategory}
                      >
                        Show
                      </button>
                    ) : (
                      <button
                        className={styles.showHide}
                        name={uuid}
                        onClick={hideCategory}
                      >
                        Hide
                      </button>
                    )}
                  </>
                )}
              </Row>
            );
          },
        )}
      </Sidebar>
    </div>
  );
}
