import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const ThemeContext = createContext();

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState('light'); // 'light', 'dark', or 'auto'
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // Determine if dark mode should be active based on theme preference
  const getDarkMode = (theme) => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    if (theme === 'auto') {
      // Check system preference
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  };

  // Fetch theme preference from API
  const fetchThemePreference = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // Not logged in, use localStorage or default
        const saved = localStorage.getItem('theme');
        const theme = saved || 'light';
        setThemeMode(theme);
        setDarkMode(getDarkMode(theme));
        setLoading(false);
        return;
      }

      const response = await axios.get('/api/settings/preferences').catch(() => null);
      if (response && response.data && response.data.preferences) {
        const theme = response.data.preferences.theme || 'light';
        setThemeMode(theme);
        setDarkMode(getDarkMode(theme));
        // Also save to localStorage as fallback
        localStorage.setItem('theme', theme);
      } else {
        // No preferences, use localStorage or default
        const saved = localStorage.getItem('theme');
        const theme = saved || 'light';
        setThemeMode(theme);
        setDarkMode(getDarkMode(theme));
      }
    } catch (error) {
      // Error fetching, use localStorage or default (suppress console errors for 401)
      if (error.response?.status !== 401) {
        console.error('Error fetching theme preference:', error);
      }
      const saved = localStorage.getItem('theme');
      const theme = saved || 'light';
      setThemeMode(theme);
      setDarkMode(getDarkMode(theme));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThemePreference();

    // Listen for system theme changes if auto mode
    if (themeMode === 'auto' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => {
        setDarkMode(e.matches);
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeMode]);

  // Listen for theme changes from Settings page
  useEffect(() => {
    const handleThemeChange = () => {
      // Check localStorage first for immediate update
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        setThemeMode(savedTheme);
        setDarkMode(getDarkMode(savedTheme));
      }
      // Then fetch from API to ensure consistency
      fetchThemePreference();
    };

    // Listen for custom event when theme is saved
    window.addEventListener('themePreferenceChanged', handleThemeChange);
    
    // Also listen for storage changes (in case theme is updated in another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'theme') {
        const theme = e.newValue || 'light';
        setThemeMode(theme);
        setDarkMode(getDarkMode(theme));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('themePreferenceChanged', handleThemeChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const updateTheme = (theme) => {
    setThemeMode(theme);
    setDarkMode(getDarkMode(theme));
    localStorage.setItem('theme', theme);
  };

  const toggleDarkMode = () => {
    const newMode = darkMode ? 'light' : 'dark';
    updateTheme(newMode);
  };

  return (
    <ThemeContext.Provider value={{ 
      darkMode, 
      themeMode,
      toggleDarkMode, 
      updateTheme,
      loading 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

