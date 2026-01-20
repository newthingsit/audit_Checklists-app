// Theme Configuration - Lite Bite Foods Professional Design System
// Mobile app theme - RICH, VIBRANT colors matching web

export const themeConfig = {
  // Primary Colors - Deep Ruby Red (Luxurious Brand Identity)
  primary: {
    main: '#B91C1C',      // Rich ruby red - bold, luxurious
    light: '#DC2626',     // Vibrant red accent
    dark: '#7F1D1D',      // Deep wine red
    contrast: '#ffffff',
  },

  // Secondary Colors - Deep Indigo for rich contrast
  secondary: {
    main: '#4338CA',      // Rich indigo
    light: '#6366F1',     // Vibrant indigo
    dark: '#3730A3',      // Deep indigo
  },

  // Accent Color - Rich Gold for luxury highlights
  accent: {
    main: '#B45309',      // Deep gold
    light: '#D97706',     // Rich amber
    dark: '#92400E',      // Bronze
  },

  // Background Colors - Clean with depth
  background: {
    default: '#F8FAFC',   // Subtle cool white
    paper: '#ffffff',      // Pure white cards
    sidebar: '#0C0A09',    // Rich charcoal black
    elevated: '#ffffff',
    subtle: '#F1F5F9',     // Very light slate for sections
    dark: '#0C0A09',       // For dark mode / auth screens
    darkSecondary: '#1C1917',
  },

  // Text Colors
  text: {
    primary: '#0C0A09',    // Rich black for strong contrast
    secondary: '#44403C',   // Warm gray for secondary text
    disabled: '#A8A29E',    // Muted warm gray
    inverse: '#FAFAF9',     // For dark backgrounds
    muted: '#78716C',       // Subtle text
  },

  // Border Colors
  border: {
    default: '#E7E5E4',    // Warm gray border
    light: '#F5F5F4',      // Very subtle border
    dark: '#D6D3D1',       // Emphasized border
    focus: '#B91C1C',      // Primary focus ring
  },

  // Status Colors - Rich, saturated signals
  success: {
    main: '#047857',       // Rich emerald green
    light: '#059669',
    dark: '#065F46',
    bg: '#ECFDF5',
    text: '#064E3B',
  },
  warning: {
    main: '#B45309',       // Rich amber
    light: '#D97706',
    dark: '#92400E',
    bg: '#FFFBEB',
    text: '#78350F',
  },
  error: {
    main: '#B91C1C',       // Rich red
    light: '#DC2626',
    dark: '#991B1B',
    bg: '#FEF2F2',
    text: '#7F1D1D',
  },
  info: {
    main: '#0369A1',       // Rich sky blue
    light: '#0284C7',
    dark: '#075985',
    bg: '#F0F9FF',
    text: '#0C4A6E',
  },

  // Dashboard Card Gradients - RICH, VIBRANT, LUXURIOUS
  dashboardCards: {
    card1: ['#B91C1C', '#EF4444'],  // Rich ruby red
    card2: ['#4338CA', '#818CF8'],  // Deep indigo to violet
    card3: ['#047857', '#10B981'],  // Rich emerald
    card4: ['#7C3AED', '#C084FC'],  // Rich purple to orchid
    card5: ['#B45309', '#FBBF24'],  // Rich gold
  },

  // Chart Colors - Rich, saturated palette
  chartColors: [
    '#B91C1C', // Rich ruby
    '#4338CA', // Deep indigo
    '#047857', // Rich emerald
    '#7C3AED', // Rich purple
    '#B45309', // Rich amber
    '#BE185D', // Rich rose
    '#0369A1', // Rich blue
    '#4D7C0F', // Rich olive
  ],

  // Auth screen gradient - Deep, luxurious
  auth: {
    gradientColors: ['#0C0A09', '#1C1917', '#292524'],
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
      shadowOpacity: 0.05,
      shadowRadius: 1,
      elevation: 1,
    },
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 2,
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
        backgroundColor: '#B91C1C',
        textColor: '#ffffff',
      },
      secondary: {
        backgroundColor: '#F5F5F4',
        textColor: '#44403C',
      },
      success: {
        backgroundColor: '#047857',
        textColor: '#ffffff',
      },
      danger: {
        backgroundColor: '#B91C1C',
        textColor: '#ffffff',
      },
    },
    // Input styles
    input: {
      backgroundColor: '#ffffff',
      borderColor: '#E7E5E4',
      focusBorderColor: '#B91C1C',
      placeholderColor: '#A8A29E',
    },
    // Navigation
    navigation: {
      tabBarBackground: '#ffffff',
      tabBarActiveColor: '#B91C1C',
      tabBarInactiveColor: '#78716C',
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

// ==================== CVR / CDR Plan Dark Theme ====================
// Matches reference: dark navy background, purple accents, orange Due badge, green checkmarks

export const cvrTheme = {
  // Dark backgrounds
  background: {
    primary: '#19193C',      // Main screen
    card: '#27274E',         // Cards, input fields
    elevated: '#2D2D5A',     // Slightly lighter for headers
  },
  // Text
  text: {
    primary: '#FFFFFF',
    secondary: '#B0B0C8',
    placeholder: '#8A8AA8',
  },
  // Accents
  accent: {
    purple: '#8A72F6',       // Active tab, Photo/Remarks, Next button
    purpleGradient: ['#6B48FF', '#9D62FF'],
    green: '#4CAF50',        // Completed checkmarks
    due: '#EAA000',          // Due 11:59 PM pill (amber/orange)
  },
  // Components
  input: {
    bg: '#27274E',
    border: '#3D3D6B',
  },
  button: {
    next: ['#6B48FF', '#9D62FF'],  // Gradient for Next/Submit
    saveDraft: '#8A72F6',
  },
};

// Helper: detect if template uses CVR UI (CVR / CDR Plan)
export const isCvrTemplate = (name) => {
  if (!name || typeof name !== 'string') return false;
  const n = name.toUpperCase();
  return n.includes('CVR') || n.includes('CDR PLAN');
};

export default themeConfig;
