import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { usePhysics } from "./usePhysics";

export type GameState = 'menu' | 'character_select' | 'playing' | 'game_over' | 'multiplayer_lobby';

interface GameStateStore {
  // Game state
  gameState: GameState;
  playerName: string;
  playerScore: number;
  aiScore: number;
  gameTime: number;
  timerInterval: NodeJS.Timeout | null;

  // Multiplayer state
  isMultiplayer: boolean;
  opponentName: string;
  opponentScore: number;

  // Actions
  setGameState: (state: GameState) => void;
  setPlayerName: (name: string) => void;
  incrementPlayerScore: () => void;
  incrementAIScore: () => void;
  startTimer: () => void;
  stopTimer: () => void;
  resetGame: () => void;

  // Multiplayer actions
  setMultiplayerMode: (isMultiplayer: boolean) => void;
  setOpponentName: (name: string) => void;
  incrementOpponentScore: () => void;
  resetScores: () => void;
}

export const useGameState = create<GameStateStore>()(
  subscribeWithSelector((set, get) => {
    let timerInterval: NodeJS.Timeout | null = null;

    return {
      // Initial state
      gameState: 'menu',
      playerName: 'Player',
      playerScore: 0,
      aiScore: 0,
      gameTime: 0,
      timerInterval: null,

      // Multiplayer initial state
      isMultiplayer: false,
      opponentName: '',
      opponentScore: 0,

      // Actions
      setGameState: (state) => set({ gameState: state }),

      setPlayerName: (name) => set({ playerName: name }),

      incrementPlayerScore: () => {
        set((state) => ({ playerScore: state.playerScore + 1 }));

        const { playerScore, aiScore, opponentScore, isMultiplayer } = get();
        const opponentTotal = isMultiplayer ? opponentScore : aiScore;

        if (playerScore + 1 >= 5) {
          set({ gameState: 'game_over' });
          if (timerInterval) clearInterval(timerInterval);
          console.log("🏆 Player wins the game!");
        }
      },

      incrementAIScore: () => {
        set((state) => ({ aiScore: state.aiScore + 1 }));

        const { aiScore } = get();

        if (aiScore + 1 >= 5) {
          set({ gameState: 'game_over' });
          if (timerInterval) clearInterval(timerInterval);
          console.log("🤖 AI wins the game!");
        }
      },

      incrementOpponentScore: () => {
        set((state) => ({ opponentScore: state.opponentScore + 1 }));

        const { opponentScore } = get();

        if (opponentScore + 1 >= 5) {
          set({ gameState: 'game_over' });
          if (timerInterval) clearInterval(timerInterval);
          console.log("👤 Opponent wins the game!");
        }
      },

      resetScores: () => set({ playerScore: 0, aiScore: 0, opponentScore: 0 }),

      startTimer: () => {
        if (timerInterval) {
          clearInterval(timerInterval);
        }

        timerInterval = setInterval(() => {
          set((state) => ({ gameTime: state.gameTime + 1 }));
        }, 1000);
      },

      stopTimer: () => {
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
      },

      resetGame: () => {
        console.log("🔄 Resetting game state...");

        set({
          playerScore: 0,
          aiScore: 0,
          opponentScore: 0,
          gameTime: 0,
        });

        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }

        const currentState = get().gameState;
        if (currentState === 'playing' || currentState === 'game_over') {
          set({ gameState: 'playing' });

          timerInterval = setInterval(() => {
            set((state) => ({ gameTime: state.gameTime + 1 }));
          }, 1000);
        }

        const { getBody } = usePhysics.getState();

        const ballBody = getBody('ball');
        if (ballBody) {
          ballBody.position.set(0, 1, 0);
          ballBody.velocity.set(0, 0, 0);
          ballBody.angularVelocity.set(0, 0, 0);
        }

        const playerBody = getBody('player_character');
        if (playerBody) {
          playerBody.position.set(0, 1, 8);
          playerBody.velocity.set(0, 0, 0);
          playerBody.angularVelocity.set(0, 0, 0);
        }

        const aiBody = getBody('ai_character');
        if (aiBody) {
          aiBody.position.set(0, 1, -8);
          aiBody.velocity.set(0, 0, 0);
          aiBody.angularVelocity.set(0, 0, 0);
        }

        console.log("🎮 Game has been reset and positions restored");
      },

      setMultiplayerMode: (isMultiplayer) => set({ isMultiplayer }),

      setOpponentName: (name) => set({ opponentName: name }),
    };
  })
);

export default useGameState;