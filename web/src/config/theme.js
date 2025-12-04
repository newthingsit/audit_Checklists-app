// Theme Configuration - Lite Bite Foods Premium Design
// Sophisticated, professional aesthetic for restaurant audit excellence

export const themeConfig = {
  // Primary Colors - Refined Burgundy/Crimson
  primary: {
    main: '#B91C1C',      // Rich crimson red
    light: '#DC2626',     // Brighter red
    dark: '#991B1B',      // Deep crimson
    contrast: '#ffffff',
  },

  // Secondary/Accent Colors - Warm Slate with Gold touches
  secondary: {
    main: '#78716C',      // Warm stone
    light: '#A8A29E',     // Light stone
    dark: '#57534E',      // Dark stone
  },

  // Background Colors - Clean, professional
  background: {
    default: '#FAFAF9',   // Warm white (stone-50)
    paper: '#ffffff',      // Pure white cards
    sidebar: '#18181B',    // Rich black (zinc-900)
    sidebarHover: '#27272A',
    elevated: '#ffffff',
  },

  // Text Colors
  text: {
    primary: '#18181B',    // Rich black
    secondary: '#52525B',   // Zinc gray
    disabled: '#A1A1AA',    // Light zinc
    inverse: '#FAFAF9',     // For dark backgrounds
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

  // Dashboard Card Gradients - Elegant, cohesive palette
  dashboardCards: {
    card1: 'linear-gradient(135deg, #B91C1C 0%, #DC2626 100%)',  // Crimson (primary)
    card2: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)',  // Purple
    card3: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',  // Emerald
    card4: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',  // Blue
    card5: 'linear-gradient(135deg, #EA580C 0%, #F97316 100%)',  // Orange
  },

  // Chart Colors - Professional analytics palette
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

  // Login/Register Page - Dark sophisticated gradient
  auth: {
    gradient: 'linear-gradient(135deg, #18181B 0%, #27272A 50%, #3F3F46 100%)',
    gradientAnimated: `
      linear-gradient(-45deg, #18181B, #27272A, #3F3F46, #27272A)
    `,
  },

  // Glass morphism effect
  glass: {
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },

  // Border Radius - Modern, professional
  borderRadius: {
    small: 6,
    medium: 10,
    large: 16,
    xl: 24,
    round: '50%',
  },

  // Shadows - Refined depth
  shadows: {
    small: '0 1px 2px rgba(0, 0, 0, 0.05)',
    medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    large: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    card: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
    cardHover: '0 10px 40px rgba(0, 0, 0, 0.12)',
    glow: '0 0 30px rgba(185, 28, 28, 0.25)',
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
    background: '#18181B',
    activeBackground: 'rgba(185, 28, 28, 0.15)',
    activeBorder: '#B91C1C',
    hoverBackground: 'rgba(255, 255, 255, 0.05)',
  },
};

// CSS Keyframes for animations (to be used with @keyframes)
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

// Score color helper
export const getScoreColor = (score) => {
  if (score >= 80) return themeConfig.success.main;
  if (score >= 60) return themeConfig.warning.main;
  return themeConfig.error.main;
};

// Score background color helper
export const getScoreBgColor = (score) => {
  if (score >= 80) return themeConfig.success.bg;
  if (score >= 60) return themeConfig.warning.bg;
  return themeConfig.error.bg;
};
