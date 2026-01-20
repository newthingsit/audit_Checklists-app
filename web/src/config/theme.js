// Theme Configuration - Lite Bite Foods Professional Design System
// Enterprise-grade aesthetic with RICH, VIBRANT colors

export const themeConfig = {
  // Primary Colors - Deep Ruby Red (Luxurious Brand Identity)
  primary: {
    main: '#B91C1C',      // Rich ruby red - bold, luxurious
    light: '#DC2626',     // Vibrant red accent
    dark: '#7F1D1D',      // Deep wine red
    contrast: '#ffffff',
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#B91C1C',
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
    sidebarHover: '#1C1917',
    elevated: '#ffffff',
    subtle: '#F1F5F9',     // Very light slate for sections
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
    card1: 'linear-gradient(135deg, #B91C1C 0%, #EF4444 100%)',  // Rich ruby red
    card2: 'linear-gradient(135deg, #4338CA 0%, #818CF8 100%)',  // Deep indigo to violet
    card3: 'linear-gradient(135deg, #047857 0%, #10B981 100%)',  // Rich emerald
    card4: 'linear-gradient(135deg, #7C3AED 0%, #C084FC 100%)',  // Rich purple to orchid
    card5: 'linear-gradient(135deg, #B45309 0%, #FBBF24 100%)',  // Rich gold
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

  // Pie chart specific (rich contrast between slices)
  pieColors: [
    '#047857', // Rich emerald - for "Completed" / positive
    '#B45309', // Rich amber - for "In Progress" / neutral
    '#78716C', // Warm gray - for "Pending"
    '#B91C1C', // Rich red - for "Overdue" / negative
    '#7C3AED', // Rich purple - additional
    '#0369A1', // Rich blue - additional
  ],

  // Login/Auth Page - Deep, luxurious gradient
  auth: {
    gradient: 'linear-gradient(135deg, #0C0A09 0%, #1C1917 50%, #292524 100%)',
    gradientAnimated: `linear-gradient(-45deg, #0C0A09, #1C1917, #292524, #1C1917)`,
    accentGlow: 'rgba(185, 28, 28, 0.2)',
  },

  // Glass morphism effect
  glass: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
  },

  // Border Radius - Consistent, modern
  borderRadius: {
    xs: 4,
    small: 6,
    medium: 8,
    large: 12,
    xl: 16,
    xxl: 24,
    round: '50%',
  },

  // Shadows - Refined depth
  shadows: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.04)',
    small: '0 1px 3px rgba(0, 0, 0, 0.06)',
    medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    large: '0 10px 15px -3px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.06)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 10px 10px -5px rgba(0, 0, 0, 0.05)',
    card: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
    cardHover: '0 12px 40px rgba(0, 0, 0, 0.15)',
    glow: '0 0 30px rgba(185, 28, 28, 0.25)',
    innerSoft: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
  },

  // Transitions - Smooth animations
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: '500ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // Sidebar specific - Rich charcoal
  sidebar: {
    width: 260,
    collapsedWidth: 72,
    background: '#0C0A09',
    activeBackground: 'rgba(185, 28, 28, 0.15)',
    activeBorder: '#B91C1C',
    hoverBackground: 'rgba(255, 255, 255, 0.08)',
    divider: 'rgba(255, 255, 255, 0.1)',
  },

  // Table styles
  table: {
    headerBg: '#FAFAF9',
    rowHover: '#F5F5F4',
    stripedBg: '#FAFAF9',
    border: '#E7E5E4',
  },

  // Button variants - Rich colors
  button: {
    primary: {
      bg: '#B91C1C',
      hoverBg: '#991B1B',
      activeBg: '#7F1D1D',
    },
    secondary: {
      bg: '#F5F5F4',
      hoverBg: '#E7E5E4',
      text: '#44403C',
    },
    success: {
      bg: '#047857',
      hoverBg: '#065F46',
    },
    danger: {
      bg: '#B91C1C',
      hoverBg: '#991B1B',
    },
  },

  // Input/Form styles
  input: {
    bg: '#ffffff',
    border: '#E7E5E4',
    focusBorder: '#B91C1C',
    focusShadow: '0 0 0 3px rgba(185, 28, 28, 0.12)',
    placeholder: '#A8A29E',
  },
};

