import { useState, useEffect, useRef } from 'react';
import { useGameState } from '@/lib/stores/useGameState';
import { useAudio } from '@/lib/stores/useAudio';
import { useCharacter } from '@/lib/stores/useCharacter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Coins, Users, Trophy, ChevronLeft, Loader2, RefreshCw, ArrowLeft, ArrowRight } from 'lucide-react';
import websocketService from '@/lib/multiplayer/websocketService';
import { characterData } from '../models/character';

const MultiplayerLobby = () => {
  const { gameState, setGameState } = useGameState();
  const { playSuccess } = useAudio();
  const { setSelectedCharacter } = useCharacter();
  
  // State variables
  const [activeTab, setActiveTab] = useState<string>('host');
  const [playerName, setPlayerName] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');
  const [roomToJoin, setRoomToJoin] = useState<string>('');
  const [peerName, setPeerName] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isPeerReady, setIsPeerReady] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [isGameStarting, setIsGameStarting] = useState<boolean>(false);
  const [connectionAttempts, setConnectionAttempts] = useState<number>(0);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [showRestartButton, setShowRestartButton] = useState<boolean>(false);
  const [characterSelectVisible, setCharacterSelectVisible] = useState<boolean>(false);
  
  // Character selection state
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('bitcoin');
  const [peerCharacterId, setPeerCharacterId] = useState<string>('');
  const [currentCharacterIndex, setCurrentCharacterIndex] = useState<number>(0);
  
  // Get available character list
  const characters = Object.values(characterData);
  
  // Refs for timeouts
  const joinTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize WebSocket connection
  useEffect(() => {
    const connectToServer = async () => {
      try {
        setIsConnecting(true);
        const success = await websocketService.connect();
        
        if (success) {
          setError('');
          console.log('Successfully connected to multiplayer server');
          
          // If we're already in a game, show restart option
          if (gameState === 'playing' && websocketService.roomId) {
            setShowRestartButton(true);
            setRoomCode(websocketService.roomId);
            setPeerName(websocketService.peerName || '');
            if (websocketService.selectedCharacter) {
              setSelectedCharacterId(websocketService.selectedCharacter);
              setCharacterFromId(websocketService.selectedCharacter);
            }
            if (websocketService.peerCharacter) {
              setPeerCharacterId(websocketService.peerCharacter);
            }
          }
        } else {
          setError('Failed to connect to multiplayer server. Retrying...');
          console.error('Connection failed, will retry');
          
          // Try again after a short delay (2 seconds)
          setTimeout(() => {
            connectToServer();
          }, 2000);
        }
      } catch (err) {
        setError('Failed to connect to multiplayer server. Retrying...');
        console.error('Connection error:', err);
        
        // Try again after a short delay (2 seconds)
        setTimeout(() => {
          connectToServer();
        }, 2000);
      } finally {
        setIsConnecting(false);
      }
    };
    
    // Make an API call to check if the WebSocket server is available
    fetch('/api/websocket-status')
      .then(res => res.json())
      .then(data => {
        console.log('WebSocket server status:', data);
        connectToServer();
      })
      .catch(err => {
        console.error('Error checking WebSocket status:', err);
        connectToServer();
      });
    
    // Set up message handlers
    websocketService.on('room-created', (message) => {
      setRoomCode(message.data.roomId);
      playSuccess();
      setError(''); // Clear any existing errors
      
      // Show character select after room creation
      setCharacterSelectVisible(true);
    });
    
    websocketService.on('error', (message) => {
      setError(message.data.message);
      setIsJoining(false);
      
      // If we get a "room is full" error but we were trying to rejoin our own room
      if (message.data.message === 'Room is full' && isReconnecting) {
        setError('Connection issue: Unable to rejoin room. Try creating a new room.');
        setIsReconnecting(false);
      }
    });
    
    websocketService.on('join-timeout', () => {
      setIsJoining(false);
      setError('Joining timed out. Please try again with a valid room code.');
    });
    
    websocketService.on('player-joined', (message) => {
      setPeerName(message.data.guest);
      setIsPeerReady(false); // Reset peer ready state when they join
      
      // If peer already has character selected from previous session
      if (message.data.characterSelected) {
        setPeerCharacterId(message.data.characterSelected);
      }
      
      playSuccess();
      setError(''); // Clear any existing errors
      
      // Show character select after someone joins
      setCharacterSelectVisible(true);
    });
    
    websocketService.on('character-selected', (message) => {
      // Update peer's character selection
      setPeerCharacterId(message.data.character);
      playSuccess();
    });
    
    websocketService.on('character-selection-confirmed', (message) => {
      // Your character selection was confirmed by the server
      if (message.data.success) {
        setSelectedCharacterId(message.data.character);
        // Update the character in the store
        setCharacterFromId(message.data.character);
        playSuccess();
      }
    });
    
    websocketService.on('player-ready-update', (message) => {
      setIsPeerReady(true);
      playSuccess();
      
      // Update ready states based on comprehensive info from server
      if (message.data.hostReady !== undefined && message.data.guestReady !== undefined) {
        if (websocketService.isHost) {
          setIsReady(message.data.hostReady);
          setIsPeerReady(message.data.guestReady);
        } else {
          setIsPeerReady(message.data.hostReady);
          setIsReady(message.data.guestReady);
        }
      }
    });
    
    websocketService.on('ready-acknowledged', (message) => {
      // Update ready states based on comprehensive info from server
      if (message.data.hostReady !== undefined && message.data.guestReady !== undefined) {
        if (websocketService.isHost) {
          setIsReady(message.data.hostReady);
          setIsPeerReady(message.data.guestReady);
        } else {
          setIsPeerReady(message.data.hostReady);
          setIsReady(message.data.guestReady);
        }
      }
    });
    
    websocketService.on('game-start', (message) => {
      // Start the multiplayer game
      setIsGameStarting(true);
      
      // Update characters in store
      if (websocketService.isHost) {
        setCharacterFromId(websocketService.selectedCharacter || selectedCharacterId);
      } else {
        setCharacterFromId(websocketService.selectedCharacter || selectedCharacterId);
      }
      
      // Give a brief delay to show the starting state
      setTimeout(() => {
        setGameState('playing');
      }, 1000);
    });
    
    websocketService.on('room-joined', (message) => {
      setRoomCode(message.data.roomId);
      setPeerName(message.data.host);
      setIsJoining(false);
      setIsPeerReady(false); // Reset host ready state when we join
      
      // If host already has character selected
      if (message.data.characterSelected) {
        setPeerCharacterId(message.data.characterSelected);
      }
      
      playSuccess();
      setError(''); // Clear any existing errors
      
      // Show character select after joining
      setCharacterSelectVisible(true);
    });
    
    websocketService.on('player-left', () => {
      setPeerName('');
      setIsPeerReady(false);
      setPeerCharacterId('');
      setError('Other player left the game');
    });
    
    websocketService.on('game-reset', (message) => {
      // Reset ready states
      setIsReady(false);
      setIsPeerReady(false);
      
      // Show notification that game is being restarted
      setError('');
      
      // Update peer name if needed
      if (websocketService.isHost) {
        setPeerName(message.data.guestName);
      } else {
        setPeerName(message.data.hostName);
      }
      
      playSuccess();
      
      // Return to lobby for new match if currently in game
      if (gameState === 'playing') {
        setGameState('multiplayer_lobby');
      }
    });
    
    websocketService.on('game-restart', (message) => {
      // Reset ready states
      setIsReady(false);
      setIsPeerReady(false);
      
      // Show notification that game is being restarted
      setError('');
      
      // Update peer name if needed
      if (websocketService.isHost) {
        setPeerName(message.data.guestName);
      } else {
        setPeerName(message.data.hostName);
      }
      
      playSuccess();
      
      // Return to lobby for new match if currently in game
      if (gameState === 'playing') {
        setGameState('multiplayer_lobby');
      }
      
      // Show character select again
      setCharacterSelectVisible(true);
    });
    
    // Cleanup when unmounting
    return () => {
      // Remove all event handlers
      ['room-created', 'error', 'player-joined', 'player-ready-update', 
       'game-start', 'room-joined', 'player-left', 'ready-acknowledged',
       'game-restart', 'join-timeout', 'character-selected', 
       'character-selection-confirmed', 'game-reset'].forEach(type => {
        websocketService.off(type, () => {});
      });
      
      // Clear any active timeouts
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
        joinTimeoutRef.current = null;
      }
    };
  }, [setGameState, playSuccess, gameState, isReconnecting, setSelectedCharacter, selectedCharacterId]);
  
  // Helper function to update character in store from ID
  const setCharacterFromId = (characterId: string | null) => {
    if (characterId) {
      setSelectedCharacter(characterId);
    }
  };
  
  // Set player name
  const handleSetName = () => {
    if (playerName.trim()) {
      websocketService.setPlayerName(playerName.trim());
    }
  };
  
  // Create a new game room
  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      setError('Please enter your name first');
      return;
    }
    
    handleSetName();
    websocketService.createRoom();
  };
  
  // Join an existing game room
  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      setError('Please enter your name first');
      return;
    }
    
    if (!roomToJoin.trim()) {
      setError('Please enter a room code');
      return;
    }
    
    // Clear any existing join timeout
    if (joinTimeoutRef.current) {
      clearTimeout(joinTimeoutRef.current);
      joinTimeoutRef.current = null;
    }
    
    setIsJoining(true);
    setError('');
    handleSetName();
    websocketService.joinRoom(roomToJoin.trim());
  };
  
  // Handle character selection
  const handleSelectCharacter = (characterId: string) => {
    setSelectedCharacterId(characterId);
    websocketService.selectCharacter(characterId);
  };
  
  // Navigate through character list
  const handlePrevCharacter = () => {
    const newIndex = currentCharacterIndex === 0 ? characters.length - 1 : currentCharacterIndex - 1;
    setCurrentCharacterIndex(newIndex);
    handleSelectCharacter(characters[newIndex].id);
  };
  
  const handleNextCharacter = () => {
    const newIndex = (currentCharacterIndex + 1) % characters.length;
    setCurrentCharacterIndex(newIndex);
    handleSelectCharacter(characters[newIndex].id);
  };
  
  // Set player as ready
  const handleReady = () => {
    if (!selectedCharacterId) {
      setError('Please select a character first');
      return;
    }
    
    setIsReady(true);
    websocketService.setReady();
  };
  
  // Request game restart
  const handleRestartGame = () => {
    websocketService.requestRestart();
  };
  
  // Manually attempt to reconnect to the WebSocket server
  const handleManualReconnect = async () => {
    setError('Attempting to reconnect...');
    setIsConnecting(true);
    setConnectionAttempts(prev => prev + 1);
    
    try {
      // First, disconnect if already connected
      websocketService.disconnect();
      
      // Try to connect again
      const success = await websocketService.connect();
      
      if (success) {
        setError('');
        console.log('Successfully reconnected to multiplayer server');
      } else {
        setError('Failed to reconnect. Please try again.');
      }
    } catch (err) {
      console.error('Manual reconnection error:', err);
      setError('Failed to reconnect. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Return to main menu
  const handleBackToMenu = () => {
    websocketService.disconnect();
    setGameState('menu');
  };
  
  // Determine if the restart button should be shown
  useEffect(() => {
    if (gameState === 'playing' && websocketService.roomId) {
      setShowRestartButton(true);
    } else {
      setShowRestartButton(false);
    }
  }, [gameState]);
  
  // If we're in the game but viewing the lobby, show restart option
  if (gameState === 'playing' && showRestartButton) {
    return (
      <div className="absolute top-0 right-0 p-4 z-50">
        <Card className="game-panel w-64">
          <CardHeader className="py-3">
            <CardTitle className="pixel-font text-sm font-medium text-yellow-400">Multiplayer Game</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <Button 
              onClick={handleRestartGame}
              className="game-button w-full flex items-center justify-center gap-2 pixel-font text-xs py-4"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4" />
              Restart Match
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Helper function to get character color
  const getCharacterColor = (id: string) => {
    switch (id) {
      case 'bitcoin':
        return 'bg-gradient-to-r from-orange-400 to-yellow-500';
      case 'ethereum':
        return 'bg-gradient-to-r from-blue-500 to-indigo-600';
      case 'dogecoin':
        return 'bg-gradient-to-r from-yellow-400 to-amber-500';
      case 'pepecoin':
        return 'bg-gradient-to-r from-green-400 to-emerald-500';
      case 'gigachad':
        return 'bg-gradient-to-r from-red-500 to-rose-600';
      case 'beachbaddy':
        return 'bg-gradient-to-r from-pink-400 to-fuchsia-500';
      default:
        return 'bg-gradient-to-r from-slate-500 to-gray-600';
    }
  };
  
  // Character select screen
  if (characterSelectVisible && roomCode && (websocketService.isHost || peerName)) {
    const currentCharacter = characters[currentCharacterIndex];
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-600 to-cyan-600 p-4">
        <Card className="game-panel w-full max-w-md">
          <CardHeader className="space-y-1 relative">
            <div className="flex justify-between items-center">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setCharacterSelectVisible(false)}
                className="flex items-center gap-1 text-white hover:bg-black/20"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="pixel-font text-xs">Back to Lobby</span>
              </Button>
              
              <div className="text-yellow-400 text-xs font-bold">
                Room: {roomCode}
              </div>
            </div>
            
            <CardTitle className="game-title text-2xl font-bold text-center text-yellow-400">
              Select Character
            </CardTitle>
            
            <CardDescription className="text-center text-white">
              {websocketService.isHost ? 'You are the Host' : 'You are the Guest'}
            </CardDescription>
            
            <div className="absolute top-0 right-0 mt-2 mr-2">
              {error && (
                <div className="p-2 bg-red-900/70 border border-red-500 text-red-100 rounded-md text-xs">
                  {error}
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="flex flex-col items-center">
            {/* Character selection */}
            <div className="flex items-center justify-center w-full mb-6">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handlePrevCharacter}
                className="text-white hover:bg-white/20"
                disabled={isReady}
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
              
              <div className="mx-4 flex-1 flex flex-col items-center">
                <div className="relative w-32 h-32 rounded-full bg-gradient-to-r from-gray-800/70 to-gray-900/70 flex items-center justify-center mb-4 border-4 border-white/30 overflow-hidden">
                  <div className={`w-24 h-24 rounded-full ${getCharacterColor(currentCharacter.id)}`}>
                    <div className="h-full w-full flex items-center justify-center">
                      {currentCharacter.id === 'bitcoin' && <div className="text-4xl">₿</div>}
                      {currentCharacter.id === 'ethereum' && <div className="text-4xl">Ξ</div>}
                      {currentCharacter.id === 'dogecoin' && <div className="text-4xl">Ð</div>}
                      {currentCharacter.id === 'pepecoin' && <div className="text-3xl">🐸</div>}
                      {currentCharacter.id === 'gigachad' && <div className="text-3xl">💪</div>}
                      {currentCharacter.id === 'beachbaddy' && <div className="text-3xl">💃</div>}
                    </div>
                  </div>
                </div>
                
                <h2 className="text-xl font-bold text-white mb-1">
                  {currentCharacter.name}
                </h2>
                
                <div className="bg-black/30 p-2 rounded-lg w-full">
                  <h3 className="text-yellow-400 font-bold text-sm mb-1">Special Ability:</h3>
                  <p className="text-white text-xs">
                    {currentCharacter.abilityName} - {currentCharacter.abilityDescription}
                  </p>
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleNextCharacter}
                className="text-white hover:bg-white/20"
                disabled={isReady}
              >
                <ArrowRight className="h-6 w-6" />
              </Button>
            </div>
            
            {/* Player status */}
            <div className="w-full grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 bg-black/30 rounded-lg">
                <div className="text-sm font-bold text-white">
                  {websocketService.isHost ? 'You (Host)' : 'You (Guest)'}
                </div>
                <div className="flex items-center">
                  <div className={`w-6 h-6 rounded-full mr-2 ${getCharacterColor(selectedCharacterId)}`}></div>
                  <span className="text-xs text-white">{selectedCharacterId}</span>
                </div>
                <div className="mt-1 text-xs font-bold">
                  {isReady ? 
                    <span className="text-green-400">✓ Ready</span> : 
                    <span className="text-yellow-400">Not Ready</span>
                  }
                </div>
              </div>
              
              <div className="p-3 bg-black/30 rounded-lg">
                <div className="text-sm font-bold text-white">
                  {websocketService.isHost ? 'Guest' : 'Host'}: {peerName || 'Waiting...'}
                </div>
                {peerCharacterId ? (
                  <>
                    <div className="flex items-center">
                      <div className={`w-6 h-6 rounded-full mr-2 ${getCharacterColor(peerCharacterId)}`}></div>
                      <span className="text-xs text-white">{peerCharacterId}</span>
                    </div>
                    <div className="mt-1 text-xs font-bold">
                      {isPeerReady ? 
                        <span className="text-green-400">✓ Ready</span> : 
                        <span className="text-yellow-400">Not Ready</span>
                      }
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-gray-400 mt-2">Selecting character...</div>
                )}
              </div>
            </div>
            
            <Button 
              onClick={handleReady}
              disabled={isReady || !selectedCharacterId || isGameStarting}
              className="game-button w-full flex items-center justify-center gap-2 pixel-font py-4 text-white"
              variant="default"
            >
              {isReady ? 'Waiting for opponent...' : "I'm Ready!"}
              {isGameStarting && <Loader2 className="h-4 w-4 animate-spin" />}
            </Button>
            
            {isGameStarting && (
              <div className="mt-4 text-center text-white animate-pulse">
                Game starting...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-600 to-cyan-600 p-4">
      <Card className="game-panel w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-between items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBackToMenu}
              className="flex items-center gap-1 text-white hover:bg-black/20"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="pixel-font text-xs">Back</span>
            </Button>
            
            {isConnecting && (
              <div className="flex items-center gap-2 text-yellow-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs pixel-font">Connecting...</span>
              </div>
            )}
          </div>
          
          <CardTitle className="game-title text-2xl font-bold text-center flex justify-center items-center gap-2 text-yellow-400">
            <Users className="h-6 w-6 text-yellow-500" />
            Crypto Beach Soccer
          </CardTitle>
          <CardDescription className="text-center pixel-font text-white">
            Play 1v1 matches with other players!
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <div className="mb-4">
              <div className="p-3 bg-red-900/70 border-2 border-red-500 text-red-100 rounded-md text-sm pixel-font">
                {error}
              </div>
              {error.includes('connect') && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleManualReconnect}
                  disabled={isConnecting}
                  className="mt-2 w-full flex items-center justify-center gap-2 game-button pixel-font py-4"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs">Reconnecting...</span>
                    </>
                  ) : (
                    <>
                      <span>🔄</span> <span className="text-xs">Reconnect</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
          
          {/* Name input section */}
          <div className="mb-6">
            <Label htmlFor="playerName" className="text-cyan-300 mb-2 block">
              Your Name
            </Label>
            <Input 
              id="playerName"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="game-input text-blue-500"
            />
          </div>
          
          {/* Room management with tabs */}
          <Tabs defaultValue="host" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 mb-4 text-blue-200">
              <TabsTrigger value="host" className="pixel-font ">Create Room</TabsTrigger>
              <TabsTrigger value="join" className="pixel-font">Join Room</TabsTrigger>
            </TabsList>
            
            <TabsContent value="host">
              {roomCode ? (
                <div className="text-center">
                  <div className="bg-black/40 p-4 rounded-lg mb-4">
                    <h3 className="text-lg font-bold text-yellow-400 mb-2">Room Created!</h3>
                    <p className="text-white mb-2">Share this code with a friend:</p>
                    <div className="bg-yellow-500/20 p-3 rounded-lg border-2 border-yellow-500 text-white text-lg font-bold tracking-wider">
                      {roomCode}
                    </div>
                    
                    <div className="mt-4 text-sm text-white">
                      {peerName ? (
                        <div className="text-green-400">
                          {peerName} has joined the room!
                        </div>
                      ) : (
                        <div className="flex justify-center items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Waiting for player to join...</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {peerName && (
                    <Button 
                      onClick={() => setCharacterSelectVisible(true)}
                      className="game-button w-full flex items-center justify-center gap-2 pixel-font py-4"
                      variant="default"
                    >
                      Select Character
                    </Button>
                  )}
                </div>
              ) : (
                <Button 
                  onClick={handleCreateRoom}
                  disabled={!playerName.trim() || isConnecting}
                  className="game-button w-full flex items-center justify-center gap-2 pixel-font py-4 text-white"
                  variant="default"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>Create New Room</>
                  )}
                </Button>
              )}
            </TabsContent>
            
            <TabsContent value="join">
              {!roomCode ? (
                <div className="space-y-4">
                    <div>
                    <Label htmlFor="roomCode" className="mb-2 block text-cyan-300">
                      Room Code
                    </Label>
                    <Input 
                      id="roomCode"
                      placeholder="Enter room code"
                      value={roomToJoin}
                      onChange={(e) => setRoomToJoin(e.target.value.toUpperCase())}
                      className="game-input bg-black/30 border border-purple-500 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 focus:border-pink-500 focus:ring-pink-500/30 placeholder:text-fuchsia-300/50"
                    />
                    </div>
                  <Button 
                    onClick={handleJoinRoom}
                    disabled={!playerName.trim() || !roomToJoin.trim() || isConnecting || isJoining}
                    className="game-button w-full flex items-center justify-center gap-2 pixel-font py-4 text-white"
                    variant="default"
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                        <span>Joining Room...</span>
                      </>
                    ) : (
                      <>Join Room</>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="bg-black/40 p-4 rounded-lg mb-4">
                    <h3 className="text-lg font-bold text-yellow-400 mb-2">Joined Room!</h3>
                    <p className="text-white mb-2">You're playing with:</p>
                    <div className="bg-blue-500/20 p-3 rounded-lg border-2 border-blue-500 text-white text-lg font-bold">
                      {peerName || 'Host'}
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => setCharacterSelectVisible(true)}
                    className="game-button w-full flex items-center justify-center gap-2 pixel-font py-4"
                    variant="default"
                  >
                    Select Character
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          {/* Game instructions */}
          <div className="mt-6 bg-black/30 p-4 rounded-lg">
            <h3 className="text-yellow-400 font-bold mb-2">How to Play:</h3>
            <ol className="text-white text-xs space-y-2 list-decimal pl-4">
              <li>Create a room and share the code with a friend</li>
              <li>Both players select their crypto character</li>
              <li>Press "I'm Ready" when you're set to play</li>
              <li>Use WASD or arrow keys to move, SPACE to kick</li>
              <li>Press E to activate your character's special power</li>
              <li>Score goals and collect ability power-ups</li>
            </ol>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-center">
          <div className="text-white text-opacity-50 text-xs">
            Host must have port 5000 open for direct connections
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default MultiplayerLobby;