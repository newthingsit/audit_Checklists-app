// Theme Configuration - Lite Bite Foods Professional Design System
// Enterprise-grade aesthetic for restaurant audit excellence

export const themeConfig = {
  // Primary Colors - Deep Crimson (Brand Identity)
  primary: {
    main: '#C41E3A',      // Cardinal red - elegant, professional
    light: '#E63950',     // Lighter accent
    dark: '#9B1B30',      // Deep burgundy
    contrast: '#ffffff',
    50: '#FDF2F4',
    100: '#FCE4E8',
    200: '#FACDD5',
    300: '#F6A5B4',
    400: '#EF6D89',
    500: '#C41E3A',
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
    sidebar: '#0F172A',    // Deep navy (rich & professional)
    sidebarHover: '#1E293B',
    elevated: '#ffffff',
    subtle: '#F1F5F9',     // Very light slate for sections
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

  // Dashboard Card Gradients - Professional, distinctive palette
  dashboardCards: {
    card1: 'linear-gradient(135deg, #C41E3A 0%, #E63950 100%)',  // Primary crimson
    card2: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',  // Rich purple
    card3: 'linear-gradient(135deg, #059669 0%, #34D399 100%)',  // Success green
    card4: 'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)',  // Sky blue
    card5: 'linear-gradient(135deg, #D97706 0%, #FCD34D 100%)',  // Golden amber
  },

  // Chart Colors - Professional analytics palette
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

  // Pie chart specific (good contrast between slices)
  pieColors: [
    '#059669', // Green - for "Completed" / positive
    '#D97706', // Amber - for "In Progress" / neutral
    '#94A3B8', // Gray - for "Pending"
    '#DC2626', // Red - for "Overdue" / negative
    '#7C3AED', // Purple - additional
    '#0284C7', // Blue - additional
  ],

  // Login/Auth Page - Sophisticated dark gradient
  auth: {
    gradient: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
    gradientAnimated: `linear-gradient(-45deg, #0F172A, #1E293B, #334155, #1E293B)`,
    accentGlow: 'rgba(196, 30, 58, 0.15)',
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
    xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
    small: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
    medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    large: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    card: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
    cardHover: '0 10px 40px rgba(0, 0, 0, 0.12)',
    glow: '0 0 30px rgba(196, 30, 58, 0.2)',
    innerSoft: 'inset 0 2px 4px rgba(0, 0, 0, 0.05)',
  },

  // Transitions - Smooth animations
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: '500ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // Sidebar specific
  sidebar: {
    width: 260,
    collapsedWidth: 72,
    background: '#0F172A',
    activeBackground: 'rgba(196, 30, 58, 0.12)',
    activeBorder: '#C41E3A',
    hoverBackground: 'rgba(255, 255, 255, 0.05)',
    divider: 'rgba(255, 255, 255, 0.08)',
  },

  // Table styles
  table: {
    headerBg: '#F8FAFC',
    rowHover: '#F1F5F9',
    stripedBg: '#FAFBFC',
    border: '#E2E8F0',
  },

  // Button variants
  button: {
    primary: {
      bg: '#C41E3A',
      hoverBg: '#9B1B30',
      activeBg: '#7F1728',
    },
    secondary: {
      bg: '#F1F5F9',
      hoverBg: '#E2E8F0',
      text: '#475569',
    },
    success: {
      bg: '#059669',
      hoverBg: '#047857',
    },
    danger: {
      bg: '#DC2626',
      hoverBg: '#B91C1C',
    },
  },

  // Input/Form styles
  input: {
    bg: '#ffffff',
    border: '#E2E8F0',
    focusBorder: '#C41E3A',
    focusShadow: '0 0 0 3px rgba(196, 30, 58, 0.1)',
    placeholder: '#94A3B8',
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
