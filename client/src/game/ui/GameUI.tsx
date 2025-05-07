import { useEffect, useState, useRef } from 'react';
import { useGameState } from '@/lib/stores/useGameState';
import { useCharacter } from '@/lib/stores/useCharacter';
import { useAudio } from '@/lib/stores/useAudio';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trophy, VolumeX, Volume2, TrendingUp, Coins, Zap, ArrowUp, RefreshCw } from 'lucide-react';
import { characterData } from '../models/character';
import { AbilityType } from '../components/Abilities';
import websocketService from '@/lib/multiplayer/websocketService';

// Crypto-themed puns and memes for random display
const CRYPTO_PUNS = [
  "HODL the ball! 💎🙌",
  "To the moon! 🚀🌕",
  "Buy the dip! 📉📈",
  "When lambo? 🏎️",
  "Not your keys, not your goal! 🔑⚽",
  "This is the way! 🔄",
  "Much wow! Such goal! 🐕",
  "We're all gonna make it! 🎯",
  "Stake it till you make it! 🥩",
  "Diamond feet! 💎👟",
  "Pump it! 📈",
  "NO FUD allowed on the field! 🚫",
  "Proof of Score! ⚽✅"
];

const GameUI = () => {
  const { 
    gameState, 
    setGameState, 
    playerScore, 
    aiScore, 
    opponentScore,
    gameTime, 
    resetGame,
    startTimer,
    stopTimer,
    isMultiplayer,
    opponentName,
    playerName
  } = useGameState();
  
  const { selectedCharacter, cooldownRemaining, isAbilityActive } = useCharacter();
  const { toggleMute, isMuted, playHit, playSuccess } = useAudio();
  const [showGameOver, setShowGameOver] = useState(false);
  
  // Active crypto ability states for UI display
  const [activeAbilityType, setActiveAbilityType] = useState<AbilityType | null>(null);
  const [abilityTimeRemaining, setAbilityTimeRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Crypto pun notification system
  const [currentPun, setCurrentPun] = useState<string>("");
  const [showPun, setShowPun] = useState(false);
  const lastScoreRef = useRef({ player: 0, ai: 0 });
  const punTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Calculate ability cooldown percentage
  const cooldownPercentage = Math.max(0, Math.min(100, (cooldownRemaining / 15) * 100));
  
  // Get character info
  const character = characterData[selectedCharacter];
  
  // Start the game timer on mount
  useEffect(() => {
    if (gameState === 'playing') {
      startTimer();
    }
    
    return () => {
      stopTimer();
    };
  }, [gameState, startTimer, stopTimer]);
  
  // Show game over dialog when game ends
  useEffect(() => {
    if (gameState === 'game_over') {
      setShowGameOver(true);
    } else {
      setShowGameOver(false);
    }
  }, [gameState]);
  
  // Listen for ability collection events
  useEffect(() => {
    const handleAbilityCollected = (event: Event) => {
      const customEvent = event as CustomEvent<{type: AbilityType, data: any}>;
      const abilityType = customEvent.detail.type;
      const abilityData = customEvent.detail.data;
      
      // Update UI with active ability info
      setActiveAbilityType(abilityType);
      setAbilityTimeRemaining(abilityData.duration);
      
      // Set a timer to clear the ability UI when it expires
      const timer = setTimeout(() => {
        setActiveAbilityType(null);
        setAbilityTimeRemaining(0);
      }, abilityData.duration * 1000);
      
      return () => clearTimeout(timer);
    };
    
    window.addEventListener('ability-collected', handleAbilityCollected);
    
    return () => {
      window.removeEventListener('ability-collected', handleAbilityCollected);
    };
  }, []);
  
  // Display random crypto puns on scoring
  useEffect(() => {
    // Check if a score changed
    if (gameState === 'playing' && 
        (playerScore !== lastScoreRef.current.player || aiScore !== lastScoreRef.current.ai)) {
      
      // Display a random pun
      const randomPun = CRYPTO_PUNS[Math.floor(Math.random() * CRYPTO_PUNS.length)];
      setCurrentPun(randomPun);
      setShowPun(true);
      
      // Play success sound
      playSuccess();
      
      // Clear any existing timeout
      if (punTimeoutRef.current) {
        clearTimeout(punTimeoutRef.current);
      }
      
      // Hide pun after 3 seconds
      punTimeoutRef.current = setTimeout(() => {
        setShowPun(false);
      }, 3000);
      
      // Update last score reference
      lastScoreRef.current = { player: playerScore, ai: aiScore };
    }
    
    // Clean up timeout on unmount
    return () => {
      if (punTimeoutRef.current) {
        clearTimeout(punTimeoutRef.current);
      }
    };
  }, [playerScore, aiScore, gameState, playSuccess]);
  
  // Handle restart game
  const handleRestart = () => {
    resetGame();
    // Go to character select for single-player, or multiplayer lobby for multiplayer
    setGameState(isMultiplayer ? 'multiplayer_lobby' : 'character_select');
    setShowGameOver(false);
  };
  
  // Request a game restart in multiplayer mode
  const handleRequestRestart = () => {
    if (!isMultiplayer) return;
    
    // Clean up any existing listeners first to avoid duplicates
    websocketService.off('game-restart', () => {});
    websocketService.off('error', () => {});
    
    // Send restart request to server
    websocketService.requestRestart();
    
    // Show a requesting state
    setError('Rematch requested... Waiting for response...');
    
    // Set up a timeout to clear the message after 5 seconds
    const errorTimeout = setTimeout(() => {
      setError(null);
    }, 5000);
    
    // Set up listener for server response
    websocketService.on('game-restart', (message: { type: string, data: any }) => {
      console.log('Game restart message received:', message);
      
      // Clear any error message
      clearTimeout(errorTimeout);
      setError(`${message.data.requestedBy || 'Opponent'} requested restart. Returning to lobby...`);
      
      // After a brief delay, reset the game and go to lobby
      setTimeout(() => {
        resetGame();
        setGameState('multiplayer_lobby');
        setShowGameOver(false);
        setError(null);
      }, 2000);
      
      // Remove listener to avoid duplicates
      websocketService.off('game-restart', () => {});
    });
    
    // Set up error listener
    websocketService.on('error', (message: { type: string, data: any }) => {
      clearTimeout(errorTimeout);
      setError(`Error: ${message.data.message || 'Could not restart game'}`);
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
      
      // Remove listener
      websocketService.off('error', () => {});
    });
  };
  
  // Handle return to menu
  const handleMenu = () => {
    // Disconnect WebSocket if in multiplayer mode
    if (isMultiplayer) {
      websocketService.disconnect();
    }
    
    resetGame();
    setGameState('menu');
    setShowGameOver(false);
  };
  
  return (
    <>
      {/* Game UI overlay */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Score and timer bar */}
        <div className="fixed top-0 inset-x-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center gap-4">
            <div className="bg-black/50 backdrop-blur-sm py-1 px-3 rounded-md text-white font-bold">
              {playerName || 'Player'}: {playerScore}
            </div>
            <div className="bg-black/50 backdrop-blur-sm py-1 px-3 rounded-md text-white font-bold">
              {isMultiplayer ? (opponentName || 'Opponent') : 'AI'}: {isMultiplayer ? opponentScore : aiScore}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="bg-black/50 backdrop-blur-sm py-1 px-3 rounded-md text-white font-bold">
              {formatTime(180 - gameTime)} {/* 3-minute timer */}
            </div>
            
            {/* Restart button for multiplayer games */}
            {isMultiplayer && (
              <Button 
                variant="ghost" 
                size="sm"
                className="bg-black/40 text-white rounded-md pointer-events-auto flex items-center gap-1"
                onClick={handleRequestRestart}
              >
                <RefreshCw size={14} />
                <span className="text-xs">Restart</span>
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="icon"
              className="bg-black/40 text-white rounded-full pointer-events-auto"
              onClick={toggleMute}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </Button>
          </div>
        </div>
        
        {/* Crypto Pun Notification */}
        {showPun && (
          <div className="fixed top-1/4 inset-x-0 flex justify-center items-center">
            <div className="bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 text-black font-bold py-3 px-6 rounded-lg text-xl animate-bounce shadow-lg flex items-center gap-2">
              <Coins className="h-6 w-6" />
              {currentPun}
            </div>
          </div>
        )}
        
        {/* Error/Status Notification */}
        {error && (
          <div className="fixed top-1/3 inset-x-0 flex justify-center items-center">
            <div className="bg-black/80 text-white font-medium py-2 px-4 rounded-md shadow-lg flex items-center gap-2 z-50">
              <RefreshCw className="h-4 w-4 animate-spin" />
              {error}
            </div>
          </div>
        )}
        
        {/* Active Ability Display */}
        {activeAbilityType && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full shadow-lg animate-pulse"
            style={{ 
              backgroundColor: activeAbilityType === 'bitcoin' ? 'rgba(247, 147, 26, 0.9)' : 
                              activeAbilityType === 'ethereum' ? 'rgba(98, 126, 234, 0.9)' : 
                              'rgba(195, 166, 52, 0.9)'
            }}>
            <div className="flex items-center gap-2">
              {activeAbilityType === 'bitcoin' && (
                <>
                  <Zap className="h-4 w-4 text-white" />
                  <span className="font-bold text-white">Bitcoin Boost Active!</span>
                </>
              )}
              {activeAbilityType === 'ethereum' && (
                <>
                  <ArrowUp className="h-4 w-4 text-white" />
                  <span className="font-bold text-white">Ethereum Jump Active!</span>
                </>
              )}
              {activeAbilityType === 'dogecoin' && (
                <>
                  <Zap className="h-4 w-4 text-white" />
                  <span className="font-bold text-white">Dogecoin Dash Active!</span>
                </>
              )}
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full text-white">
                {abilityTimeRemaining.toFixed(1)}s
              </span>
            </div>
          </div>
        )}
        
        {/* Crypto Ability info */}
        <div className="fixed bottom-24 right-4 p-2 bg-black/50 backdrop-blur-sm rounded-md">
          <div className="text-white text-sm mb-1 flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-yellow-400" />
            {character.abilityName}
          </div>
          
          <div className="relative h-2 w-32 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-yellow-500 transition-all duration-300"
              style={{ width: `${100 - cooldownPercentage}%` }}
            />
          </div>
          
          <div className="text-white text-xs mt-1">
            {cooldownRemaining > 0 
              ? `Cooldown: ${cooldownRemaining.toFixed(1)}s` 
              : 'Ready (Press E / Ability button)'}
          </div>
        </div>
      </div>
      
      {/* Game over dialog */}
      <Dialog open={showGameOver} onOpenChange={setShowGameOver}>
        <DialogContent className="game-panel sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="game-title text-center text-2xl text-yellow-400 flex items-center justify-center gap-2 pixel-pulse">
              <Trophy className="h-6 w-6 text-yellow-500" />
              Game Over
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6">
            <div className="text-center mb-6">
              <div className="text-xl mb-2 pixel-font text-yellow-300">Final Score</div>
              <div className="flex justify-center items-center gap-4 sm:gap-8">
                <div className="bg-black/60 p-2 sm:p-3 rounded-md border-2 border-yellow-500">
                  <div className="text-sm sm:text-lg font-bold pixel-font text-blue-300">
                    {playerName && playerName !== 'Player' ? playerName : 'You'}
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold game-title text-white">{playerScore}</div>
                </div>
                <div className="text-lg sm:text-xl pixel-font text-yellow-400">vs</div>
                <div className="bg-black/60 p-2 sm:p-3 rounded-md border-2 border-red-500">
                  <div className="text-sm sm:text-lg font-bold pixel-font text-red-300">
                    {isMultiplayer ? 
                      (opponentName && opponentName !== 'Player' ? opponentName : 'Opponent') : 
                      'AI'}
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold game-title text-white">{isMultiplayer ? opponentScore : aiScore}</div>
                </div>
              </div>
              
              <div className="mt-6 text-base sm:text-lg pixel-font">
                {isMultiplayer ? (
                  playerScore > opponentScore ? (
                    <span className="text-green-400 font-bold pixel-pulse">You win! TO THE MOON! 🚀🌕</span>
                  ) : playerScore < opponentScore ? (
                    <span className="text-red-400 font-bold">You lose! BEAR MARKET DETECTED 📉</span>
                  ) : (
                    <span className="text-yellow-400 font-bold">It's a tie! HODL FOR NEXT MATCH! 💎🙌</span>
                  )
                ) : (
                  playerScore > aiScore ? (
                    <span className="text-green-400 font-bold pixel-pulse">You win! TO THE MOON! 🚀🌕</span>
                  ) : playerScore < aiScore ? (
                    <span className="text-red-400 font-bold">You lose! BEAR MARKET DETECTED 📉</span>
                  ) : (
                    <span className="text-yellow-400 font-bold">It's a tie! HODL FOR NEXT MATCH! 💎🙌</span>
                  )
                )}
              </div>
              
              <div className="mt-3 text-xs sm:text-sm text-white/80 font-medium pixel-font">
                {isMultiplayer ? (
                  playerScore > opponentScore ? 
                    `Congratulations! You defeated ${opponentName && opponentName !== 'Player' ? opponentName : 'your opponent'} with your crypto soccer skills!` :
                    playerScore < opponentScore ? 
                    `${opponentName && opponentName !== 'Player' ? opponentName : 'Your opponent'} won this time. Just HODL and try again!` :
                    "It's a stalemate! Both crypto traders evenly matched!"
                ) : (
                  playerScore > aiScore ? 
                    "Your crypto soccer skills are bullish! Perfect diamond feet strategy!" :
                    playerScore < aiScore ? 
                    "Don't panic sell! Just practice and buy the dip next match!" :
                    "Staked your coins but no yield this time. Keep HODLing!"
                )}
              </div>

              {/* Animated celebration coins for winners */}
              {((isMultiplayer && playerScore > opponentScore) || (!isMultiplayer && playerScore > aiScore)) && (
                <div className="mt-4 relative h-12">
                  {[...Array(10)].map((_, i) => (
                    <div 
                      key={i} 
                      className="absolute w-6 h-6 rounded-full animate-float"
                      style={{
                        backgroundColor: i % 3 === 0 ? '#f7931a' : i % 3 === 1 ? '#627eea' : '#c3a634',
                        left: `${10 + (i * 8)}%`,
                        top: i % 2 === 0 ? '0%' : '50%',
                        animationDelay: `${i * 0.2}s`,
                        animationDuration: `${2 + (i % 3)}s`
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* Button container with responsive layout */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-4">
              {isMultiplayer ? (
                <>
                  <Button 
                    onClick={handleRequestRestart}
                    className="game-button py-3 sm:py-5"
                    variant="default"
                  >
                    <span className="pixel-font text-xs sm:text-sm text-blue-500">Request Rematch</span>
                  </Button>
                  
                  <Button 
                    onClick={handleRestart}
                    className="game-button py-3 sm:py-5"
                    variant="secondary"
                  >
                    <span className="pixel-font text-xs sm:text-sm text-blue-500">New Match</span>
                  </Button>
                  
                  <Button 
                    onClick={handleMenu}
                    className="game-button py-3 sm:py-5"
                    variant="outline"
                  >
                    <span className="pixel-font text-xs sm:text-sm text-blue-500">Main Menu</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={handleRestart}
                    className="game-button py-3 sm:py-5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                    variant="default"
                  >
                    <span className="pixel-font text-xs sm:text-sm text-blue-500">Play Again</span>
                  </Button>
                  
                  <Button 
                    onClick={handleMenu}
                    className="game-button py-3 sm:py-5"
                    variant="outline"
                  >
                    <span className="pixel-font text-xs sm:text-sm text-blue-500">Main Menu</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GameUI;
