import { AuditChecklist, AuditCategory, AuditChecklistItem, CategoryCompletion } from '../types';

/**
 * Calculates category completion percentage
 */
export const calculateCategoryCompletion = (category: AuditCategory): CategoryCompletion => {
  if (!category.items || category.items.length === 0) {
    return {
      categoryId: category.id,
      totalItems: 0,
      completedItems: 0,
      percentage: 0,
    };
  }

  const completedItems = category.items.filter((item: AuditChecklistItem) => {
    return item.response && item.response.trim() !== '';
  }).length;

  return {
    categoryId: category.id,
    totalItems: category.items.length,
    completedItems,
    percentage: Math.round((completedItems / category.items.length) * 100),
  };
};

/**
 * Calculates overall checklist progress
 */
export const calculateChecklistProgress = (checklist: AuditChecklist): number => {
  if (!checklist.categories || checklist.categories.length === 0) {
    return 0;
  }

  const completions = checklist.categories.map(calculateCategoryCompletion);
  const totalPercentage = completions.reduce((sum, completion) => sum + completion.percentage, 0);

  return Math.round(totalPercentage / completions.length);
};

/**
 * Determines if category is complete
 */
export const isCategoryComplete = (category: AuditCategory): boolean => {
  if (!category.items || category.items.length === 0) {
    return false;
  }

  return category.items.every((item: AuditChecklistItem) => {
    const hasResponse = item.response && item.response.trim() !== '';
    const hasRequiredData = !item.selectedOption || item.selectedOption !== '';
    return hasResponse && hasRequiredData;
  });
};

/**
 * Determines if checklist is complete
 */
export const isChecklistComplete = (checklist: AuditChecklist): boolean => {
  if (!checklist.categories || checklist.categories.length === 0) {
    return false;
  }

  return checklist.categories.every(isCategoryComplete);
};

/**
 * Gets completion status message
 */
export const getCompletionMessage = (checklist: AuditChecklist): string => {
  const progress = calculateChecklistProgress(checklist);

  if (progress === 0) return 'Not started';
  if (progress < 25) return 'Just started';
  if (progress < 50) return '25% complete';
  if (progress < 75) return '50% complete';
  if (progress < 100) return '75% complete';
  return 'Complete!';
};

/**
 * Auto-selects items based on Urdu keywords
 */
export const getUrduAutoSelection = (question: string, options: string[]): string | null => {
  const urduKeywords = {
    yes: ['ہاں', 'جی', 'ہے', 'صحیح'],
    no: ['نہیں', 'نہ', 'غلط'],
    na: ['لاگو نہیں', 'موجود نہیں'],
  };

  const questionLower = question.toLowerCase();

  for (const [key, keywords] of Object.entries(urduKeywords)) {
    for (const keyword of keywords) {
      if (questionLower.includes(keyword)) {
        const matchingOption = options.find((opt: string) =>
          opt.toLowerCase().includes(key)
        );
        if (matchingOption) return matchingOption;
      }
    }
  }

  return null;
};

/**
 * Auto-selects items based on English keywords
 */
export const getEnglishAutoSelection = (question: string, options: string[]): string | null => {
  const englishKeywords = {
    yes: ['yes', 'confirm', 'approved', 'completed', 'present'],
    no: ['no', 'deny', 'not', 'absent', 'missing'],
    na: ['not applicable', 'n/a', 'not relevant'],
  };

  const questionLower = question.toLowerCase();

  for (const [key, keywords] of Object.entries(englishKeywords)) {
    for (const keyword of keywords) {
      if (questionLower.includes(keyword)) {
        const matchingOption = options.find((opt: string) =>
          opt.toLowerCase().includes(key)
        );
        if (matchingOption) return matchingOption;
      }
    }
  }

  return null;
};

/**
 * Gets appropriate auto-selection based on language
 */
export const getAutoSelection = (
  question: string,
  options: string[],
  language: 'en' | 'ur' = 'en'
): string | null => {
  if (language === 'ur') {
    return getUrduAutoSelection(question, options);
  }
  return getEnglishAutoSelection(question, options);
};

/**
 * Exports checklist as JSON
 */
export const exportChecklistJSON = (checklist: AuditChecklist): string => {
  return JSON.stringify(checklist, null, 2);
};

/**
 * Exports checklist as CSV
 */
export const exportChecklistCSV = (checklist: AuditChecklist): string => {
  const headers = ['Category', 'Question', 'Response', 'Comment'];
  let csv = headers.join(',') + '\n';

  for (const category of checklist.categories) {
    for (const item of category.items) {
      const row = [
        `"${category.name}"`,
        `"${item.question}"`,
        `"${item.response || ''}"`,
        `"${item.comment || ''}"`,
      ];
      csv += row.join(',') + '\n';
    }
  }

  return csv;
};

/**
 * Formats date for display
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Formats time for display
 */
export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Parses CSV string to data array
 */
export const parseCSV = (csvString: string): Record<string, string>[] => {
  const lines = csvString.split('\n').filter((line: string) => line.trim() !== '');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
  const data: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v: string) => v.trim());
    const row: Record<string, string> = {};

    headers.forEach((header: string, index: number) => {
      row[header] = values[index] || '';
    });

    data.push(row);
  }

  return data;
};

/**
 * Calculate completion status for categories
 */
export interface CategoryCompletionStatus {
  completed: number;
  total: number;
  isComplete: boolean;
  percentage: number;
}

export const calculateCategoryCompletionStatus = (
  categories: string[],
  items: Array<{ category?: string; mark?: string | number; status?: string }>
): Record<string, CategoryCompletionStatus> => {
  if (!categories || !items) return {};

  const status: Record<string, CategoryCompletionStatus> = {};
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
 */
export const getFirstIncompleteCategory = (
  categories: string[],
  items: Array<{ category?: string; mark?: string | number; status?: string }>
): string | null => {
  if (!categories || categories.length === 0) return null;
  const status = calculateCategoryCompletionStatus(categories, items);
  const incomplete = categories.find(cat => !status[cat]?.isComplete);
  return incomplete || categories[0] || null;
};

/**
 * Get overall category statistics
 */
export const getCategoryStatistics = (
  categories: string[],
  items: Array<{ category?: string; mark?: string | number; status?: string }>
): { total: number; completed: number; percentage: number } => {
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
