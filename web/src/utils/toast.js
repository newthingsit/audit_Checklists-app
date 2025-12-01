import { toast } from 'react-toastify';
import { themeConfig } from '../config/theme';

// Custom toast styles that match our theme
const toastStyles = {
  success: {
    style: {
      background: themeConfig.success.bg,
      border: `1px solid ${themeConfig.success.light}`,
      borderRadius: themeConfig.borderRadius.medium,
      color: themeConfig.success.dark,
      boxShadow: themeConfig.shadows.medium,
    },
    progressStyle: {
      background: themeConfig.success.main,
    },
  },
  error: {
    style: {
      background: themeConfig.error.bg,
      border: `1px solid ${themeConfig.error.light}`,
      borderRadius: themeConfig.borderRadius.medium,
      color: themeConfig.error.dark,
      boxShadow: themeConfig.shadows.medium,
    },
    progressStyle: {
      background: themeConfig.error.main,
    },
  },
  info: {
    style: {
      background: themeConfig.info.bg,
      border: `1px solid ${themeConfig.info.light}`,
      borderRadius: themeConfig.borderRadius.medium,
      color: themeConfig.info.dark,
      boxShadow: themeConfig.shadows.medium,
    },
    progressStyle: {
      background: themeConfig.info.main,
    },
  },
  warning: {
    style: {
      background: themeConfig.warning.bg,
      border: `1px solid ${themeConfig.warning.light}`,
      borderRadius: themeConfig.borderRadius.medium,
      color: themeConfig.warning.dark,
      boxShadow: themeConfig.shadows.medium,
    },
    progressStyle: {
      background: themeConfig.warning.main,
    },
  },
};

export const showSuccess = (message) => {
  toast.success(message, {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    ...toastStyles.success,
    icon: "✓",
  });
};

export const showError = (message) => {
  toast.error(message, {
    position: "top-right",
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    ...toastStyles.error,
    icon: "✕",
  });
};

export const showInfo = (message) => {
  toast.info(message, {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    ...toastStyles.info,
    icon: "ℹ",
  });
};

export const showWarning = (message) => {
  toast.warning(message, {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    ...toastStyles.warning,
    icon: "⚠",
  });
};

// Loading toast with promise support
export const showLoading = (message = 'Loading...') => {
  return toast.loading(message, {
    position: "top-right",
    style: {
      background: themeConfig.background.paper,
      border: `1px solid ${themeConfig.border.default}`,
      borderRadius: themeConfig.borderRadius.medium,
      color: themeConfig.text.primary,
      boxShadow: themeConfig.shadows.medium,
    },
  });
};

// Update a loading toast
export const updateToast = (toastId, { type, message }) => {
  const typeStyles = toastStyles[type] || toastStyles.info;
  toast.update(toastId, {
    render: message,
    type: type,
    isLoading: false,
    autoClose: 3000,
    ...typeStyles,
  });
};

// Promise-based toast
export const showPromise = (promise, { pending, success, error }) => {
  return toast.promise(promise, {
    pending: {
      render: pending,
      style: {
        background: themeConfig.background.paper,
        border: `1px solid ${themeConfig.border.default}`,
        borderRadius: themeConfig.borderRadius.medium,
        color: themeConfig.text.primary,
        boxShadow: themeConfig.shadows.medium,
      },
    },
    success: {
      render: success,
      ...toastStyles.success,
      icon: "✓",
    },
    error: {
      render: error,
      ...toastStyles.error,
      icon: "✕",
    },
  });
};
