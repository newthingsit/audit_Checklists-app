// API Configuration
// This file centralizes all API URLs to avoid duplication

// IMPORTANT: Update this IP address to match your computer's IP
// Find your IP: 
//   Windows: ipconfig
//   Mac/Linux: ifconfig or ip addr
// 
// For physical devices: Use your computer's IP (e.g., 192.168.1.100)
// For iOS Simulator: Use localhost
// For Android Emulator: Use 10.0.2.2

const getApiBaseUrl = () => {
  if (__DEV__) {
    // Development mode - use your computer's IP for physical devices
    // Change this to your computer's IP address
    // Current IP: 192.168.1.156 (auto-detected)
    return 'http://192.168.1.156:5000/api';
  }
  // Production mode
  return 'https://your-production-api.com/api';
};

export const API_BASE_URL = getApiBaseUrl();

export default API_BASE_URL;

