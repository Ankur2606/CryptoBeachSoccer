import { useEffect, useRef } from 'react';
import { useGameState } from '@/lib/stores/useGameState';
import { useAudio } from '@/lib/stores/useAudio';
import websocketService from '@/lib/multiplayer/websocketService';

// Multiplayer controller to synchronize game state between players
const MultiplayerController = () => {
  const { 
    playerScore,
    opponentScore,
    incrementPlayerScore,
    incrementOpponentScore,
    isMultiplayer,
    playerName,
    opponentName
  } = useGameState();
  
  const { playSuccess } = useAudio();
  
  // Refs to track previous scores to detect changes
  const prevPlayerScore = useRef(0);
  const prevOpponentScore = useRef(0);
  
  // Set up WebSocket connection and message handlers
  useEffect(() => {
    // Only run this in multiplayer mode
    if (!isMultiplayer) return;
    
    console.log('Setting up multiplayer controller');
    
    // Connect to WebSocket server if not already connected
    if (!websocketService.isConnected) {
      websocketService.connect().catch(error => {
        console.error('Failed to connect to WebSocket server:', error);
      });
    }
    
    // Set up listener for game updates
    const handleGameUpdate = (message: any) => {
      const { type, data } = message;
      
      switch (data.updateType) {
        case 'score':
          // Update opponent's score
          if (data.score !== opponentScore) {
            incrementOpponentScore();
            playSuccess();
          }
          break;
          
        case 'position':
          // For future implementation: Update opponent position
          break;
          
        case 'ability':
          // For future implementation: Show opponent ability usage
          break;
      }
    };
    
    // Register event handler
    websocketService.on('game-update', handleGameUpdate);
    
    // Clean up handler when component unmounts
    return () => {
      websocketService.off('game-update', handleGameUpdate);
    };
  }, [isMultiplayer, incrementOpponentScore, opponentScore, playSuccess]);
  
  // Send player score updates when they change
  useEffect(() => {
    if (!isMultiplayer || playerScore === prevPlayerScore.current) return;
    
    // Send score update to other player
    websocketService.sendGameUpdate({
      updateType: 'score',
      score: playerScore
    });
    
    // Update previous score ref
    prevPlayerScore.current = playerScore;
  }, [isMultiplayer, playerScore]);
  
  // Invisible component - just handles logic
  return null;
};

export default MultiplayerController;