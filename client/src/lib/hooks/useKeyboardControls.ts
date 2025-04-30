import { useState, useEffect, useCallback, useRef } from 'react';

// Controls interface
interface Controls {
  left: boolean;     // A or Left Arrow
  right: boolean;    // D or Right Arrow
  jump: boolean;     // W or Up Arrow (jumping and moving forward)
  kick: boolean;     // Space (kick ball)
  ability: boolean;  // E or Shift (use character ability)
  forward: boolean;  // W or Up Arrow (dedicated forward movement)
  backward: boolean; // S or Down Arrow (backward movement)
}

// Custom hook to handle keyboard controls
export function useKeyboardControls() {
  // State to track which keys are pressed
  const [keys, setKeys] = useState<Controls>({
    left: false,
    right: false,
    jump: false,
    kick: false,
    ability: false,
    forward: false,
    backward: false
  });

  // Using a ref for latest key state to avoid closure issues
  const keysRef = useRef<Controls>(keys);
  
  // Update the ref whenever state changes
  useEffect(() => {
    keysRef.current = keys;
  }, [keys]);
  
  // Event handlers with direct access to reference for immediate updates
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Prevent default behavior for game controls
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyE'].includes(event.code)) {
      event.preventDefault();
    }
    
    // Log every keydown for debugging
    console.log('⌨️ Key down:', event.code);
    
    switch (event.code) {
      case 'ArrowLeft':
      case 'KeyA':
        // Update both state and ref immediately
        keysRef.current.left = true;
        setKeys(prev => {
          console.log('Left key down (A or ←)');
          return { ...prev, left: true };
        });
        break;
      case 'ArrowRight':
      case 'KeyD':
        // Update both state and ref immediately
        keysRef.current.right = true;
        setKeys(prev => {
          console.log('Right key down (D or →)');
          return { ...prev, right: true };
        });
        break;
      case 'ArrowUp':
      case 'KeyW':
        // Update both state and ref immediately
        keysRef.current.jump = true;
        keysRef.current.forward = true;
        setKeys(prev => {
          console.log('W key down - Jump AND forward movement');
          return { ...prev, jump: true, forward: true };
        });
        break;
      case 'ArrowDown':  
      case 'KeyS':
        // Update both state and ref immediately
        keysRef.current.backward = true;
        setKeys(prev => {
          console.log('S key down - Backward movement');
          return { ...prev, backward: true };
        });
        break;
      case 'Space':
        // Update both state and ref immediately
        keysRef.current.kick = true;
        setKeys(prev => {
          console.log('Kick key down (Space)');
          return { ...prev, kick: true };
        });
        break;
      case 'KeyE':
      case 'ShiftLeft':
      case 'ShiftRight':
        // Update both state and ref immediately
        keysRef.current.ability = true;
        setKeys(prev => {
          console.log('Ability key down (E or Shift)');
          return { ...prev, ability: true };
        });
        break;
    }
  }, []);
  
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    // Log every keyup for debugging
    console.log('⌨️ Key up:', event.code);
    
    switch (event.code) {
      case 'ArrowLeft':
      case 'KeyA':
        // Update both state and ref immediately
        keysRef.current.left = false;
        setKeys(prev => ({ ...prev, left: false }));
        break;
      case 'ArrowRight':
      case 'KeyD':
        // Update both state and ref immediately
        keysRef.current.right = false;
        setKeys(prev => ({ ...prev, right: false }));
        break;
      case 'ArrowUp':
      case 'KeyW':
        // Update both state and ref immediately
        keysRef.current.jump = false;
        keysRef.current.forward = false;
        setKeys(prev => ({ ...prev, jump: false, forward: false }));
        break;
      case 'ArrowDown':
      case 'KeyS':
        // Update both state and ref immediately
        keysRef.current.backward = false;
        setKeys(prev => ({ ...prev, backward: false }));
        break;
      case 'Space':
        // Update both state and ref immediately
        keysRef.current.kick = false;
        setKeys(prev => ({ ...prev, kick: false }));
        break;
      case 'KeyE':
      case 'ShiftLeft':
      case 'ShiftRight':
        // Update both state and ref immediately
        keysRef.current.ability = false;
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
        ability: false,
        forward: false,
        backward: false
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
