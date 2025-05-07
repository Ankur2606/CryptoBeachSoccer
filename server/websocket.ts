import { Server } from "http";
import { v4 as uuidv4 } from "uuid";
import { WebSocketServer, WebSocket } from "ws";

// WebSocket message types
type MessageType =
  | "create-room"
  | "join-room"
  | "room-created"
  | "room-joined"
  | "player-joined"
  | "player-left"
  | "set-ready"
  | "player-ready-update"
  | "ready-acknowledged"
  | "game-start"
  | "game-update"
  | "position-update"
  | "game-reset"
  | "game-restart"
  | "error"
  | "select-character"
  | "character-selected"
  | "character-selection-confirmed";

// WebSocket message interface
interface WebSocketMessage {
  type: MessageType;
  data: any;
}

// Extended Player interface with character selection
interface Player {
  name: string;
  ws: WebSocket;
  ready: boolean;
  character?: string; // Selected character ID
}

// Game room interface
interface Room {
  id: string;
  host: Player;
  guest?: Player;
  lastActivity: number;
  gameStatus: 'waiting' | 'in_progress' | 'completed';
}

// Active rooms
const rooms = new Map<string, Room>();

// Set up WebSocket server
export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  // Clean up inactive rooms periodically (every 5 minutes)
  setInterval(() => {
    const now = Date.now();
    rooms.forEach((room, id) => {
      const inactiveTime = now - room.lastActivity;
      // If room inactive for more than 30 minutes, remove it
      if (inactiveTime > 30 * 60 * 1000) {
        console.log(`Room ${id} inactive for ${Math.round(inactiveTime / 1000 / 60)} minutes. Removing.`);
        rooms.delete(id);
      }
    });
  }, 5 * 60 * 1000);

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");

    // Handle messages from clients
    ws.on("message", (messageData) => {
      try {
        const message: WebSocketMessage = JSON.parse(messageData.toString());
        handleMessage(ws, message);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    });

    // Handle client disconnection
    ws.on("close", () => {
      handlePlayerDisconnect(ws);
    });
  });
}

// Handle player disconnection
function handlePlayerDisconnect(ws: WebSocket) {
  // Find room where this player is
  rooms.forEach((room, roomId) => {
    // If player is host
    if (room.host.ws === ws) {
      // Notify guest if exists
      if (room.guest) {
        sendMessage(room.guest.ws, "player-left", {
          message: "Host left the game",
        });
      }
      // Remove room
      rooms.delete(roomId);
      console.log(`Host left, room ${roomId} removed`);
    } 
    // If player is guest
    else if (room.guest && room.guest.ws === ws) {
      // Notify host
      sendMessage(room.host.ws, "player-left", {
        message: "Guest left the game",
      });
      // Remove guest from room
      delete room.guest;
      room.lastActivity = Date.now();
      console.log(`Guest left room ${roomId}`);
    }
  });
}

// Handle incoming messages
function handleMessage(ws: WebSocket, message: WebSocketMessage) {
  console.log(`Received message: ${message.type}`, message.data);

  switch (message.type) {
    case "create-room":
      handleCreateRoom(ws, message.data);
      break;
    case "join-room":
      handleJoinRoom(ws, message.data);
      break;
    case "set-ready":
      handleSetReady(ws, message.data);
      break;
    case "game-update":
      handleGameUpdate(ws, message.data);
      break;
    case "position-update":
      handlePositionUpdate(ws, message.data);
      break;
    case "game-reset":
      handleGameReset(ws, message.data);
      break;
    case "game-restart":
      handleGameRestart(ws, message.data);
      break;
    case "select-character":
      handleCharacterSelect(ws, message.data);
      break;
    default:
      console.warn("Unknown message type:", message.type);
  }
}

