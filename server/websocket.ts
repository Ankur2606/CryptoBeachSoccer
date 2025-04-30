import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { log } from './vite';

// Define message types for game communication
interface GameMessage {
  type: string;
  data: any;
}

// Track connected players and game rooms
interface Player {
  id: string;
  name: string;
  socket: WebSocket;
  room?: string;
}

interface GameRoom {
  id: string;
  host: string;
  guest?: string;
  hostReady: boolean;
  guestReady: boolean;
}

// Maintain state
const players: Map<string, Player> = new Map();
const rooms: Map<string, GameRoom> = new Map();

// Generate a random ID
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

// Setup WebSocket server
export function setupWebSocketServer(server: Server) {
  // Use a specific path to avoid conflicts with Vite's WebSocket server
  const wss = new WebSocketServer({ 
    server,
    path: '/ws/game'  // This path will be used for game WebSocket connections
  });
  
  log('WebSocket server initialized on path /ws/game', 'websocket');
  
  wss.on('connection', (socket: WebSocket) => {
    // Assign a unique ID to each player
    const playerId = generateId();
    
    // Initialize the player without a name yet
    players.set(playerId, {
      id: playerId,
      name: `Player-${playerId}`,
      socket: socket
    });
    
    log(`Player ${playerId} connected`, 'websocket');
    
    // Send the player their ID
    send(socket, {
      type: 'connected',
      data: { id: playerId }
    });
    
    // Handle incoming messages
    socket.on('message', (message: string) => {
      try {
        const parsedMessage: GameMessage = JSON.parse(message.toString());
        handleMessage(playerId, parsedMessage);
      } catch (error) {
        log(`Error parsing message: ${error}`, 'websocket');
      }
    });
    
    // Handle disconnections
    socket.on('close', () => {
      log(`Player ${playerId} disconnected`, 'websocket');
      
      // Get the player
      const player = players.get(playerId);
      
      // If the player was in a room, notify the other player
      if (player && player.room) {
        const room = rooms.get(player.room);
        
        if (room) {
          // Notify the other player
          if (room.host === playerId && room.guest) {
            const guestPlayer = players.get(room.guest);
            if (guestPlayer) {
              send(guestPlayer.socket, {
                type: 'player-left',
                data: { message: 'Host left the game' }
              });
            }
          } else if (room.guest === playerId) {
            const hostPlayer = players.get(room.host);
            if (hostPlayer) {
              send(hostPlayer.socket, {
                type: 'player-left',
                data: { message: 'Guest left the game' }
              });
            }
          }
          
          // Remove the room
          rooms.delete(player.room);
        }
      }
      
      // Remove the player
      players.delete(playerId);
    });
  });
  
  // Send a message to a client
  function send(socket: WebSocket, message: GameMessage) {
    socket.send(JSON.stringify(message));
  }
  
  // Handle incoming messages
  function handleMessage(playerId: string, message: GameMessage) {
    const player = players.get(playerId);
    
    if (!player) {
      log(`Player ${playerId} not found`, 'websocket');
      return;
    }
    
    switch (message.type) {
      case 'set-name':
        // Update player name
        player.name = message.data.name || `Player-${playerId}`;
        log(`Player ${playerId} set name to ${player.name}`, 'websocket');
        break;
        
      case 'create-room':
        // Create a new game room
        const roomId = generateId();
        rooms.set(roomId, {
          id: roomId,
          host: playerId,
          hostReady: false,
          guestReady: false
        });
        
        // Associate the player with the room
        player.room = roomId;
        
        // Send the room code back to the player
        send(player.socket, {
          type: 'room-created',
          data: { roomId, name: player.name }
        });
        
        log(`Player ${player.name} created room ${roomId}`, 'websocket');
        break;
        
      case 'join-room':
        // Join an existing game room
        const room = rooms.get(message.data.roomId);
        
        if (!room) {
          send(player.socket, {
            type: 'error',
            data: { message: 'Room not found' }
          });
          return;
        }
        
        if (room.guest) {
          send(player.socket, {
            type: 'error',
            data: { message: 'Room is full' }
          });
          return;
        }
        
        // Add the player to the room as a guest
        room.guest = playerId;
        player.room = room.id;
        
        // Notify the host
        const hostPlayer = players.get(room.host);
        if (hostPlayer) {
          send(hostPlayer.socket, {
            type: 'player-joined',
            data: { 
              guest: player.name,
              guestId: playerId
            }
          });
        }
        
        // Notify the guest
        send(player.socket, {
          type: 'room-joined',
          data: { 
            roomId: room.id,
            host: hostPlayer ? hostPlayer.name : 'Unknown',
            hostId: room.host
          }
        });
        
        log(`Player ${player.name} joined room ${room.id}`, 'websocket');
        break;
        
      case 'player-ready':
        // Set player ready state
        if (!player.room) {
          send(player.socket, {
            type: 'error',
            data: { message: 'You are not in a room' }
          });
          return;
        }
        
        const playerRoom = rooms.get(player.room);
        if (!playerRoom) {
          send(player.socket, {
            type: 'error',
            data: { message: 'Room not found' }
          });
          return;
        }
        
        // Update ready state
        if (playerRoom.host === playerId) {
          playerRoom.hostReady = true;
        } else if (playerRoom.guest === playerId) {
          playerRoom.guestReady = true;
        }
        
        // Check if both players are ready
        if (playerRoom.hostReady && playerRoom.guestReady) {
          // Start the game
          const host = players.get(playerRoom.host);
          const guest = players.get(playerRoom.guest!);
          
          if (host && guest) {
            send(host.socket, {
              type: 'game-start',
              data: {
                hostName: host.name,
                guestName: guest.name,
                isHost: true
              }
            });
            
            send(guest.socket, {
              type: 'game-start',
              data: {
                hostName: host.name,
                guestName: guest.name,
                isHost: false
              }
            });
          }
        } else {
          // Notify the other player
          if (playerRoom.host === playerId && playerRoom.guest) {
            const guestPlayer = players.get(playerRoom.guest);
            if (guestPlayer) {
              send(guestPlayer.socket, {
                type: 'player-ready-update',
                data: { 
                  player: 'host',
                  ready: true
                }
              });
            }
          } else if (playerRoom.guest === playerId) {
            const hostPlayer = players.get(playerRoom.host);
            if (hostPlayer) {
              send(hostPlayer.socket, {
                type: 'player-ready-update',
                data: { 
                  player: 'guest',
                  ready: true
                }
              });
            }
          }
        }
        
        log(`Player ${player.name} is ready in room ${player.room}`, 'websocket');
        break;
        
      case 'game-update':
        // Forward game updates to the other player
        if (!player.room) {
          return;
        }
        
        const gameRoom = rooms.get(player.room);
        if (!gameRoom) {
          return;
        }
        
        // Forward to the other player
        if (gameRoom.host === playerId && gameRoom.guest) {
          const guestPlayer = players.get(gameRoom.guest);
          if (guestPlayer) {
            send(guestPlayer.socket, {
              type: 'game-update',
              data: message.data
            });
          }
        } else if (gameRoom.guest === playerId) {
          const hostPlayer = players.get(gameRoom.host);
          if (hostPlayer) {
            send(hostPlayer.socket, {
              type: 'game-update',
              data: message.data
            });
          }
        }
        break;
        
      case 'restart-game':
        // Restart the game session
        if (!player.room) {
          return;
        }
        
        const restartRoom = rooms.get(player.room);
        if (!restartRoom) {
          return;
        }
        
        // Reset ready states
        restartRoom.hostReady = false;
        restartRoom.guestReady = false;
        
        // Notify both players
        const restartHost = players.get(restartRoom.host);
        const restartGuest = restartRoom.guest ? players.get(restartRoom.guest) : null;
        
        if (restartHost) {
          send(restartHost.socket, {
            type: 'game-restart',
            data: { requestedBy: player.name }
          });
        }
        
        if (restartGuest) {
          send(restartGuest.socket, {
            type: 'game-restart',
            data: { requestedBy: player.name }
          });
        }
        
        log(`Game restarted in room ${player.room} by ${player.name}`, 'websocket');
        break;
        
      default:
        log(`Unknown message type: ${message.type}`, 'websocket');
    }
  }
}