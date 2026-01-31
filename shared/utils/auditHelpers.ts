/**
 * Audit Helper Utilities
 * Shared logic for calculating category completion, item completion, etc.
 * Used by both mobile and web versions
 */

/**
 * Represents the completion status of a category
 */
export interface CategoryStatus {
  completed: number;
  total: number;
  isComplete: boolean;
  percentage: number;
}

/**
 * Represents validation errors for form fields
 */
export interface ValidationError {
  itemId: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Audit item response data
 */
export interface AuditItemResponse {
  item_id: number;
  status: string;
  mark?: string | number;
  selected_option_id?: number;
  comment?: string;
  photo_url?: string;
}

/**
 * Calculate completion status for all categories
 * 
 * @param auditItems - Array of audit item responses
 * @param allItems - Array of all template items
 * @returns Object with category completion status
 */
export function calculateCategoryCompletionStatus(
  auditItems: AuditItemResponse[],
  allItems: any[]
): Record<string, CategoryStatus> {
  const categoryMap = new Map<string, { completed: number; total: number }>();

  // Group items by category and count completions
  allItems.forEach(item => {
    if (!item.category || !item.category.trim()) return;

    const cat = item.category;
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, { completed: 0, total: 0 });
    }

    const catData = categoryMap.get(cat)!;
    catData.total++;

    // Check if item is completed
    const auditItem = auditItems.find(ai => ai.item_id === item.id);
    if (auditItem) {
      const hasMark =
        auditItem.mark !== null &&
        auditItem.mark !== undefined &&
        String(auditItem.mark).trim() !== '';
      const hasStatus =
        auditItem.status &&
        auditItem.status !== 'pending' &&
        auditItem.status !== '';
      if (hasMark || hasStatus) {
        catData.completed++;
      }
    }
  });

  // Convert to CategoryStatus format
  const result: Record<string, CategoryStatus> = {};
  categoryMap.forEach((data, cat) => {
    const percentage = data.total > 0 ? (data.completed / data.total) * 100 : 0;
    result[cat] = {
      completed: data.completed,
      total: data.total,
      isComplete: data.completed === data.total && data.total > 0,
      percentage: Math.round(percentage)
    };
  });

  return result;
}

/**
 * Get array of incomplete categories sorted by order
 * 
 * @param categoryStatus - Category completion status
 * @param categoryOrder - Optional array specifying category order
 * @returns Array of incomplete category names
 */
export function getIncompleteCategories(
  categoryStatus: Record<string, CategoryStatus>,
  categoryOrder?: string[]
): string[] {
  const incomplete = Object.entries(categoryStatus)
    .filter(([, status]) => !status.isComplete)
    .map(([name]) => name);

  // Sort by specified order if provided
  if (categoryOrder) {
    incomplete.sort((a, b) => {
      const indexA = categoryOrder.indexOf(a);
      const indexB = categoryOrder.indexOf(b);
      return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
    });
  }

  return incomplete;
}

/**
 * Get the first incomplete category
 * Falls back to first category if all complete
 * 
 * @param categories - Array of all categories
 * @param categoryStatus - Category completion status
 * @returns First incomplete category, or first category if all complete
 */
export function getFirstIncompleteCategory(
  categories: string[],
  categoryStatus: Record<string, CategoryStatus>
): string | null {
  if (!categories || categories.length === 0) return null;

  // Find first incomplete
  const incomplete = categories.find(cat => !categoryStatus[cat]?.isComplete);
  if (incomplete) return incomplete;

  // All complete, return first
  return categories[0] || null;
}

/**
 * Check if an item is complete based on its response
 * 
 * @param auditItem - Audit item response
 * @param fieldType - Input type of the item
 * @returns Whether the item is considered complete
 */
export function isItemComplete(
  auditItem: AuditItemResponse | undefined,
  fieldType: string
): boolean {
  if (!auditItem) return false;

  const hasMark =
    auditItem.mark !== null &&
    auditItem.mark !== undefined &&
    String(auditItem.mark).trim() !== '';
  const hasStatus =
    auditItem.status &&
    auditItem.status !== 'pending' &&
    auditItem.status !== '';

  // Image uploads need photo_url
  if (fieldType === 'image_upload') {
    return !!auditItem.photo_url;
  }

  // Open-ended need comment
  if (fieldType === 'open_ended') {
    return !!auditItem.comment && auditItem.comment.trim() !== '';
  }

  return hasMark || hasStatus;
}