// Create a new game room
function handleCreateRoom(ws: WebSocket, data: any) {
  // Check if name is provided
  if (!data.name) {
    return sendMessage(ws, "error", { message: "Name is required" });
  }

  // If rejoining, check if room exists and host left
  if (data.roomId && rooms.has(data.roomId)) {
    const room = rooms.get(data.roomId)!;
    
    // If host reconnecting
    if (!room.host || room.host.ws.readyState === WebSocket.CLOSED) {
      // Update host info
      room.host = {
        name: data.name,
        ws,
        ready: false,
        character: room.host?.character // Preserve character selection
      };
      room.lastActivity = Date.now();
      
      // Notify host that room is created
      sendMessage(ws, "room-created", {
        roomId: room.id,
      });
      
      // If guest exists and still connected
      if (room.guest && room.guest.ws.readyState === WebSocket.OPEN) {
        // Notify host about guest
        sendMessage(ws, "player-joined", {
          guest: room.guest.name,
          characterSelected: room.guest.character
        });
        
        // Notify guest about host reconnecting
        sendMessage(room.guest.ws, "player-joined", {
          guest: room.host.name,
          characterSelected: room.host.character
        });
      }
      
      console.log(`Host reconnected to room ${room.id}`);
      return;
    }
  }

  // Generate unique room ID
  const roomId = data.roomId || generateRoomId();

  // Create new room
  rooms.set(roomId, {
    id: roomId,
    host: {
      name: data.name,
      ws,
      ready: false
    },
    lastActivity: Date.now(),
    gameStatus: 'waiting'
  });

  // Notify client that room is created
  sendMessage(ws, "room-created", {
    roomId,
  });

  console.log(`Room ${roomId} created by ${data.name}`);
}

// Join an existing game room
function handleJoinRoom(ws: WebSocket, data: any) {
  // Check if name and roomId are provided
  if (!data.name || !data.roomId) {
    return sendMessage(ws, "error", { message: "Name and Room ID are required" });
  }

  // Check if room exists
  if (!rooms.has(data.roomId)) {
    return sendMessage(ws, "error", { message: "Room not found" });
  }

  const room = rooms.get(data.roomId)!;
  
  // Check if guest slot is available
  if (room.guest && room.guest.ws.readyState === WebSocket.OPEN) {
    return sendMessage(ws, "error", { message: "Room is full" });
  }

  // Update last activity
  room.lastActivity = Date.now();

  // If guest is reconnecting
  const isReconnect = room.guest && room.guest.ws.readyState !== WebSocket.OPEN;
  
  // Add guest to room (or update if reconnecting)
  room.guest = {
    name: data.name,
    ws,
    ready: false,
    character: isReconnect ? room.guest?.character : undefined
  };

  // Notify guest that they've joined the room
  sendMessage(ws, "room-joined", {
    roomId: room.id,
    host: room.host.name,
    characterSelected: room.host.character
  });

  // Notify host that guest has joined
  sendMessage(room.host.ws, "player-joined", {
    guest: room.guest.name,
    characterSelected: room.guest.character
  });

  console.log(`${data.name} joined room ${data.roomId}${isReconnect ? " (reconnected)" : ""}`);
}

// Player sets ready status
function handleSetReady(ws: WebSocket, data: any) {
  // Find room where this player is
  const room = findRoomByPlayer(ws);
  if (!room) {
    return sendMessage(ws, "error", { message: "Room not found" });
  }

  // Update last activity
  room.lastActivity = Date.now();

  // Determine if player is host or guest
  const isHost = room.host.ws === ws;
  const player = isHost ? room.host : room.guest;

  // Set player as ready
  if (player) {
    player.ready = true;
  }

  // Acknowledge ready status
  sendMessage(ws, "ready-acknowledged", { 
    hostReady: room.host.ready, 
    guestReady: room.guest?.ready || false 
  });

  // Notify other player
  const otherPlayer = isHost ? room.guest : room.host;
  if (otherPlayer) {
    sendMessage(otherPlayer.ws, "player-ready-update", { 
      hostReady: room.host.ready, 
      guestReady: room.guest?.ready || false 
    });
  }

  // Check if both players are ready
  if (room.host.ready && room.guest && room.guest.ready) {
    // Set game status to in progress
    room.gameStatus = 'in_progress';
    
    // Start the game
    sendMessage(room.host.ws, "game-start", {
      opponentName: room.guest.name,
      opponentCharacter: room.guest.character
    });
    
    sendMessage(room.guest.ws, "game-start", {
      opponentName: room.host.name,
      opponentCharacter: room.host.character
    });
    
    console.log(`Game started in room ${room.id}`);
  }
}

// Handle game updates
function handleGameUpdate(ws: WebSocket, data: any) {
  // Find room where this player is
  const room = findRoomByPlayer(ws);
  if (!room) return;

  // Update last activity
  room.lastActivity = Date.now();

  // Forward game update to other player
  const isHost = room.host.ws === ws;
  const otherPlayer = isHost ? room.guest : room.host;

  if (otherPlayer) {
    sendMessage(otherPlayer.ws, "game-update", data);
  }
}

