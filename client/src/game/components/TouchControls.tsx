import { useRef, useState } from 'react';
import { useEffect } from 'react';
import { useGameState } from '@/lib/stores/useGameState';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

// Virtual controls for mobile devices
const TouchControls = () => {
  const { gameState } = useGameState();
  const [isKicking, setIsKicking] = useState(false);
  
  // Don't show touch controls if not playing
  if (gameState !== 'playing') return null;
  
  const handleKick = () => {
    // Trigger kick action
    const keyEvent = new KeyboardEvent('keydown', { code: 'Space' });
    window.dispatchEvent(keyEvent);
    
    // Visual feedback
    setIsKicking(true);
    setTimeout(() => setIsKicking(false), 300);
    
    // Release key
    setTimeout(() => {
      const keyUpEvent = new KeyboardEvent('keyup', { code: 'Space' });
      window.dispatchEvent(keyUpEvent);
    }, 100);
  };
  
  const handleAbility = () => {
    // Trigger ability action
    const keyEvent = new KeyboardEvent('keydown', { code: 'KeyE' });
    window.dispatchEvent(keyEvent);
    
    // Release key
    setTimeout(() => {
      const keyUpEvent = new KeyboardEvent('keyup', { code: 'KeyE' });
      window.dispatchEvent(keyUpEvent);
    }, 100);
  };
  
  // Handle directional button press/release
  const handleDirectionDown = (direction: string) => {
    let code = '';
    switch (direction) {
      case 'left': code = 'ArrowLeft'; break;
      case 'right': code = 'ArrowRight'; break;
      case 'jump': code = 'ArrowUp'; break;
    }
    const keyEvent = new KeyboardEvent('keydown', { code });
    window.dispatchEvent(keyEvent);
  };
  
  const handleDirectionUp = (direction: string) => {
    let code = '';
    switch (direction) {
      case 'left': code = 'ArrowLeft'; break;
      case 'right': code = 'ArrowRight'; break;
      case 'jump': code = 'ArrowUp'; break;
    }
    const keyEvent = new KeyboardEvent('keyup', { code });
    window.dispatchEvent(keyEvent);
  };
  
  return (
    <div className="fixed bottom-0 inset-x-0 p-4 pointer-events-none">
      <div className="flex justify-between items-center">
        {/* Left side - movement controls */}
        <div className="flex gap-2 pointer-events-auto">
          <Button
            size="lg"
            variant="secondary"
            className="h-16 w-16 rounded-full bg-black/40 border-0 shadow-lg hover:bg-black/60 active:bg-black/70"
            onTouchStart={() => handleDirectionDown('left')}
            onTouchEnd={() => handleDirectionUp('left')}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
          
          <Button
            size="lg"
            variant="secondary"
            className="h-16 w-16 rounded-full bg-black/40 border-0 shadow-lg hover:bg-black/60 active:bg-black/70"
            onTouchStart={() => handleDirectionDown('right')}
            onTouchEnd={() => handleDirectionUp('right')}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
          
          <Button
            size="lg"
            variant="secondary"
            className="h-16 w-16 rounded-full bg-black/40 border-0 shadow-lg hover:bg-black/60 active:bg-black/70"
            onTouchStart={() => handleDirectionDown('jump')}
            onTouchEnd={() => handleDirectionUp('jump')}
          >
            <ChevronUp className="h-8 w-8" />
          </Button>
        </div>
        
        {/* Right side - action controls */}
        <div className="flex gap-2 pointer-events-auto">
          <Button
            size="lg"
            variant="secondary"
            className={cn(
              "h-16 w-16 rounded-full bg-orange-500/80 border-0 shadow-lg hover:bg-orange-600/80 active:bg-orange-700/80",
              isKicking && "bg-orange-700/80"
            )}
            onClick={handleKick}
          >
            KICK
          </Button>
          
          <Button
            size="lg"
            variant="secondary"
            className="h-16 w-16 rounded-full bg-purple-500/80 border-0 shadow-lg hover:bg-purple-600/80 active:bg-purple-700/80"
            onClick={handleAbility}
          >
            <Zap className="h-8 w-8" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TouchControls;
