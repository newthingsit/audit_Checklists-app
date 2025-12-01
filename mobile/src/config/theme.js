// Theme Configuration - Modern & Distinctive Design
// Matches the web app theme for consistent branding

export const themeConfig = {
  // Primary Colors - Deep Teal with Warm Coral accents
  primary: {
    main: '#0d9488',      // Teal - sophisticated and professional
    light: '#14b8a6',     // Lighter teal
    dark: '#0f766e',      // Darker teal
    contrast: '#ffffff',
  },

  // Secondary/Accent Colors - Warm Coral
  secondary: {
    main: '#f97316',      // Vibrant coral/orange
    light: '#fb923c',     // Light coral
    dark: '#ea580c',      // Dark coral
  },

  // Background Colors - Subtle warmth
  background: {
    default: '#f8fafc',   // Very light blue-gray
    paper: '#ffffff',      // Pure white cards
    sidebar: '#0f172a',    // Dark navy sidebar
    elevated: '#ffffff',
    dark: '#0f172a',       // Dark background for auth screens
  },

  // Text Colors
  text: {
    primary: '#0f172a',    // Dark navy - strong contrast
    secondary: '#475569',   // Slate gray
    disabled: '#94a3b8',    // Light slate
    inverse: '#f8fafc',     // For dark backgrounds
    muted: '#64748b',       // Muted text
  },

  // Border Colors
  border: {
    default: '#e2e8f0',    // Light slate border
    light: '#f1f5f9',      // Very light border
    dark: '#cbd5e1',       // Darker border
    focus: '#0d9488',      // Teal focus ring
  },

  // Status Colors - Vibrant but professional
  success: {
    main: '#10b981',       // Emerald green
    light: '#34d399',
    dark: '#059669',
    bg: '#ecfdf5',
  },
  warning: {
    main: '#f59e0b',       // Amber
    light: '#fbbf24',
    dark: '#d97706',
    bg: '#fffbeb',
  },
  error: {
    main: '#ef4444',       // Red
    light: '#f87171',
    dark: '#dc2626',
    bg: '#fef2f2',
  },
  info: {
    main: '#3b82f6',       // Blue
    light: '#60a5fa',
    dark: '#2563eb',
    bg: '#eff6ff',
  },

  // Dashboard Card Gradients (as color arrays for LinearGradient)
  dashboardCards: {
    card1: ['#0d9488', '#0891b2'],  // Teal to Cyan
    card2: ['#f97316', '#fb923c'],  // Orange gradient
    card3: ['#8b5cf6', '#a78bfa'],  // Purple gradient
    card4: ['#10b981', '#34d399'],  // Green gradient
    card5: ['#ec4899', '#f472b6'],  // Pink gradient
  },

  // Chart Colors - Harmonious palette
  chartColors: [
    '#0d9488', // Teal
    '#f97316', // Orange
    '#8b5cf6', // Purple
    '#10b981', // Green
    '#ec4899', // Pink
    '#3b82f6', // Blue
    '#f59e0b', // Amber
    '#06b6d4', // Cyan
  ],

  // Auth screen gradient
  auth: {
    gradientColors: ['#0f172a', '#1e293b', '#0d9488'],
    gradientLocations: [0, 0.5, 1],
  },

  // Border Radius - Softer, more modern
  borderRadius: {
    small: 6,
    medium: 10,
    large: 16,
    xl: 24,
    round: 9999,
  },

  // Shadows (for iOS and Android)
  shadows: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 15,
      elevation: 6,
    },
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    glow: {
      shadowColor: '#0d9488',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 8,
    },
  },

  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  // Typography
  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      bold: 'System',
    },
    sizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 32,
    },
  },
};

// Helper function to get score color
export const getScoreColor = (score) => {
  if (score >= 80) return themeConfig.success.main;
  if (score >= 60) return themeConfig.warning.main;
  return themeConfig.error.main;
};

// Helper function to get score background color
export const getScoreBgColor = (score) => {
  if (score >= 80) return themeConfig.success.bg;
  if (score >= 60) return themeConfig.warning.bg;
  return themeConfig.error.bg;
};

// Helper function to get status color
export const getStatusColor = (status) => {
  switch (status) {
    case 'completed':
      return themeConfig.success.main;
    case 'in_progress':
      return themeConfig.warning.main;
    case 'pending':
      return themeConfig.text.muted;
    case 'overdue':
      return themeConfig.error.main;
    default:
      return themeConfig.text.secondary;
  }
};

export default themeConfig;