// CSS Keyframes for animations
export const animations = {
  fadeInUp: {
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },
  pulse: {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0.5 },
  },
  shimmer: {
    '0%': { backgroundPosition: '-200% 0' },
    '100%': { backgroundPosition: '200% 0' },
  },
  gradientShift: {
    '0%': { backgroundPosition: '0% 50%' },
    '50%': { backgroundPosition: '100% 50%' },
    '100%': { backgroundPosition: '0% 50%' },
  },
};

// Helper function to get theme colors
export const getThemeColors = () => themeConfig;

// Score color helper - for audit scores
export const getScoreColor = (score) => {
  if (score >= 90) return themeConfig.success.main;
  if (score >= 75) return '#22C55E'; // Lighter green
  if (score >= 60) return themeConfig.warning.main;
  if (score >= 40) return '#F97316'; // Orange
  return themeConfig.error.main;
};

// Score background color helper
export const getScoreBgColor = (score) => {
  if (score >= 90) return themeConfig.success.bg;
  if (score >= 75) return '#F0FDF4';
  if (score >= 60) return themeConfig.warning.bg;
  if (score >= 40) return '#FFF7ED';
  return themeConfig.error.bg;
};

// Status color helper
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

// Priority color helper
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
// Matches mobile CVR: dark navy, purple accents, orange Due badge, green checkmarks

export const cvrTheme = {
  background: {
    primary: '#1A1A2E',      // Deep navy background
    secondary: '#16213E',    // Slightly lighter navy
    card: '#1F1F3D',         // Card background - darker for better contrast
    elevated: '#252550',     // Elevated elements
    itemCard: '#252550',     // Individual item card background
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#A0A0C0',
    muted: '#7878A0',
    placeholder: '#6060A0',
  },
  accent: {
    purple: '#7C5DFA',       // Main accent purple
    purpleLight: '#9D7FFF',
    purpleGradient: 'linear-gradient(135deg, #6B48FF 0%, #9D62FF 100%)',
    green: '#00D68F',        // Success/checkmark green
    greenLight: '#00E09F',
    orange: '#FF9500',       // Due/warning orange
    red: '#FF5252',          // Error/required red
  },
  input: {
    bg: '#2A2A4E',           // Input field background
    bgFocused: '#303060',
    border: '#3D3D6B',
    borderFocused: '#7C5DFA',
    placeholder: '#6060A0',
  },
  button: {
    next: 'linear-gradient(135deg, #6B48FF 0%, #9D62FF 100%)',
    nextHover: 'linear-gradient(135deg, #5B38EF 0%, #8D52EF 100%)',
    saveDraft: '#7C5DFA',
    outline: '#7C5DFA',
  },
  progress: {
    track: '#2A2A4E',
    bar: '#7C5DFA',
    barComplete: '#00D68F',
    text: '#FFFFFF',
    textSecondary: '#A0A0C0',
  },
  chip: {
    required: '#FF5252',
    requiredBg: 'rgba(255, 82, 82, 0.15)',
    category: '#7C5DFA',
    categoryBg: 'rgba(124, 93, 250, 0.15)',
  },
  section: {
    headerBg: '#1F1F3D',
    headerBorder: '#3D3D6B',
    contentBg: 'transparent',
  },
  tab: {
    active: '#7C5DFA',
    inactive: '#6060A0',
    indicator: '#7C5DFA',
    completedIcon: '#00D68F',
  },
};

export const isCvrTemplate = (name) => {
  if (!name || typeof name !== 'string') return false;
  const n = name.toUpperCase();
  return n.includes('CVR') || n.includes('CDR PLAN');
};
