import { useEffect } from 'react';

const useKeyboardShortcuts = (shortcuts) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check for Ctrl/Cmd key combinations
      const isModifierPressed = event.ctrlKey || event.metaKey;
      
      if (isModifierPressed) {
        const key = event.key.toLowerCase();
        const shortcut = shortcuts[`ctrl+${key}`] || shortcuts[`cmd+${key}`];
        
        if (shortcut) {
          event.preventDefault();
          shortcut();
        }
      } else {
        // Check for single key shortcuts (when not in input fields)
        if (event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
          const shortcut = shortcuts[event.key.toLowerCase()];
          if (shortcut) {
            event.preventDefault();
            shortcut();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
};

export default useKeyboardShortcuts;

