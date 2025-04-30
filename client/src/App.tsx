import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { KeyboardControls } from "@react-three/drei";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAudio } from "./lib/stores/useAudio";
import { useGameState } from "./lib/stores/useGameState";
import MainMenu from "./game/screens/MainMenu";
import CharacterSelect from "./game/screens/CharacterSelect";
import GameScreen from "./game/screens/GameScreen";
import LoadingScreen from "./game/screens/LoadingScreen";
import MultiplayerLobby from "./game/screens/MultiplayerLobby";
import AuthProvider from "./auth/AuthProvider";
import AuthCallback from "./auth/AuthCallback";
import "@fontsource/inter";

// Define control keys for the game
const controls = [
  { name: "forward", keys: ["KeyW", "ArrowUp"] },
  { name: "backward", keys: ["KeyS", "ArrowDown"] },
  { name: "left", keys: ["KeyA", "ArrowLeft"] },
  { name: "right", keys: ["KeyD", "ArrowRight"] },
  { name: "jump", keys: ["KeyW", "ArrowUp"] },
  { name: "shiftJump", keys: ["ShiftLeft", "ShiftRight"] },
  { name: "kick", keys: ["Space"] },
  { name: "ability", keys: ["KeyE"] },
  { name: "restart", keys: ["KeyR"] },
];

// Game container component that handles the core game UI
const GameContainer = () => {
  const { gameState } = useGameState();
  const [showCanvas, setShowCanvas] = useState(false);
  const { setBackgroundMusic } = useAudio();

  // Load background music
  useEffect(() => {
    const bgMusic = new Audio("/sounds/background2.mp3");
    bgMusic.loop = true;
    bgMusic.volume = 0.3;
    setBackgroundMusic(bgMusic);
    setShowCanvas(true);
  }, [setBackgroundMusic]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {!showCanvas && <LoadingScreen />}
      
      {showCanvas && (
        <KeyboardControls map={controls}>
          {gameState === 'menu' && <MainMenu />}
          
          {gameState === 'character_select' && <CharacterSelect />}
          
          {gameState === 'multiplayer_lobby' && <MultiplayerLobby />}
          
          {(gameState === 'playing' || gameState === 'game_over') && (
            <GameScreen />
          )}
        </KeyboardControls>
      )}
    </div>
  );
};

// Main App component
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Auth callback route */}
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          {/* Main game routes */}
          <Route path="/" element={<GameContainer />} />
          
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