/**
 * Validate required items in a category
 * 
 * @param items - Array of items in category
 * @param auditItems - Array of audit item responses
 * @returns Array of validation errors for required items
 */
export function validateRequiredItems(
  items: any[],
  auditItems: AuditItemResponse[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  items.forEach(item => {
    if (!item.is_required) return;

    const auditItem = auditItems.find(ai => ai.item_id === item.id);
    if (!isItemComplete(auditItem, item.input_type)) {
      errors.push({
        itemId: item.id,
        field: item.id.toString(),
        message: `${item.title} is required`,
        severity: 'error'
      });
    }
  });

  return errors;
}

/**
 * Calculate audit completion percentage across all categories
 * 
 * @param categoryStatus - Category completion status
 * @returns Overall completion percentage (0-100)
 */
export function calculateOverallCompletion(
  categoryStatus: Record<string, CategoryStatus>
): number {
  const stats = Object.values(categoryStatus);
  if (stats.length === 0) return 0;

  const totalCompleted = stats.reduce((sum, cat) => sum + cat.completed, 0);
  const totalItems = stats.reduce((sum, cat) => sum + cat.total, 0);

  return totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;
}

/**
 * Get category progress summary for UI display
 * 
 * @param categoryStatus - Category completion status
 * @returns Human-readable progress string
 */
export function getCategoryProgressSummary(
  categoryStatus: Record<string, CategoryStatus>
): string {
  const incomplete = Object.values(categoryStatus).filter(s => !s.isComplete).length;
  const total = Object.values(categoryStatus).length;

  if (incomplete === 0) return 'All categories complete ✓';
  if (incomplete === total) return `${total} categories remaining`;
  return `${incomplete} of ${total} categories remaining`;
}

/**
 * Normalize category name (trim, lowercase for comparison)
 * 
 * @param category - Category name
 * @returns Normalized category name
 */
export function normalizeCategoryName(category: string): string {
  if (!category) return '';
  return category.trim().toLowerCase();
}

/**
 * Check if two categories are the same (case-insensitive)
 * 
 * @param cat1 - First category
 * @param cat2 - Second category
 * @returns Whether categories match
 */
export function categoriesMatch(cat1: string, cat2: string): boolean {
  return normalizeCategoryName(cat1) === normalizeCategoryName(cat2);
}

/**
 * Sort categories by a custom order or alphabetically
 * 
 * @param categories - Array of categories
 * @param customOrder - Optional custom sort order
 * @returns Sorted array of categories
 */
export function sortCategories(
  categories: string[],
  customOrder?: string[]
): string[] {
  if (!customOrder) {
    return [...categories].sort();
  }

  return [...categories].sort((a, b) => {
    const indexA = customOrder.indexOf(a);
    const indexB = customOrder.indexOf(b);
    const aIndex = indexA === -1 ? Infinity : indexA;
    const bIndex = indexB === -1 ? Infinity : indexB;
    return aIndex - bIndex;
  });
}

/**
 * Get category statistics for reporting
 * 
 * @param categoryStatus - Category completion status
 * @returns Statistics object
 */
export function getCategoryStatistics(
  categoryStatus: Record<string, CategoryStatus>
) {
  const stats = Object.entries(categoryStatus);
  
  return {
    totalCategories: stats.length,
    completedCategories: stats.filter(([, s]) => s.isComplete).length,
    totalItems: stats.reduce((sum, [, s]) => sum + s.total, 0),
    completedItems: stats.reduce((sum, [, s]) => sum + s.completed, 0),
    overallPercentage: calculateOverallCompletion(categoryStatus),
    byCategory: Object.fromEntries(
      stats.map(([cat, s]) => [cat, s.percentage])
    )
  };
}

export default {
  calculateCategoryCompletionStatus,
  getIncompleteCategories,
  getFirstIncompleteCategory,
  isItemComplete,
  validateRequiredItems,
  calculateOverallCompletion,
  getCategoryProgressSummary,
  normalizeCategoryName,
  categoriesMatch,
  sortCategories,
  getCategoryStatistics
};