// Handle real-time position updates (new feature)
function handlePositionUpdate(ws: WebSocket, data: any) {
  // Find room where this player is
  const room = findRoomByPlayer(ws);
  if (!room || room.gameStatus !== 'in_progress') return;

  // No need to update last activity for frequent position updates
  // to avoid unnecessary overhead
  
  // Forward position update to other player
  const isHost = room.host.ws === ws;
  const otherPlayer = isHost ? room.guest : room.host;

  if (otherPlayer) {
    sendMessage(otherPlayer.ws, "position-update", data);
  }
}

// Handle game reset by host (new feature)
function handleGameReset(ws: WebSocket, data: any) {
  // Find room where this player is
  const room = findRoomByPlayer(ws);
  if (!room) return;

  // Update last activity
  room.lastActivity = Date.now();

  // Only host can reset the game
  if (room.host.ws !== ws) {
    return sendMessage(ws, "error", { message: "Only the host can reset the game" });
  }

  // Reset ready states
  room.host.ready = false;
  if (room.guest) {
    room.guest.ready = false;
  }

  // Change game status back to waiting
  room.gameStatus = 'waiting';

  // Notify both players about the reset
  sendMessage(room.host.ws, "game-reset", {
    hostName: room.host.name,
    guestName: room.guest?.name || ''
  });

  if (room.guest) {
    sendMessage(room.guest.ws, "game-reset", {
      hostName: room.host.name,
      guestName: room.guest.name
    });
  }

  console.log(`Game reset in room ${room.id}`);
}

// Handle game restart request (can be from any player)
function handleGameRestart(ws: WebSocket, data: any) {
  // Find room where this player is
  const room = findRoomByPlayer(ws);
  if (!room) return;

  // Update last activity
  room.lastActivity = Date.now();

  // Determine if player is host or guest
  const isHost = room.host.ws === ws;
  
  // Reset ready states
  room.host.ready = false;
  if (room.guest) {
    room.guest.ready = false;
  }

  // Change game status back to waiting
  room.gameStatus = 'waiting';

  // Notify both players about the restart
  sendMessage(room.host.ws, "game-restart", {
    hostName: room.host.name,
    guestName: room.guest?.name || '',
    requestedBy: isHost ? 'host' : 'guest'
  });

  if (room.guest) {
    sendMessage(room.guest.ws, "game-restart", {
      hostName: room.host.name,
      guestName: room.guest.name,
      requestedBy: isHost ? 'host' : 'guest'
    });
  }

  console.log(`Game restart requested in room ${room.id} by ${isHost ? 'host' : 'guest'}`);
}

// Handle character selection (new feature)
function handleCharacterSelect(ws: WebSocket, data: any) {
  // Find room where this player is
  const room = findRoomByPlayer(ws);
  if (!room) return;

  // Update last activity
  room.lastActivity = Date.now();

  // Check required data
  if (!data.character) {
    return sendMessage(ws, "error", { message: "Character ID is required" });
  }

  // Determine if player is host or guest
  const isHost = room.host.ws === ws;
  const player = isHost ? room.host : room.guest;
  const otherPlayer = isHost ? room.guest : room.host;

  // Update player's character
  if (player) {
    player.character = data.character;
    
    // Confirm selection to the player
    sendMessage(ws, "character-selection-confirmed", {
      success: true,
      character: data.character
    });
    
    // Notify the other player about the selection
    if (otherPlayer) {
      sendMessage(otherPlayer.ws, "character-selected", {
        character: data.character,
        isHost: isHost
      });
    }
    
    console.log(`Player ${player.name} selected character ${data.character} in room ${room.id}`);
  }
}

// Helper function to find a room by player's WebSocket connection
function findRoomByPlayer(ws: WebSocket): Room | undefined {
  for (const room of rooms.values()) {
    if (room.host.ws === ws || (room.guest && room.guest.ws === ws)) {
      return room;
    }
  }
  return undefined;
}

// Send a message to a client
function sendMessage(ws: WebSocket, type: MessageType, data: any) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type,
        data,
      })
    );
  }
}

// Generate a random room ID
function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}