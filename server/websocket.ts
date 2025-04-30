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
  pendingJoin?: string; // Track pending join attempts
}

interface GameRoom {
  id: string;
  host: string;
  guest?: string;
  hostReady: boolean;
  guestReady: boolean;
  gameInProgress: boolean; // Track if a game is currently being played
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
            
            // If guest leaves, clear the guest from the room but keep the room
            room.guest = undefined;
            room.guestReady = false;
          }
          
          // If host leaves, remove the room completely
          if (room.host === playerId) {
            rooms.delete(player.room);
          }
        }
      }
      
      // Also clear any pending join attempts
      if (player && player.pendingJoin) {
        const pendingRoom = rooms.get(player.pendingJoin);
        if (pendingRoom) {
          // If this player was attempting to join as guest, clear the pending state
          if (pendingRoom.guest === playerId) {
            pendingRoom.guest = undefined;
            pendingRoom.guestReady = false;
          }
        }
      }
      
      // Remove the player
      players.delete(playerId);
    });
  });
  
  // Send a message to a client
  function send(socket: WebSocket, message: GameMessage) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
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
          guestReady: false,
          gameInProgress: false
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
        
        // Special case: If the player is already in this room as the host, don't allow them to join as guest
        if (room.host === playerId) {
          send(player.socket, {
            type: 'error',
            data: { message: 'You are already the host of this room' }
          });
          return;
        }
        
        // Track that this player is attempting to join the room
        player.pendingJoin = room.id;
        
        // If there's already a guest in the room, handle different cases
        if (room.guest) {
          // Case 1: The player was previously the guest and is trying to rejoin
          // (common after brief disconnects or page refreshes)
          const existingGuest = players.get(room.guest);
          
          // If the current guest isn't connected, allow this player to take over
          if (!existingGuest || existingGuest.socket.readyState !== WebSocket.OPEN) {
            log(`Player ${player.name} rejoining as guest in room ${room.id} (replacing disconnected guest)`, 'websocket');
            room.guest = playerId;
            player.room = room.id;
            
            // Notify the host about the new guest
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
            
            // Notify the guest that they've joined
            send(player.socket, {
              type: 'room-joined',
              data: { 
                roomId: room.id,
                host: hostPlayer ? hostPlayer.name : 'Unknown',
                hostId: room.host
              }
            });
            
            return;
          }
          
          // If it's a different player trying to join, reject them
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
        
        // Log the successful join
        log(`Player ${player.name} joined room ${room.id} as guest`, 'websocket');
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
        
        // Make sure we have a guest before proceeding
        if (!playerRoom.guest) {
          send(player.socket, {
            type: 'error',
            data: { message: 'Waiting for another player to join' }
          });
          return;
        }
        
        // Update ready state
        if (playerRoom.host === playerId) {
          playerRoom.hostReady = true;
        } else if (playerRoom.guest === playerId) {
          playerRoom.guestReady = true;
        }
        
        // Acknowledgment to the player who marked themselves ready
        send(player.socket, {
          type: 'ready-acknowledged',
          data: { 
            success: true,
            hostReady: playerRoom.hostReady,
            guestReady: playerRoom.guestReady
          }
        });
        
        // Get both player objects
        const host = players.get(playerRoom.host);
        const guest = players.get(playerRoom.guest);
        
        if (!host || !guest) {
          log(`Error: Missing players in room ${player.room}`, 'websocket');
          return;
        }
        
        // Notify the other player about the ready state change
        if (playerRoom.host === playerId) {
          send(guest.socket, {
            type: 'player-ready-update',
            data: { 
              player: 'host',
              ready: true,
              hostReady: playerRoom.hostReady,
              guestReady: playerRoom.guestReady
            }
          });
        } else if (playerRoom.guest === playerId) {
          send(host.socket, {
            type: 'player-ready-update',
            data: { 
              player: 'guest',
              ready: true,
              hostReady: playerRoom.hostReady,
              guestReady: playerRoom.guestReady
            }
          });
        }
        
        // Check if both players are ready
        if (playerRoom.hostReady && playerRoom.guestReady) {
          // Mark the game as in progress
          playerRoom.gameInProgress = true;
          
          // Start the game by notifying both players
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
          
          log(`Game starting in room ${player.room} between ${host.name} and ${guest.name}`, 'websocket');
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
          send(player.socket, {
            type: 'error',
            data: { message: 'You are not in a room' }
          });
          return;
        }
        
        const restartRoom = rooms.get(player.room);
        if (!restartRoom) {
          send(player.socket, {
            type: 'error',
            data: { message: 'Room not found' }
          });
          return;
        }
        
        // Make sure we have both players before proceeding
        if (!restartRoom.guest) {
          send(player.socket, {
            type: 'error',
            data: { message: 'Cannot restart: waiting for another player to join' }
          });
          return;
        }
        
        // Reset ready states and game status
        restartRoom.hostReady = false;
        restartRoom.guestReady = false;
        restartRoom.gameInProgress = false;
        
        // Get both player objects
        const restartHost = players.get(restartRoom.host);
        const restartGuest = players.get(restartRoom.guest);
        
        if (!restartHost || !restartGuest) {
          log(`Error: Missing players for restart in room ${player.room}`, 'websocket');
          send(player.socket, {
            type: 'error',
            data: { message: 'Cannot restart: player disconnected' }
          });
          return;
        }
        
        // Notify the host
        send(restartHost.socket, {
          type: 'game-restart',
          data: { 
            requestedBy: player.name,
            hostName: restartHost.name,
            guestName: restartGuest.name
          }
        });
        
        // Notify the guest
        send(restartGuest.socket, {
          type: 'game-restart',
          data: { 
            requestedBy: player.name,
            hostName: restartHost.name,
            guestName: restartGuest.name
          }
        });
        
        log(`Game restarted in room ${player.room} by ${player.name}`, 'websocket');
        break;
        
      default:
        log(`Unknown message type: ${message.type}`, 'websocket');
    }
  }
}