// Theme Configuration - Modern & Distinctive Design
// A fresh, professional aesthetic that avoids generic AI-generated looks

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
    sidebarHover: '#1e293b',
    elevated: '#ffffff',
  },

  // Text Colors
  text: {
    primary: '#0f172a',    // Dark navy - strong contrast
    secondary: '#475569',   // Slate gray
    disabled: '#94a3b8',    // Light slate
    inverse: '#f8fafc',     // For dark backgrounds
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

  // Dashboard Card Gradients - Rich, modern gradients
  dashboardCards: {
    card1: 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)',  // Teal to Cyan
    card2: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',  // Orange gradient
    card3: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',  // Purple gradient
    card4: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',  // Green gradient
    card5: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',  // Pink gradient
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

  // Login/Register Page - Animated gradient
  auth: {
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0d9488 100%)',
    gradientAnimated: `
      linear-gradient(-45deg, #0f172a, #1e293b, #0d9488, #0891b2)
    `,
  },

  // Glass morphism effect
  glass: {
    background: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },

  // Border Radius - Softer, more modern
  borderRadius: {
    small: 6,
    medium: 10,
    large: 16,
    xl: 24,
    round: '50%',
  },

  // Shadows - Layered depth
  shadows: {
    small: '0 1px 2px rgba(0, 0, 0, 0.05)',
    medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    large: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    card: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
    cardHover: '0 10px 40px rgba(0, 0, 0, 0.12)',
    glow: '0 0 20px rgba(13, 148, 136, 0.3)',
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
    background: '#0f172a',
    activeBackground: 'rgba(13, 148, 136, 0.15)',
    activeBorder: '#0d9488',
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
