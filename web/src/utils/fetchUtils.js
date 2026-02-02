// Frontend optimization utilities
export const withTimeout = (promise, timeoutMs = 30000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ]);
};

export const withRetry = async (fn, options = {}) => {
  const {
    retries = 3,
    delay = 1000,
    backoff = 2,
    onRetry = () => {}
  } = options;

  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < retries) {
        const waitTime = delay * Math.pow(backoff, i);
        onRetry(i + 1, waitTime, error);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  throw lastError;
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Safe data accessor that returns fallback instead of undefined
export const safeGet = (obj, path, fallback = null) => {
  try {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result === null || result === undefined) {
        return fallback;
      }
      result = result[key];
    }
    return result === undefined ? fallback : result;
  } catch {
    return fallback;
  }
};

// Validate dashboard data structure
export const validateDashboardData = (data) => {
  if (!data || typeof data !== 'object') {
    return null;
  }

  return {
    total: Number(data.total) || 0,
    completed: Number(data.completed) || 0,
    inProgress: Number(data.inProgress) || 0,
    avgScore: Number(data.avgScore) || 0,
    byStatus: Array.isArray(data.byStatus) ? data.byStatus : [],
    byMonth: Array.isArray(data.byMonth) ? data.byMonth : [],
    topUsers: Array.isArray(data.topUsers) ? data.topUsers : [],
    recent: Array.isArray(data.recent) ? data.recent : [],
    currentMonthStats: data.currentMonthStats || { total: 0, completed: 0, avgScore: 0 },
    lastMonthStats: data.lastMonthStats || { total: 0, completed: 0, avgScore: 0 },
    monthChange: data.monthChange || { total: 0, completed: 0, avgScore: 0 },
    topStores: Array.isArray(data.topStores) ? data.topStores : [],
    scheduleAdherence: data.scheduleAdherence || { total: 0, onTime: 0, adherence: 0 }
  };
};

// Merge cached and fresh data
export const mergeCachedData = (cached, fresh) => {
  if (!cached) return fresh;
  if (!fresh) return cached;
  
  // If fresh data is newer, use it
  return fresh;
};
