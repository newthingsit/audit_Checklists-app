// Theme Configuration - Easy to customize colors and UI
// Change colors here and they'll apply throughout the app

export const themeConfig = {
  // Primary Colors (Main accent color)
  primary: {
    main: '#1976d2',      // Main blue - Change this for different accent
    light: '#42a5f5',     // Lighter shade
    dark: '#1565c0',      // Darker shade
  },

  // Alternative Color Schemes (uncomment to use)
  
  // Purple Theme
  // primary: {
  //   main: '#7b2cbf',
  //   light: '#9d4edd',
  //   dark: '#5a189a',
  // },

  // Green Theme
  // primary: {
  //   main: '#2d6a4f',
  //   light: '#52b788',
  //   dark: '#1b4332',
  // },

  // Orange Theme
  // primary: {
  //   main: '#f77f00',
  //   light: '#fcbf49',
  //   dark: '#d62828',
  // },

  // Teal Theme
  // primary: {
  //   main: '#06a77d',
  //   light: '#06d6a0',
  //   dark: '#048a64',
  // },

  // Background Colors
  background: {
    default: '#f5f7fa',   // Main background
    paper: '#ffffff',      // Card/paper background
    sidebar: '#f8f9fa',    // Sidebar background
  },

  // Text Colors
  text: {
    primary: '#333333',   // Main text
    secondary: '#666666',  // Secondary text
    disabled: '#999999',   // Disabled text
  },

  // Border Colors
  border: {
    default: '#e0e0e0',    // Default borders
    light: '#f0f0f0',      // Light borders
    dark: '#bdbdbd',      // Dark borders
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

  // Dashboard Card Gradients
  dashboardCards: {
    card1: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',  // Purple gradient
    card2: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',  // Pink gradient
    card3: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',  // Blue gradient
    card4: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', // Green gradient
  },

  // Login/Register Page
  auth: {
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Purple gradient
    // Alternative gradients:
    // gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Purple
    // gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // Pink
    // gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', // Blue
    // gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', // Green
    // gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', // Orange-Yellow
  },

  // Border Radius
  borderRadius: {
    small: 4,
    medium: 8,
    large: 12,
    round: '50%',
  },

  // Shadows
  shadows: {
    small: '0 2px 4px rgba(0,0,0,0.1)',
    medium: '0 2px 8px rgba(0,0,0,0.1)',
    large: '0 4px 16px rgba(0,0,0,0.15)',
    card: '0 2px 8px rgba(0,0,0,0.1)',
    cardHover: '0 4px 16px rgba(0,0,0,0.15)',
  },
};

// Helper function to get theme colors
export const getThemeColors = () => themeConfig;

