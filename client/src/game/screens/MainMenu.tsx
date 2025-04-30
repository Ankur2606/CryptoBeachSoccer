import { useState, useEffect } from 'react';
import { useGameState } from '@/lib/stores/useGameState';
import { useAudio } from '@/lib/stores/useAudio';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoginModal from '../ui/LoginModal';
import { VolumeX, Volume2, Users, User } from 'lucide-react';

const MainMenu = () => {
  const { setGameState, setMultiplayerMode } = useGameState();
  const { backgroundMusic, toggleMute, isMuted } = useAudio();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [gameMode, setGameMode] = useState<'singleplayer' | 'multiplayer'>('singleplayer');

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
    // Set multiplayer mode based on the selected option
    setMultiplayerMode(gameMode === 'multiplayer');
    
    if (gameMode === 'singleplayer') {
      // Go to character selection for single player
      setGameState('character_select');
    } else {
      // Go to multiplayer lobby for multiplayer
      setGameState('multiplayer_lobby');
    }
  };

  const handleOpenLogin = () => {
    setIsLoginOpen(true);
  };

  const handleCloseLogin = () => {
    setIsLoginOpen(false);
  };
  
  // Handle game mode selection
  const handleGameModeChange = (value: string) => {
    setGameMode(value as 'singleplayer' | 'multiplayer');
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
        
        <p className="text-white mb-4 text-center">
          The ultimate beach soccer game with your favorite crypto characters!
        </p>
        
        {/* Game Mode Selection */}
        <div className="w-full mb-6">
          <Tabs
            defaultValue="singleplayer"
            className="w-full"
            value={gameMode}
            onValueChange={handleGameModeChange}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger 
                value="singleplayer"
                className="flex items-center justify-center gap-2"
              >
                <User className="h-4 w-4" />
                <span>Single Player</span>
              </TabsTrigger>
              <TabsTrigger 
                value="multiplayer"
                className="flex items-center justify-center gap-2"
              >
                <Users className="h-4 w-4" />
                <span>Multiplayer</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="text-xs text-center mt-2 text-white/80">
            {gameMode === 'singleplayer' 
              ? 'Play against AI opponent' 
              : 'Play 1v1 with another player'}
          </div>
        </div>
        
        <div className="space-y-4 w-full">
          <Button 
            size="lg" 
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold"
            onClick={handlePlay}
          >
            {gameMode === 'singleplayer' ? 'START GAME' : 'JOIN MULTIPLAYER'}
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
