import { useState, useEffect, useRef } from 'react';
import { useGameState } from '@/lib/stores/useGameState';
import { useAudio } from '@/lib/stores/useAudio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Coins, Users, Trophy, ChevronLeft, Loader2 } from 'lucide-react';
import websocketService from '@/lib/multiplayer/websocketService';



const MultiplayerLobby = () => {
  const { setGameState } = useGameState();
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
    });
    
    websocketService.on('error', (message) => {
      setError(message.data.message);
    });
    
    websocketService.on('player-joined', (message) => {
      setPeerName(message.data.guest);
      playSuccess();
    });
    
    websocketService.on('player-ready-update', (message) => {
      setIsPeerReady(true);
      playSuccess();
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
      setPeerName(message.data.host);
      setIsJoining(false);
      playSuccess();
    });
    
    websocketService.on('player-left', () => {
      setPeerName('');
      setIsPeerReady(false);
      setError('Other player left the game');
    });
    
    // Cleanup when unmounting
    return () => {
      // Remove all event handlers
      ['room-created', 'error', 'player-joined', 'player-ready-update', 
       'game-start', 'room-joined', 'player-left'].forEach(type => {
        websocketService.off(type, () => {});
      });
    };
  }, [setGameState, playSuccess]);
  
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
    if (window.joinTimeout) {
      clearTimeout(window.joinTimeout);
    }
    
    setIsJoining(true);
    setError('');
    handleSetName();
    websocketService.joinRoom(roomToJoin.trim());
    
    // Set a timeout to clear the joining state if no response received
    window.joinTimeout = setTimeout(() => {
      if (isJoining) {
        setIsJoining(false);
        setError('Joining timed out. Please try again.');
      }
    }, 5000); // 5 seconds timeout
  };
  
  // Set player as ready
  const handleReady = () => {
    setIsReady(true);
    websocketService.setReady();
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
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-600 to-cyan-600 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-between items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBackToMenu}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            
            {isConnecting && (
              <div className="flex items-center gap-2 text-yellow-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Connecting...</span>
              </div>
            )}
          </div>
          
          <CardTitle className="text-2xl font-bold text-center flex justify-center items-center gap-2">
            <Users className="h-6 w-6 text-blue-500" />
            Crypto Beach Soccer
          </CardTitle>
          <CardDescription className="text-center">
            Play 1v1 matches with other players!
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <div className="mb-4">
              <div className="p-2 bg-red-100 border border-red-300 text-red-600 rounded-md text-sm">
                {error}
              </div>
              {error.includes('connect') && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleManualReconnect}
                  disabled={isConnecting}
                  className="mt-2 w-full flex items-center justify-center gap-2"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Reconnecting...
                    </>
                  ) : (
                    <>
                      <span>🔄</span> Reconnect
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                disabled={isGameStarting}
              />
            </div>
            
            {roomCode ? (
              // Room created or joined
              <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                  <div className="font-medium mb-1">Room Code:</div>
                  <div className="text-2xl font-mono tracking-wider text-center bg-white p-2 rounded border border-blue-200">
                    {roomCode}
                  </div>
                  <div className="text-xs text-center mt-1 text-blue-500">
                    Share this code with your friend
                  </div>
                </div>
                
                {peerName && (
                  <div className="bg-green-50 p-3 rounded-md border border-green-200">
                    <div className="font-medium mb-1">
                      {websocketService.isHost ? 'Guest' : 'Host'}:
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{peerName}</span>
                      {isPeerReady ? (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                          Ready
                        </span>
                      ) : (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                          Not Ready
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {!isReady && peerName && (
                  <Button 
                    onClick={handleReady} 
                    className="w-full"
                    disabled={isGameStarting}
                  >
                    I'm Ready To Play
                  </Button>
                )}
                
                {isReady && (
                  <div className="bg-green-50 p-3 rounded-md border border-green-200 text-center">
                    {isGameStarting ? (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-green-600" />
                        <span>Starting game...</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-green-700">You are ready!</span>
                        <div className="text-xs text-green-600 mt-1">
                          {isPeerReady 
                            ? "Both players ready, game starting..." 
                            : "Waiting for other player..."}
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                {!peerName && websocketService.isHost && (
                  <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 text-center">
                    <span className="text-yellow-700">Waiting for player to join...</span>
                  </div>
                )}
              </div>
            ) : (
              // Create or join room
              <Tabs 
                defaultValue={activeTab} 
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="host">Create Game</TabsTrigger>
                  <TabsTrigger value="join">Join Game</TabsTrigger>
                </TabsList>
                
                <TabsContent value="host" className="space-y-4 mt-4">
                  <div className="text-center text-sm text-gray-500 mb-4">
                    Create a new game and invite a friend to join!
                  </div>
                  
                  <Button 
                    onClick={handleCreateRoom} 
                    className="w-full"
                    disabled={!playerName || isConnecting}
                  >
                    Create Room
                  </Button>
                </TabsContent>
                
                <TabsContent value="join" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="roomCode">Room Code</Label>
                    <Input
                      id="roomCode"
                      placeholder="Enter code from host"
                      value={roomToJoin}
                      onChange={(e) => setRoomToJoin(e.target.value)}
                      disabled={isJoining}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleJoinRoom} 
                    className="w-full"
                    disabled={!playerName || !roomToJoin || isConnecting || isJoining}
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      'Join Game'
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-center border-t pt-4">
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <Coins className="h-3 w-3" />
            <span>Crypto Beach Soccer Multiplayer v1.0</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default MultiplayerLobby;