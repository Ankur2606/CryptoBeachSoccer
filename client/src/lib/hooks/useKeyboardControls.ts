import { useState, useEffect, useCallback, useRef } from 'react';

// Controls interface
interface Controls {
  left: boolean;     // A or Left Arrow
  right: boolean;    // D or Right Arrow
  kick: boolean;     // Space (kick ball)
  ability: boolean;  // E (use character ability)
  forward: boolean;  // W or Up Arrow (dedicated forward movement)
  backward: boolean; // S or Down Arrow (backward movement)
  shiftJump: boolean; // SHIFT key (dedicated jumping)
}

// Default control state (all keys up)
const defaultControls: Controls = {
  left: false,
  right: false,
  kick: false,
  ability: false,
  forward: false,
  backward: false,
  shiftJump: false
};

// Keyboard controls hook
export function useKeyboardControls() {
  const [controls, setControls] = useState<Controls>(defaultControls);
  
  // Key down handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.code) {
      case 'KeyA':
      case 'ArrowLeft':
        setControls(state => ({ ...state, left: true }));
        break;
      
      case 'KeyD':
      case 'ArrowRight':
        setControls(state => ({ ...state, right: true }));
        break;
      
      case 'KeyW':
      case 'ArrowUp':
        setControls(state => ({
          ...state,
          forward: true
          // Removed jump: true - W no longer jumps
        }));
        break;
      
      case 'KeyS':
      case 'ArrowDown':
        setControls(state => ({ ...state, backward: true }));
        break;
      
      case 'Space':
        setControls(state => ({ ...state, kick: true }));
        break;
      
      case 'KeyE':
        setControls(state => ({ ...state, ability: true }));
        break;
        
      case 'ShiftLeft':
      case 'ShiftRight':
        setControls(state => ({ ...state, shiftJump: true }));
        break;
    }
  }, []);
  
  // Key up handler
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    switch (event.code) {
      case 'KeyA':
      case 'ArrowLeft':
        setControls(state => ({ ...state, left: false }));
        break;
      
      case 'KeyD':
      case 'ArrowRight':
        setControls(state => ({ ...state, right: false }));
        break;
      
      case 'KeyW':
      case 'ArrowUp':
        setControls(state => ({
          ...state,
          forward: false
          // Removed jump: false - W no longer jumps
        }));
        break;
      
      case 'KeyS':
      case 'ArrowDown':
        setControls(state => ({ ...state, backward: false }));
        break;
      
      case 'Space':
        setControls(state => ({ ...state, kick: false }));
        break;
      
      case 'KeyE':
        setControls(state => ({ ...state, ability: false }));
        break;
        
      case 'ShiftLeft':
      case 'ShiftRight':
        setControls(state => ({ ...state, shiftJump: false }));
        break;
    }
  }, []);
  
  // Set up key listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
  
  // Subscribe to control changes
  const subscribeKeys = useCallback((callback: (state: Controls) => void) => {
    const unsubscribe = () => {
      // Not implemented yet - would need a pub/sub system
    };
    
    return unsubscribe;
  }, []);
  
  // Get current control state
  const getKeys = useCallback(() => controls, [controls]);
  
  return [subscribeKeys, getKeys] as const;
}

export default useKeyboardControls;
