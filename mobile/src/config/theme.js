// Theme Configuration - Lite Bite Foods Professional Design System
// Mobile app theme - matches web for brand consistency

export const themeConfig = {
  // Primary Colors - Deep Crimson (Brand Identity)
  primary: {
    main: '#C41E3A',      // Cardinal red - elegant, professional
    light: '#E63950',     // Lighter accent
    dark: '#9B1B30',      // Deep burgundy
    contrast: '#ffffff',
  },

  // Secondary Colors - Slate Blue for professional contrast
  secondary: {
    main: '#475569',      // Slate gray-blue
    light: '#64748B',     // Lighter slate
    dark: '#334155',      // Deep slate
  },

  // Accent Color - Gold for highlights
  accent: {
    main: '#D97706',      // Warm amber
    light: '#F59E0B',     // Bright gold
    dark: '#B45309',      // Deep amber
  },

  // Background Colors - Clean & Professional
  background: {
    default: '#F8FAFC',   // Subtle cool white
    paper: '#ffffff',      // Pure white cards
    sidebar: '#0F172A',    // Deep navy
    elevated: '#ffffff',
    subtle: '#F1F5F9',     // Very light slate for sections
    dark: '#0F172A',       // For dark mode / auth screens
  },

  // Text Colors
  text: {
    primary: '#0F172A',    // Deep navy for strong contrast
    secondary: '#475569',   // Slate for secondary text
    disabled: '#94A3B8',    // Muted slate
    inverse: '#F8FAFC',     // For dark backgrounds
    muted: '#64748B',       // Subtle text
  },

  // Border Colors
  border: {
    default: '#E2E8F0',    // Light slate border
    light: '#F1F5F9',      // Very subtle border
    dark: '#CBD5E1',       // Emphasized border
    focus: '#C41E3A',      // Primary focus ring
  },

  // Status Colors - Clear, professional signals
  success: {
    main: '#059669',       // Emerald green
    light: '#10B981',
    dark: '#047857',
    bg: '#ECFDF5',
    text: '#065F46',
  },
  warning: {
    main: '#D97706',       // Amber
    light: '#F59E0B',
    dark: '#B45309',
    bg: '#FFFBEB',
    text: '#92400E',
  },
  error: {
    main: '#DC2626',       // Red
    light: '#EF4444',
    dark: '#B91C1C',
    bg: '#FEF2F2',
    text: '#991B1B',
  },
  info: {
    main: '#0284C7',       // Sky blue
    light: '#0EA5E9',
    dark: '#0369A1',
    bg: '#F0F9FF',
    text: '#075985',
  },

  // Dashboard Card Gradients (as color arrays for LinearGradient)
  dashboardCards: {
    card1: ['#C41E3A', '#E63950'],  // Primary crimson
    card2: ['#7C3AED', '#A78BFA'],  // Rich purple
    card3: ['#059669', '#34D399'],  // Success green
    card4: ['#0284C7', '#38BDF8'],  // Sky blue
    card5: ['#D97706', '#FCD34D'],  // Golden amber
  },

  // Chart Colors - Professional palette
  chartColors: [
    '#C41E3A', // Primary crimson
    '#7C3AED', // Purple
    '#059669', // Emerald
    '#0284C7', // Sky blue
    '#D97706', // Amber
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
  ],

  // Auth screen gradient
  auth: {
    gradientColors: ['#0F172A', '#1E293B', '#334155'],
    gradientLocations: [0, 0.5, 1],
  },

  // Border Radius - Consistent, modern
  borderRadius: {
    xs: 4,
    small: 6,
    medium: 8,
    large: 12,
    xl: 16,
    xxl: 24,
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
    xs: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 1,
      elevation: 1,
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
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 6,
    },
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    glow: {
      shadowColor: '#C41E3A',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
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
      xs: 11,
      sm: 13,
      md: 15,
      lg: 17,
      xl: 20,
      xxl: 24,
      xxxl: 32,
      display: 40,
    },
    weights: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },

  // Component specific
  components: {
    // Card styles
    card: {
      backgroundColor: '#ffffff',
      borderRadius: 12,
      padding: 16,
    },
    // Button styles
    button: {
      primary: {
        backgroundColor: '#C41E3A',
        textColor: '#ffffff',
      },
      secondary: {
        backgroundColor: '#F1F5F9',
        textColor: '#475569',
      },
      success: {
        backgroundColor: '#059669',
        textColor: '#ffffff',
      },
      danger: {
        backgroundColor: '#DC2626',
        textColor: '#ffffff',
      },
    },
    // Input styles
    input: {
      backgroundColor: '#ffffff',
      borderColor: '#E2E8F0',
      focusBorderColor: '#C41E3A',
      placeholderColor: '#94A3B8',
    },
    // Navigation
    navigation: {
      tabBarBackground: '#ffffff',
      tabBarActiveColor: '#C41E3A',
      tabBarInactiveColor: '#64748B',
      headerBackground: '#ffffff',
    },
  },
};

// Helper function to get score color
export const getScoreColor = (score) => {
  if (score >= 90) return themeConfig.success.main;
  if (score >= 75) return '#22C55E'; // Lighter green
  if (score >= 60) return themeConfig.warning.main;
  if (score >= 40) return '#F97316'; // Orange
  return themeConfig.error.main;
};

// Helper function to get score background color
export const getScoreBgColor = (score) => {
  if (score >= 90) return themeConfig.success.bg;
  if (score >= 75) return '#F0FDF4';
  if (score >= 60) return themeConfig.warning.bg;
  if (score >= 40) return '#FFF7ED';
  return themeConfig.error.bg;
};

// Helper function to get status color
export const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return themeConfig.success.main;
    case 'in_progress':
    case 'in progress':
      return themeConfig.warning.main;
    case 'pending':
      return themeConfig.text.muted;
    case 'overdue':
      return themeConfig.error.main;
    case 'scheduled':
      return themeConfig.info.main;
    default:
      return themeConfig.text.secondary;
  }
};

// Helper function to get priority color
export const getPriorityColor = (priority) => {
  switch (priority?.toLowerCase()) {
    case 'critical':
    case 'high':
      return themeConfig.error.main;
    case 'medium':
      return themeConfig.warning.main;
    case 'low':
      return themeConfig.info.main;
    default:
      return themeConfig.text.muted;
  }
};

export default themeConfig;
