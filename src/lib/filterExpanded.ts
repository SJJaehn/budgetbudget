type MaybeReadOnly = { readOnly?: boolean; aggregateParent?: string };

/**
 * Hides read-only breakdown rows whose aggregate parent is not currently
 * expanded. Applied to both the sidebar and the month grid (before
 * `mapCategories`) so the two columns stay row-aligned.
 */
export default function filterExpanded<T>(
  categories: T[],
  expandedCategories: string[] = [],
): T[] {
  return categories.filter((category) => {
    const { readOnly, aggregateParent } = category as MaybeReadOnly;
    return (
      !readOnly ||
      (aggregateParent != null && expandedCategories.includes(aggregateParent))
    );
  });
}
