// Theme Configuration - Matches web app theme
export const themeConfig = {
  // Primary Colors
  primary: {
    main: '#1976d2',
    light: '#42a5f5',
    dark: '#1565c0',
  },

  // Background Colors
  background: {
    default: '#f5f7fa',
    paper: '#ffffff',
    sidebar: '#f8f9fa',
  },

  // Text Colors
  text: {
    primary: '#333333',
    secondary: '#666666',
    disabled: '#999999',
  },

  // Border Colors
  border: {
    default: '#e0e0e0',
    light: '#f0f0f0',
    dark: '#bdbdbd',
  },

  // Status Colors
  success: {
    main: '#4caf50',
    light: '#81c784',
    dark: '#388e3c',
  },
  warning: {
    main: '#ff9800',
    light: '#ffb74d',
    dark: '#f57c00',
  },
  error: {
    main: '#f44336',
    light: '#e57373',
    dark: '#d32f2f',
  },
  info: {
    main: '#2196f3',
    light: '#64b5f6',
    dark: '#1976d2',
  },

  // Dashboard Card Gradients (as colors for React Native)
  dashboardCards: {
    card1: ['#667eea', '#764ba2'], // Purple gradient
    card2: ['#f093fb', '#f5576c'], // Pink gradient
    card3: ['#4facfe', '#00f2fe'], // Blue gradient
    card4: ['#43e97b', '#38f9d7'], // Green gradient
  },

  // Border Radius
  borderRadius: {
    small: 4,
    medium: 8,
    large: 12,
    round: 50,
  },

  // Shadows (for iOS)
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2, // Android
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4, // Android
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8, // Android
    },
  },
};

export default themeConfig;

