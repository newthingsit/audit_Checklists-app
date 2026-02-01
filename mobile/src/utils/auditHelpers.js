/**
 * Mobile audit helper utilities
 * Local copy of shared helpers to avoid importing outside project root
 */

/**
 * Calculate completion status for categories based on items
 * @param {string[]} categories
 * @param {Array} items
 * @returns {Record<string, { completed: number, total: number, isComplete: boolean, percentage: number }>} 
 */
export const calculateCategoryCompletionStatus = (categories, items) => {
  if (!categories || !items) return {};

  const status = {};
  categories.forEach(category => {
    const categoryItems = items.filter(item => item.category === category);
    const completedItems = categoryItems.filter(item => {
      const hasMark = item.mark !== null && item.mark !== undefined && String(item.mark).trim() !== '';
      const hasStatus = item.status && item.status !== 'pending' && item.status !== '';
      return hasMark || hasStatus;
    });

    const total = categoryItems.length;
    const completed = completedItems.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    status[category] = {
      completed,
      total,
      isComplete: total > 0 && completed === total,
      percentage,
    };
  });

  return status;
};

/**
 * Get first incomplete category
 * @param {string[]} categories
 * @param {Array} items
 * @returns {string|null}
 */
export const getFirstIncompleteCategory = (categories, items) => {
  if (!categories || categories.length === 0) return null;
  const status = calculateCategoryCompletionStatus(categories, items);
  const incomplete = categories.find(cat => !status[cat]?.isComplete);
  return incomplete || categories[0] || null;
};

/**
 * Get category statistics
 * @param {string[]} categories
 * @param {Array} items
 * @returns {{ total: number, completed: number, percentage: number }}
 */
export const getCategoryStatistics = (categories, items) => {
  if (!categories || categories.length === 0) {
    return { total: 0, completed: 0, percentage: 0 };
  }

  const status = calculateCategoryCompletionStatus(categories, items);
  const totals = Object.values(status).reduce(
    (acc, s) => ({
      total: acc.total + s.total,
      completed: acc.completed + s.completed,
    }),
    { total: 0, completed: 0 }
  );

  const percentage = totals.total > 0 ? Math.round((totals.completed / totals.total) * 100) : 0;
  return { ...totals, percentage };
};

export default {
  calculateCategoryCompletionStatus,
  getFirstIncompleteCategory,
  getCategoryStatistics,
};
