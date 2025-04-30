import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type GameState = 'menu' | 'character_select' | 'playing' | 'game_over';

interface GameStateStore {
  // Game state
  gameState: GameState;
  playerName: string;
  playerScore: number;
  aiScore: number;
  gameTime: number;
  timerInterval: NodeJS.Timeout | null;
  
  // Actions
  setGameState: (state: GameState) => void;
  setPlayerName: (name: string) => void;
  incrementPlayerScore: () => void;
  incrementAIScore: () => void;
  startTimer: () => void;
  stopTimer: () => void;
  resetGame: () => void;
}

export const useGameState = create<GameStateStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    gameState: 'menu',
    playerName: 'Player',
    playerScore: 0,
    aiScore: 0,
    gameTime: 0,
    timerInterval: null,
    
    // Actions
    setGameState: (state) => set({ gameState: state }),
    
    setPlayerName: (name) => set({ playerName: name }),
    
    incrementPlayerScore: () => set((state) => ({ 
      playerScore: state.playerScore + 1 
    })),
    
    incrementAIScore: () => set((state) => ({ 
      aiScore: state.aiScore + 1 
    })),
    
    startTimer: () => {
      const { timerInterval } = get();
      
      // Clear any existing timer
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      
      // Create new timer that updates every second
      const interval = setInterval(() => {
        const { gameTime, gameState } = get();
        
        // Check if game time has reached 3 minutes (180 seconds)
        if (gameTime >= 180) {
          set({ gameState: 'game_over' });
          clearInterval(interval);
          return;
        }
        
        // Only increment time if game is in playing state
        if (gameState === 'playing') {
          set({ gameTime: gameTime + 1 });
        }
      }, 1000);
      
      set({ timerInterval: interval });
    },
    
    stopTimer: () => {
      const { timerInterval } = get();
      if (timerInterval) {
        clearInterval(timerInterval);
        set({ timerInterval: null });
      }
    },
    
    resetGame: () => {
      const { timerInterval } = get();
      
      // Clear timer
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      
      // Reset game state
      set({
        playerScore: 0,
        aiScore: 0,
        gameTime: 0,
        timerInterval: null
      });
    }
  }))
);
