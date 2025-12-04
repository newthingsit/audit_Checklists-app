// Theme Configuration - Lite Bite Foods Premium Design
// Matches the web app theme for consistent branding

export const themeConfig = {
  // Primary Colors - Refined Burgundy/Crimson
  primary: {
    main: '#B91C1C',      // Rich crimson red
    light: '#DC2626',     // Brighter red
    dark: '#991B1B',      // Deep crimson
    contrast: '#ffffff',
  },

  // Secondary/Accent Colors - Warm Slate
  secondary: {
    main: '#78716C',      // Warm stone
    light: '#A8A29E',     // Light stone
    dark: '#57534E',      // Dark stone
  },

  // Background Colors - Clean, professional
  background: {
    default: '#FAFAF9',   // Warm white
    paper: '#ffffff',      // Pure white cards
    sidebar: '#18181B',    // Rich black
    elevated: '#ffffff',
    dark: '#18181B',       // Dark background for auth screens
  },

  // Text Colors
  text: {
    primary: '#18181B',    // Rich black
    secondary: '#52525B',   // Zinc gray
    disabled: '#A1A1AA',    // Light zinc
    inverse: '#FAFAF9',     // For dark backgrounds
    muted: '#71717A',       // Muted text
  },

  // Border Colors
  border: {
    default: '#E4E4E7',    // Zinc border
    light: '#F4F4F5',      // Very light zinc
    dark: '#D4D4D8',       // Darker zinc
    focus: '#B91C1C',      // Crimson focus ring
  },

  // Status Colors - Professional and clear
  success: {
    main: '#059669',       // Emerald
    light: '#10B981',
    dark: '#047857',
    bg: '#ECFDF5',
  },
  warning: {
    main: '#D97706',       // Amber
    light: '#F59E0B',
    dark: '#B45309',
    bg: '#FFFBEB',
  },
  error: {
    main: '#DC2626',       // Red
    light: '#EF4444',
    dark: '#B91C1C',
    bg: '#FEF2F2',
  },
  info: {
    main: '#2563EB',       // Blue
    light: '#3B82F6',
    dark: '#1D4ED8',
    bg: '#EFF6FF',
  },

  // Dashboard Card Gradients (as color arrays for LinearGradient)
  dashboardCards: {
    card1: ['#B91C1C', '#DC2626'],  // Crimson gradient
    card2: ['#7C3AED', '#8B5CF6'],  // Purple gradient
    card3: ['#059669', '#10B981'],  // Emerald gradient
    card4: ['#2563EB', '#3B82F6'],  // Blue gradient
    card5: ['#EA580C', '#F97316'],  // Orange gradient
  },

  // Chart Colors - Professional palette
  chartColors: [
    '#B91C1C', // Crimson
    '#7C3AED', // Purple
    '#059669', // Emerald
    '#2563EB', // Blue
    '#EA580C', // Orange
    '#0891B2', // Cyan
    '#CA8A04', // Yellow
    '#BE185D', // Pink
  ],

  // Auth screen gradient
  auth: {
    gradientColors: ['#18181B', '#27272A', '#3F3F46'],
    gradientLocations: [0, 0.5, 1],
  },

  // Border Radius - Modern, professional
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
      shadowColor: '#B91C1C',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.25,
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
