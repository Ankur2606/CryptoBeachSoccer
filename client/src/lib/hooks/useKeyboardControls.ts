import { useState, useEffect, useCallback, useRef } from 'react';

// Controls interface
interface Controls {
  left: boolean;
  right: boolean;
  jump: boolean;
  kick: boolean;
  ability: boolean;
}

// Custom hook to handle keyboard controls
export function useKeyboardControls() {
  // State to track which keys are pressed
  const [keys, setKeys] = useState<Controls>({
    left: false,
    right: false,
    jump: false,
    kick: false,
    ability: false
  });

  // Using a ref for latest key state to avoid closure issues
  const keysRef = useRef<Controls>(keys);
  
  // Update the ref whenever state changes
  useEffect(() => {
    keysRef.current = keys;
  }, [keys]);
  
  // Event handlers
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Prevent default behavior for game controls
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyE'].includes(event.code)) {
      event.preventDefault();
    }
    
    switch (event.code) {
      case 'ArrowLeft':
      case 'KeyA':
        setKeys(prev => {
          console.log('Left key down');
          return { ...prev, left: true };
        });
        break;
      case 'ArrowRight':
      case 'KeyD':
        setKeys(prev => {
          console.log('Right key down');
          return { ...prev, right: true };
        });
        break;
      case 'ArrowUp':
      case 'KeyW':
        setKeys(prev => {
          console.log('Jump key down');
          return { ...prev, jump: true };
        });
        break;
      case 'Space':
        setKeys(prev => {
          console.log('Kick key down');
          return { ...prev, kick: true };
        });
        break;
      case 'KeyE':
        setKeys(prev => {
          console.log('Ability key down');
          return { ...prev, ability: true };
        });
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
    console.log('Setting up keyboard controls');
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Reset controls when window loses focus
    const handleBlur = () => {
      setKeys({
        left: false,
        right: false,
        jump: false,
        kick: false,
        ability: false
      });
    };
    
    window.addEventListener('blur', handleBlur);
    
    // Log current controls state for debugging
    const debugInterval = setInterval(() => {
      const activeKeys = Object.entries(keysRef.current)
        .filter(([_, pressed]) => pressed)
        .map(([key]) => key);
      
      if (activeKeys.length > 0) {
        console.log('Active keys:', activeKeys.join(', '));
      }
    }, 2000);
    
    // Cleanup
    return () => {
      console.log('Cleaning up keyboard controls');
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      clearInterval(debugInterval);
    };
  }, [handleKeyDown, handleKeyUp]);
  
  // Function to subscribe to key changes
  const subscribeKeys = useCallback((callback: (keys: Controls) => void) => {
    // In a more complex implementation, we would add the callback to a list
    // and call it whenever keys change. For simplicity, we're just returning
    // an empty unsubscribe function.
    return () => {
      // Unsubscribe function (empty in this simple implementation)
    };
  }, []);
  
  // Function to get current keys state directly from the ref for better performance
  const getKeys = useCallback(() => keysRef.current, []);
  
  // Return both the subscription function and getter
  return [subscribeKeys, getKeys] as const;
}
