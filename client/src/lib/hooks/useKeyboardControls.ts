import { useState, useEffect, useCallback } from 'react';

// Custom hook to handle keyboard controls
export function useKeyboardControls() {
  // State to track which keys are pressed
  const [keys, setKeys] = useState({
    left: false,
    right: false,
    jump: false,
    kick: false,
    ability: false
  });
  
  // Event handlers
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.code) {
      case 'ArrowLeft':
      case 'KeyA':
        setKeys(prev => ({ ...prev, left: true }));
        break;
      case 'ArrowRight':
      case 'KeyD':
        setKeys(prev => ({ ...prev, right: true }));
        break;
      case 'ArrowUp':
      case 'KeyW':
        setKeys(prev => ({ ...prev, jump: true }));
        break;
      case 'Space':
        setKeys(prev => ({ ...prev, kick: true }));
        break;
      case 'KeyE':
        setKeys(prev => ({ ...prev, ability: true }));
        break;
    }
  }, []);
  
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    switch (event.code) {
      case 'ArrowLeft':
      case 'KeyA':
        setKeys(prev => ({ ...prev, left: false }));
        break;
      case 'ArrowRight':
      case 'KeyD':
        setKeys(prev => ({ ...prev, right: false }));
        break;
      case 'ArrowUp':
      case 'KeyW':
        setKeys(prev => ({ ...prev, jump: false }));
        break;
      case 'Space':
        setKeys(prev => ({ ...prev, kick: false }));
        break;
      case 'KeyE':
        setKeys(prev => ({ ...prev, ability: false }));
        break;
    }
  }, []);
  
  // Set up event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
  
  // Function to subscribe to key changes
  const subscribeKeys = useCallback((callback: (keys: typeof keys) => void) => {
    const unsubscribe = () => {};
    return unsubscribe;
  }, []);
  
  // Function to get current keys state
  const getKeys = useCallback(() => keys, [keys]);
  
  // Return both the subscription function and getter
  return [subscribeKeys, getKeys] as const;
}
