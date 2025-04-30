// WebSocket service for multiplayer functionality
// This service manages the connection to the server and handles messages

// Define message types
export interface GameMessage {
  type: string;
  data: any;
}

// Define event types
export type MessageHandler = (message: GameMessage) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private _playerId: string | null = null;
  private _playerName: string | null = null;
  private _isHost: boolean = false;
  private _roomId: string | null = null;
  private _connected: boolean = false;
  private _peerName: string | null = null;
  private _joinTimeout: NodeJS.Timeout | null = null;
  private _pendingJoinRoomId: string | null = null;
  private _hostReady: boolean = false;
  private _guestReady: boolean = false;
  
  // Getter for player properties
  get playerId(): string | null { return this._playerId; }
  get playerName(): string | null { return this._playerName; }
  get isHost(): boolean { return this._isHost; }
  get roomId(): string | null { return this._roomId; }
  get isConnected(): boolean { return this._connected; }
  get peerName(): string | null { return this._peerName; }
  get hostReady(): boolean { return this._hostReady; }
  get guestReady(): boolean { return this._guestReady; }
  
  // Connect to the WebSocket server
  connect(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected');
        this._connected = true;
        resolve(true);
        return;
      }
      
      // Get the WebSocket URL using our helper function
      try {
        const wsUrl = getWebSocketUrl();
        console.log(`Attempting to connect to WebSocket at: ${wsUrl}`);
        this.socket = new WebSocket(wsUrl);
      } catch (err) {
        console.error('Error constructing WebSocket URL:', err);
        resolve(false);
        return;
      }
      
      // Connection opened
      this.socket.addEventListener('open', () => {
        console.log('WebSocket connection established');
        this._connected = true;
        resolve(true);
        
        // If we had a pending room join when disconnected, attempt to rejoin
        if (this._pendingJoinRoomId) {
          console.log(`Reconnected, attempting to rejoin room: ${this._pendingJoinRoomId}`);
          this.joinRoom(this._pendingJoinRoomId);
          this._pendingJoinRoomId = null;
        }
      });
      
      // Connection closed
      this.socket.addEventListener('close', () => {
        console.log('WebSocket connection closed');
        this._connected = false;
        
        // Attempt to reconnect after a delay
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
        }
        
        this.reconnectTimer = setTimeout(() => {
          console.log('Attempting to reconnect...');
          this.connect();
        }, 3000);
      });
      
      // Connection error
      this.socket.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
        this._connected = false;
        resolve(false);
      });
      
      // Listen for messages
      this.socket.addEventListener('message', (event) => {
        try {
          const message: GameMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });
    });
  }
  
  // Disconnect from the WebSocket server
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this._joinTimeout) {
      clearTimeout(this._joinTimeout);
      this._joinTimeout = null;
    }
    
    this._connected = false;
    this._playerId = null;
    this._playerName = null;
    this._isHost = false;
    this._roomId = null;
    this._peerName = null;
    this._pendingJoinRoomId = null;
    this._hostReady = false;
    this._guestReady = false;
  }
  
  // Send a message to the server
  send(type: string, data: any = {}) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return false;
    }
    
    const message: GameMessage = {
      type,
      data
    };
    
    this.socket.send(JSON.stringify(message));
    return true;
  }
  
  // Register a message handler
  on(type: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    
    this.messageHandlers.get(type)?.push(handler);
  }
  
  // Remove a message handler
  off(type: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(type)) {
      return;
    }
    
    const handlers = this.messageHandlers.get(type);
    if (!handlers) return;
    
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }
  
  // Handle incoming messages
  private handleMessage(message: GameMessage) {
    console.log('Received message:', message);
    
    // Handle special messages first
    switch (message.type) {
      case 'connected':
        this._playerId = message.data.id;
        break;
        
      case 'room-created':
        this._roomId = message.data.roomId;
        this._isHost = true;
        // Reset ready states when room is created
        this._hostReady = false;
        this._guestReady = false;
        break;
        
      case 'room-joined':
        // Clear any join timeout
        if (this._joinTimeout) {
          clearTimeout(this._joinTimeout);
          this._joinTimeout = null;
        }
        
        this._roomId = message.data.roomId;
        this._isHost = false;
        this._peerName = message.data.host;
        this._hostReady = false;
        this._guestReady = false;
        break;
        
      case 'player-joined':
        this._peerName = message.data.guest;
        break;
        
      case 'player-ready-update':
        // Update the ready state of the other player
        if (message.data.player === 'host') {
          this._hostReady = message.data.ready;
        } else if (message.data.player === 'guest') {
          this._guestReady = message.data.ready;
        }
        
        // Also ensure we have the full state
        if (message.data.hostReady !== undefined) {
          this._hostReady = message.data.hostReady;
        }
        if (message.data.guestReady !== undefined) {
          this._guestReady = message.data.guestReady;
        }
        break;
        
      case 'ready-acknowledged':
        // Update our own ready state based on server confirmation
        if (this._isHost) {
          this._hostReady = true;
        } else {
          this._guestReady = true;
        }
        
        // Also ensure we have the full state
        if (message.data.hostReady !== undefined) {
          this._hostReady = message.data.hostReady;
        }
        if (message.data.guestReady !== undefined) {
          this._guestReady = message.data.guestReady;
        }
        break;
        
      case 'game-start':
        this._isHost = message.data.isHost;
        if (this._isHost) {
          this._peerName = message.data.guestName;
        } else {
          this._peerName = message.data.hostName;
        }
        break;
        
      case 'player-left':
        if (this._isHost) {
          // If we're the host and the guest left
          this._peerName = null;
          this._guestReady = false;
        } else {
          // If we're the guest and the host left, we become disconnected
          this._roomId = null;
          this._peerName = null;
          this._hostReady = false;
          this._guestReady = false;
        }
        break;
        
      case 'game-restart':
        // Reset ready states on game restart
        this._hostReady = false;
        this._guestReady = false;
        break;
        
      case 'error':
        // If we get a "room is full" error but we're trying to rejoin our own room,
        // we should try to reconnect with a different approach
        if (message.data.message === 'Room is full' && this._roomId) {
          console.log('Room full error when trying to rejoin, attempting recovery...');
          // This will be handled by the component's error handler
        }
        break;
    }
    
    // Dispatch to all handlers for this message type
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in handler for message type '${message.type}':`, error);
        }
      });
    }
    
    // Also dispatch to '*' handlers (catch-all)
    const allHandlers = this.messageHandlers.get('*');
    if (allHandlers) {
      allHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in catch-all handler for message type '${message.type}':`, error);
        }
      });
    }
  }
  
  // Set player name
  setPlayerName(name: string) {
    this._playerName = name;
    return this.send('set-name', { name });
  }
  
  // Create a new game room
  createRoom() {
    return this.send('create-room');
  }
  
  // Join an existing game room
  joinRoom(roomId: string) {
    // Store the room ID we're trying to join in case we need to retry
    this._pendingJoinRoomId = roomId;
    
    // Clear any existing join timeout
    if (this._joinTimeout) {
      clearTimeout(this._joinTimeout);
    }
    
    // Set a timeout to clear the pending join if it doesn't complete
    this._joinTimeout = setTimeout(() => {
      console.log(`Join room timeout for room ${roomId}`);
      this._pendingJoinRoomId = null;
      this._joinTimeout = null;
      
      // Dispatch a custom timeout event
      const handlers = this.messageHandlers.get('join-timeout');
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler({ 
              type: 'join-timeout', 
              data: { roomId } 
            });
          } catch (error) {
            console.error('Error in join-timeout handler', error);
          }
        });
      }
    }, 5000);
    
    return this.send('join-room', { roomId });
  }
  
  // Set player ready status
  setReady() {
    if (this._isHost) {
      this._hostReady = true;
    } else {
      this._guestReady = true;
    }
    return this.send('player-ready');
  }
  
  // Send a game update
  sendGameUpdate(data: any) {
    return this.send('game-update', data);
  }
  
  // Request game restart
  requestRestart() {
    return this.send('restart-game');
  }
  
  // Check if both players are ready
  areBothPlayersReady(): boolean {
    return this._hostReady && this._guestReady;
  }
  
  // Force reconnect as a specific player type in a room
  async forceReconnect(asHost: boolean, roomId: string) {
    // Disconnect first
    this.disconnect();
    
    // Connect again
    await this.connect();
    
    // Depending on whether we're reconnecting as host or guest
    if (asHost) {
      this._isHost = true;
      this._roomId = roomId;
      // Could send a custom message to server to recover host status
    } else {
      this._pendingJoinRoomId = roomId;
      // Try to join the room again
      this.joinRoom(roomId);
    }
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();

// Export default for convenience
export default websocketService;

// Helper function to get correct WebSocket URL based on environment
export function getWebSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}/ws/game`;
}