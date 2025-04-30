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
  
  // Getter for player properties
  get playerId(): string | null { return this._playerId; }
  get playerName(): string | null { return this._playerName; }
  get isHost(): boolean { return this._isHost; }
  get roomId(): string | null { return this._roomId; }
  get isConnected(): boolean { return this._connected; }
  get peerName(): string | null { return this._peerName; }
  
  // Connect to the WebSocket server
  connect(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected');
        this._connected = true;
        resolve(true);
        return;
      }
      
      // Get the current host and port
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const host = window.location.host;
      
      // Create WebSocket connection with the specific path
      this.socket = new WebSocket(`${protocol}://${host}/ws/game`);
      
      // Connection opened
      this.socket.addEventListener('open', () => {
        console.log('WebSocket connection established');
        this._connected = true;
        resolve(true);
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
    
    this._connected = false;
    this._playerId = null;
    this._playerName = null;
    this._isHost = false;
    this._roomId = null;
    this._peerName = null;
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
        break;
        
      case 'room-joined':
        this._roomId = message.data.roomId;
        this._isHost = false;
        this._peerName = message.data.host;
        break;
        
      case 'player-joined':
        this._peerName = message.data.guest;
        break;
        
      case 'game-start':
        this._isHost = message.data.isHost;
        if (this._isHost) {
          this._peerName = message.data.guestName;
        } else {
          this._peerName = message.data.hostName;
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
    return this.send('join-room', { roomId });
  }
  
  // Set player ready status
  setReady() {
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
}

// Create singleton instance
export const websocketService = new WebSocketService();

// Export default for convenience
export default websocketService;