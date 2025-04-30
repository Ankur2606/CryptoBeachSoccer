import { useState, useEffect, useRef } from 'react';
import { useGameState } from '@/lib/stores/useGameState';
import { useAudio } from '@/lib/stores/useAudio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Coins, Users, Trophy, ChevronLeft, Loader2, RefreshCw } from 'lucide-react';
import websocketService from '@/lib/multiplayer/websocketService';

const MultiplayerLobby = () => {
  const { gameState, setGameState } = useGameState();
  const { playSuccess } = useAudio();
  
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
      playSuccess();
      setError(''); // Clear any existing errors
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
      playSuccess();
      setError(''); // Clear any existing errors
    });
    
    websocketService.on('player-left', () => {
      setPeerName('');
      setIsPeerReady(false);
      setError('Other player left the game');
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
    });
    
    // Cleanup when unmounting
    return () => {
      // Remove all event handlers
      ['room-created', 'error', 'player-joined', 'player-ready-update', 
       'game-start', 'room-joined', 'player-left', 'ready-acknowledged',
       'game-restart', 'join-timeout'].forEach(type => {
        websocketService.off(type, () => {});
      });
      
      // Clear any active timeouts
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
        joinTimeoutRef.current = null;
      }
    };
  }, [setGameState, playSuccess, gameState, isReconnecting]);
  
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
  
  // Set player as ready
  const handleReady = () => {
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
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="pixel-font text-yellow-300">Your Name</Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                disabled={isGameStarting}
                className="bg-black/50 border-2 border-yellow-500/50 text-white pixel-font py-6 placeholder:text-yellow-100/30"
              />
            </div>
            
            {roomCode ? (
              // Room created or joined
              <div className="space-y-4">
                <div className="bg-blue-900/70 p-3 rounded-md border-2 border-blue-400">
                  <div className="font-medium mb-1 pixel-font text-blue-300">Room Code:</div>
                  <div className="text-2xl font-mono tracking-wider text-center bg-black/50 p-3 rounded border-2 border-yellow-200 text-yellow-300">
                    {roomCode}
                  </div>
                  <div className="text-xs text-center mt-2 text-blue-200 pixel-font">
                    Share this code with your friend
                  </div>
                </div>
                
                {peerName && (
                  <div className="bg-green-900/70 p-3 rounded-md border-2 border-green-400">
                    <div className="font-medium mb-1 pixel-font text-green-300">
                      {websocketService.isHost ? 'Guest' : 'Host'}:
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white pixel-font">{peerName}</span>
                      {isPeerReady ? (
                        <span className="text-xs bg-green-700 text-green-100 px-3 py-1 rounded-full pixel-font">
                          Ready
                        </span>
                      ) : (
                        <span className="text-xs bg-yellow-700 text-yellow-100 px-3 py-1 rounded-full pixel-font">
                          Not Ready
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {!isReady && peerName && (
                  <Button 
                    onClick={handleReady} 
                    className="game-button w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 py-5"
                    disabled={isGameStarting}
                  >
                    <span className="pixel-font text-sm">I'm Ready To Play</span>
                  </Button>
                )}
                
                {isReady && (
                  <div className="bg-green-900/70 p-3 rounded-md border-2 border-green-400 text-center">
                    {isGameStarting ? (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-green-300" />
                        <span className="pixel-font text-green-300">Starting game...</span>
                      </div>
                    ) : (
                      <>
                        <span className="pixel-font text-green-300">You are ready!</span>
                        <div className="text-xs pixel-font text-green-200 mt-2">
                          {isPeerReady 
                            ? "Both players ready, game starting..." 
                            : "Waiting for other player..."}
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                {!peerName && websocketService.isHost && (
                  <div className="bg-yellow-900/70 p-3 rounded-md border-2 border-yellow-400 text-center">
                    <span className="pixel-font text-yellow-300">Waiting for player to join...</span>
                  </div>
                )}
                
                {/* Restart button option - only show when a match has been played */}
                {peerName && gameState !== 'playing' && (
                  <Button 
                    onClick={handleRestartGame}
                    className="game-button w-full mt-4 flex items-center justify-center gap-2 py-5 pixel-font text-sm"
                    variant="outline"
                    disabled={!isReady || !isPeerReady}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Restart Match
                  </Button>
                )}
              </div>
            ) : (
              // Create or join room
              <Tabs 
                defaultValue={activeTab} 
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 bg-black/40">
                  <TabsTrigger value="host" className="pixel-font text-xs py-3 tab-trigger">Create Game</TabsTrigger>
                  <TabsTrigger value="join" className="pixel-font text-xs py-3 tab-trigger">Join Game</TabsTrigger>
                </TabsList>
                
                <TabsContent value="host" className="space-y-4 mt-4 tab-content">
                  <div className="text-center text-sm text-white/80 pixel-font mb-4">
                    Create a new game and invite a friend to join!
                  </div>
                  
                  <Button 
                    onClick={handleCreateRoom} 
                    className="game-button w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 py-5"
                    disabled={!playerName || isConnecting}
                  >
                    <span className="pixel-font text-sm">Create Room</span>
                  </Button>
                </TabsContent>
                
                <TabsContent value="join" className="space-y-4 mt-4 tab-content">
                  <div className="space-y-2">
                    <Label htmlFor="roomCode" className="pixel-font text-yellow-300">Room Code</Label>
                    <Input
                      id="roomCode"
                      placeholder="Enter code from host"
                      value={roomToJoin}
                      onChange={(e) => setRoomToJoin(e.target.value)}
                      disabled={isJoining}
                      className="bg-black/50 border-2 border-yellow-500/50 text-white pixel-font py-6 placeholder:text-yellow-100/30"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleJoinRoom} 
                    className="game-button w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 py-5"
                    disabled={!playerName || !roomToJoin || isConnecting || isJoining}
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span className="pixel-font text-sm">Joining...</span>
                      </>
                    ) : (
                      <span className="pixel-font text-sm">Join Game</span>
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-center border-t border-white/20 pt-4">
          <div className="text-xs text-yellow-200/70 flex items-center gap-1 pixel-font">
            <Coins className="h-3 w-3" />
            <span>Crypto Beach Soccer Multiplayer v1.0</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default MultiplayerLobby;