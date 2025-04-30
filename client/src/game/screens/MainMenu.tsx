import { useState, useEffect } from 'react';
import { useGameState } from '@/lib/stores/useGameState';
import { useAudio } from '@/lib/stores/useAudio';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LoginModal from '../ui/LoginModal';
import { VolumeX, Volume2 } from 'lucide-react';

const MainMenu = () => {
  const { startGame, setGameState } = useGameState();
  const { backgroundMusic, toggleMute, isMuted } = useAudio();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Start background music when the menu loads
  useEffect(() => {
    if (backgroundMusic) {
      backgroundMusic.play().catch(error => {
        console.log("Background music play prevented:", error);
      });
    }
    
    // Show animation on load
    setIsAnimating(true);
    
    return () => {
      if (backgroundMusic) {
        backgroundMusic.pause();
      }
    };
  }, [backgroundMusic]);

  const handlePlay = () => {
    setGameState('character_select');
  };

  const handleOpenLogin = () => {
    setIsLoginOpen(true);
  };

  const handleCloseLogin = () => {
    setIsLoginOpen(false);
  };

  // Array of crypto coins for the background animation
  const coinClasses = [
    "coin-btc",
    "coin-eth",
    "coin-doge",
    "coin-pepe",
  ];

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-blue-500 to-cyan-300 flex flex-col items-center justify-center overflow-hidden">
      {/* Floating coins background */}
      {isAnimating && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {coinClasses.map((coinClass, i) => (
            Array.from({ length: 5 }).map((_, j) => (
              <div 
                key={`${coinClass}-${i}-${j}`}
                className={`absolute w-12 h-12 opacity-20 animate-float`}
                style={{
                  left: `${10 + ((i * 25) + j * 15)}%`,
                  top: `${(j * 20) - 10}%`,
                  animationDelay: `${(i * 0.5) + (j * 0.7)}s`,
                  animationDuration: `${5 + j}s`
                }}
              >
                <div className={`w-full h-full rounded-full ${
                  coinClass === "coin-btc" ? "bg-yellow-500" :
                  coinClass === "coin-eth" ? "bg-purple-500" :
                  coinClass === "coin-doge" ? "bg-orange-500" : "bg-green-500"
                }`}></div>
              </div>
            ))
          ))}
        </div>
      )}

      <div className="relative z-10 bg-black/20 backdrop-blur-sm p-8 rounded-xl shadow-2xl border border-white/20 flex flex-col items-center max-w-md mx-4">
        <h1 className="text-4xl font-bold text-yellow-400 mb-4 animate-pulse">
          CRYPTO BEACH SOCCER
        </h1>
        
        <p className="text-white mb-8 text-center">
          The ultimate beach soccer game with your favorite crypto characters!
        </p>
        
        <div className="space-y-4 w-full">
          <Button 
            size="lg" 
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold"
            onClick={handlePlay}
          >
            PLAY NOW
          </Button>
          
          <Button 
            variant="outline" 
            size="lg" 
            className="w-full border-white/50 text-white hover:bg-white/20"
            onClick={handleOpenLogin}
          >
            GUEST LOGIN
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={toggleMute}
          >
            {isMuted ? <VolumeX /> : <Volume2 />}
          </Button>
        </div>
        
        <p className="text-white/70 text-xs mt-8">
          Orange Vibe Jam Hackathon Project © 2023
        </p>
      </div>

      {/* Login Modal */}
      <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Guest Login</DialogTitle>
          </DialogHeader>
          <LoginModal onClose={handleCloseLogin} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MainMenu;
