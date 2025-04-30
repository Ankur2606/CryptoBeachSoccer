import { useState, useEffect } from 'react';
import { useGameState } from '@/lib/stores/useGameState';
import { useAudio } from '@/lib/stores/useAudio';
import { useBedrockPassport } from '@bedrock_org/passport';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoginModal from '../ui/LoginModal';
import UserProfile from '@/auth/UserProfile';
import { VolumeX, Volume2, Users, User, HelpCircle, UserCircle } from 'lucide-react';

const MainMenu = () => {
  const { setGameState, setMultiplayerMode } = useGameState();
  const { backgroundMusic, toggleMute, isMuted } = useAudio();
  const { isLoggedIn, user } = useBedrockPassport();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
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

  const handleOpenProfile = () => {
    setIsProfileOpen(true);
  };

  const handleCloseProfile = () => {
    setIsProfileOpen(false);
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
    <div className="fixed inset-0 bg-gradient-to-b from-blue-600 to-cyan-400 flex flex-col items-center justify-center overflow-hidden">
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

      <div className="relative z-10 game-panel p-8 rounded-xl flex flex-col items-center max-w-md mx-4">
        <h1 className="game-title text-3xl md:text-4xl font-bold text-yellow-400 mb-6 pixel-pulse">
          CRYPTO BEACH SOCCER
        </h1>
        
        {isLoggedIn && user && (
          <div className="flex items-center gap-2 mb-4 bg-black/30 px-3 py-1 rounded-full">
            <img 
              src={user.picture || '/textures/ui/default-avatar.png'} 
              alt={user.displayName || 'Player'} 
              className="w-6 h-6 rounded-full" 
            />
            <span className="text-sm pixel-font text-white">{user.displayName || user.name || 'Player'}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 rounded-full hover:bg-black/20" 
              onClick={handleOpenProfile}
            >
              <UserCircle className="h-4 w-4 text-orange-400" />
            </Button>
          </div>
        )}
        
        <p className="pixel-font text-white mb-6 text-center text-sm">
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
            <TabsList className="grid w-full grid-cols-2 bg-black/40 text-blue-500 rounded-lg">
              <TabsTrigger 
                value="singleplayer"
                className="flex items-center justify-center gap-2 pixel-font text-xs py-3 tab-trigger"
              >
                <User className="h-4 w-4" />
                <span>Single Player</span>
              </TabsTrigger>
              <TabsTrigger 
                value="multiplayer"
                className="flex items-center justify-center gap-2 pixel-font text-xs py-3 tab-trigger"
              >
                <Users className="h-4 w-4" />
                <span>Multiplayer</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="pixel-font text-xs text-center mt-2 text-white/80">
            {gameMode === 'singleplayer' 
              ? 'Play against AI opponent' 
              : 'Play 1v1 with another player'}
          </div>
        </div>
        
        <div className="space-y-4 w-full">
          <Button 
            size="lg" 
            className="w-full game-button bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white py-6"
            onClick={handlePlay}
          >
            <span className="pixel-font text-sm">
              {gameMode === 'singleplayer' ? 'START GAME' : 'JOIN MULTIPLAYER'}
            </span>
          </Button>
          
          {!isLoggedIn && (
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full game-button border-orange-400 text-orange-400 hover:bg-orange-400/20 py-6"
              onClick={handleOpenLogin}
            >
              <span className="pixel-font text-sm flex items-center justify-center">
                <img 
                  src="https://irp.cdn-website.com/e81c109a/dms3rep/multi/orange-web3-logo-v2a-20241018.svg" 
                  alt="Orange ID" 
                  className="h-4 mr-2"
                />
                SIGN IN WITH ORANGE ID
              </span>
            </Button>
          )}
          
          <Button
            variant="outline"
            size="lg"
            className="w-full game-button border-yellow-300 text-yellow-300 hover:bg-yellow-300/20 py-6"
            onClick={() => setIsManualOpen(true)}
          >
            <span className="pixel-font text-sm flex items-center justify-center">
              <HelpCircle className="mr-2 h-4 w-4" /> HOW TO PLAY
            </span>
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
        
        <p className="pixel-font text-white/70 text-[8px] mt-8">
          Bhavya's Orange Vibe Jam Hackathon Project © 2025
        </p>
      </div>

      {/* Login Modal */}
      <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
        <DialogContent className="sm:max-w-md beach-dialog">
          <DialogHeader>
            <DialogTitle className="pixel-font font-bold flex items-center justify-center">
              <img 
              src="https://irp.cdn-website.com/e81c109a/dms3rep/multi/orange-web3-logo-v2a-20241018.svg" 
              alt="Orange ID" 
              className="h-6 mr-2" 
              />
              <span className="bg-gradient-to-r from-orange-500 to-yellow-400 text-transparent bg-clip-text">
              Login with Orange ID
              </span>
            </DialogTitle>
          </DialogHeader>
          <LoginModal onClose={handleCloseLogin} />
        </DialogContent>
      </Dialog>
      
      {/* User Profile Modal */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-md beach-dialog">
          <DialogHeader>
            <DialogTitle className="pixel-font text-yellow-400 font-bold flex items-center justify-center">
              <img 
                src="https://irp.cdn-website.com/e81c109a/dms3rep/multi/orange-web3-logo-v2a-20241018.svg" 
                alt="Orange ID" 
                className="h-6 mr-2" 
              />
              Orange ID Profile
            </DialogTitle>
          </DialogHeader>
          <UserProfile onClose={handleCloseProfile} />
        </DialogContent>
      </Dialog>
      
      {/* Game Manual Dialog */}
      <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
        <DialogContent className="sm:max-w-2xl beach-dialog">
          <DialogHeader>
            <DialogTitle className="game-title text-yellow-400 text-center">How To Play</DialogTitle>
          </DialogHeader>
          <div className="game-manual pixel-font text-xs">
            <div className="manual-section">
              <h3 className="text-yellow-400 mb-3">Controls</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div className="text-white">Move:</div>
                <div className="text-white"><span className="key-binding">W</span> <span className="key-binding">A</span> <span className="key-binding">S</span> <span className="key-binding">D</span> or <span className="key-binding">↑</span> <span className="key-binding">←</span> <span className="key-binding">↓</span> <span className="key-binding">→</span></div>
                
                <div className="text-white">Jump:</div>
                <div className="text-white"><span className="key-binding">SHIFT</span></div>
                
                <div className="text-white">Kick Ball:</div>
                <div className="text-white"><span className="key-binding">SPACEBAR</span></div>
                
                <div className="text-white">Use Ability:</div>
                <div className="text-white"><span className="key-binding">E</span></div>
                
                <div className="text-white">Reset Ball:</div>
                <div className="text-white"><span className="key-binding">R</span></div>
                
                <div className="text-white">Pause Game:</div>
                <div className="text-white"><span className="key-binding">ESC</span> or <span className="key-binding">P</span></div>
              </div>
            </div>
            
            <div className="manual-section">
              <h3 className="text-yellow-400 mb-3">Characters & Abilities</h3>
              <div className="grid grid-cols-1 gap-y-4">
                <div>
                  <p className="text-white font-bold mb-1">Bitcoin (BTC)</p>
                  <p className="text-white/80">HODL Ability: 150% increased kick power and larger ball control radius</p>
                </div>
                
                <div>
                  <p className="text-white font-bold mb-1">Ethereum (ETH)</p>
                  <p className="text-white/80">Smart Contract: 150% higher jumps and 50% speed boost</p>
                </div>
                
                <div>
                  <p className="text-white font-bold mb-1">Dogecoin (DOGE)</p>
                  <p className="text-white/80">To The Moon: Temporary invincibility, 120% speed boost, and enhanced kicking</p>
                </div>
                
                <div>
                  <p className="text-white font-bold mb-1">PepeCoin (PEPE)</p>
                  <p className="text-white/80">Meme Magic: 80% boost to ALL stats (speed, jumping, kicking, ball control)</p>
                </div>
              </div>
            </div>
            
            <div className="manual-section">
              <h3 className="text-yellow-400 mb-3">Basic Rules</h3>
              <ul className="list-disc pl-4 space-y-1 text-white/80">
                <li>Matches last 3 minutes</li>
                <li>Player with most goals at the end wins</li>
                <li>If tied at the end of regulation time, the game ends in a draw</li>
                <li>Power-ups appear randomly on the field</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MainMenu;
