import { useEffect, useState, useRef } from 'react';
import { useGameState } from '@/lib/stores/useGameState';
import { useCharacter } from '@/lib/stores/useCharacter';
import { useAudio } from '@/lib/stores/useAudio';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trophy, VolumeX, Volume2, TrendingUp, Coins } from 'lucide-react';
import { characterData } from '../models/character';

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
    gameTime, 
    resetGame,
    startTimer,
    stopTimer,
  } = useGameState();
  
  const { selectedCharacter, cooldownRemaining } = useCharacter();
  const { toggleMute, isMuted, playHit, playSuccess } = useAudio();
  const [showGameOver, setShowGameOver] = useState(false);
  
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
    setGameState('character_select');
    setShowGameOver(false);
  };
  
  // Handle return to menu
  const handleMenu = () => {
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
              Player: {playerScore}
            </div>
            <div className="bg-black/50 backdrop-blur-sm py-1 px-3 rounded-md text-white font-bold">
              AI: {aiScore}
            </div>
          </div>
          
          <div className="bg-black/50 backdrop-blur-sm py-1 px-3 rounded-md text-white font-bold">
            {formatTime(180 - gameTime)} {/* 3-minute timer */}
          </div>
          
          <Button 
            variant="ghost" 
            size="icon"
            className="bg-black/40 text-white rounded-full pointer-events-auto"
            onClick={toggleMute}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </Button>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl flex items-center justify-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              Game Over
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6">
            <div className="text-center mb-6">
              <div className="text-xl mb-2">Final Score</div>
              <div className="flex justify-center items-center gap-8">
                <div>
                  <div className="text-lg font-bold">Player</div>
                  <div className="text-3xl font-bold">{playerScore}</div>
                </div>
                <div className="text-xl">vs</div>
                <div>
                  <div className="text-lg font-bold">AI</div>
                  <div className="text-3xl font-bold">{aiScore}</div>
                </div>
              </div>
              
              <div className="mt-4 text-lg">
                {playerScore > aiScore ? (
                  <span className="text-green-500 font-bold">You win! TO THE MOON! 🚀🌕</span>
                ) : playerScore < aiScore ? (
                  <span className="text-red-500 font-bold">You lose! BEAR MARKET DETECTED 📉</span>
                ) : (
                  <span className="text-yellow-500 font-bold">It's a tie! HODL FOR NEXT MATCH! 💎🙌</span>
                )}
              </div>
              
              <div className="mt-2 text-sm text-gray-500 font-medium">
                {playerScore > aiScore ? 
                  "Your crypto soccer skills are bullish! Perfect diamond feet strategy!" :
                  playerScore < aiScore ? 
                  "Don't panic sell! Just practice and buy the dip next match!" :
                  "Staked your coins but no yield this time. Keep HODLing!"}
              </div>
            </div>
            
            <div className="flex gap-4">
              <Button 
                onClick={handleRestart}
                className="flex-1"
                variant="default"
              >
                Play Again
              </Button>
              
              <Button 
                onClick={handleMenu}
                className="flex-1"
                variant="outline"
              >
                Main Menu
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GameUI;
