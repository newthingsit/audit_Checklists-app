// Theme Configuration - Lite Bite Foods Brand Colors
// Official LBF burgundy red branding

export const themeConfig = {
  // Primary Colors - Lite Bite Foods Burgundy Red
  primary: {
    main: '#A31621',      // LBF Burgundy Red - official brand color
    light: '#C41E2A',     // Lighter burgundy
    dark: '#7D111A',      // Darker burgundy
    contrast: '#ffffff',
  },

  // Secondary/Accent Colors - Gold/Amber for contrast
  secondary: {
    main: '#D4A574',      // Warm gold
    light: '#E8C49A',     // Light gold
    dark: '#B8894A',      // Dark gold
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
    focus: '#A31621',      // LBF burgundy focus ring
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
    card1: ['#A31621', '#C41E2A'],  // LBF Burgundy gradient
    card2: ['#D4A574', '#E8C49A'],  // Gold gradient
    card3: ['#8b5cf6', '#a78bfa'],  // Purple gradient
    card4: ['#10b981', '#34d399'],  // Green gradient
    card5: ['#3b82f6', '#60a5fa'],  // Blue gradient
  },

  // Chart Colors - LBF harmonious palette
  chartColors: [
    '#A31621', // LBF Burgundy
    '#D4A574', // Gold
    '#8b5cf6', // Purple
    '#10b981', // Green
    '#3b82f6', // Blue
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#06b6d4', // Cyan
  ],

  // Auth screen gradient
  auth: {
    gradientColors: ['#1a1a1a', '#2d2d2d', '#A31621'],
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
      shadowColor: '#A31621',
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
