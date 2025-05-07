import { EventEmitter } from "events";

// Multiplayer WebSocket service
class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private isReconnecting = false;
  private roomId: string | null = null;
  private playerName: string | null = null;
  private isHost = false;
  private selectedCharacter: string | null = null;
  private peerCharacter: string | null = null;
  private peerName: string | null = null;

  constructor() {
    super();
    // Use environment variable or default to localhost for WebSocket URL
    this.url = import.meta.env.VITE_WS_URL || "ws://localhost:5000/ws";
  }

  // Connect to WebSocket server
  async connect(): Promise<boolean> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log("WebSocket already connected");
      return true;
    }

    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log("WebSocket connected");
          this.isReconnecting = false;
          this.startPingInterval();
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log("WebSocket message received:", message.type);
            this.emit(message.type, message);
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        this.ws.onclose = () => {
          console.log("WebSocket disconnected");
          this.clearPingInterval();

          // Don't attempt to reconnect if we explicitly closed the connection
          if (!this.isReconnecting) {
            this.tryReconnect();
          }
          resolve(false);
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          resolve(false);
        };
        
        // Set a connection timeout
        setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            console.log("WebSocket connection timed out");
            if (this.ws) {
              this.ws.close();
              this.ws = null;
            }
            resolve(false);
          }
        }, 5000);
        
      } catch (error) {
        console.error("Error connecting to WebSocket:", error);
        resolve(false);
      }
    });
  }

  // Disconnect from WebSocket server
  disconnect(): void {
    this.isReconnecting = true; // Flag that we're intentionally disconnecting
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.clearPingInterval();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    // Clear room state
    this.roomId = null;
    this.isHost = false;
  }

  // Try to reconnect to WebSocket server
  private tryReconnect(): void {
    if (this.isReconnecting || !this.roomId) return;

    this.isReconnecting = true;
    console.log("Attempting to reconnect WebSocket in 2 seconds...");

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(async () => {
      try {
        const success = await this.connect();
        
        // If we have room info, try to rejoin
        if (success && this.roomId && this.playerName) {
          if (this.isHost) {
            this.createRoom(this.playerName, this.roomId);
          } else {
            this.joinRoom(this.roomId, this.playerName);
          }
          
          // Re-select character if we had one
          if (this.selectedCharacter) {
            this.selectCharacter(this.selectedCharacter);
          }
        }
      } catch (error) {
        console.error("Reconnect failed:", error);
        this.tryReconnect(); // Try again
      }
    }, 2000);
  }

  // Send a message to the WebSocket server
  private sendMessage(type: string, data: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not connected");
      this.tryReconnect();
      return;
    }

    this.ws.send(JSON.stringify({ type, data }));
  }

  // Start a ping interval to keep the connection alive
  private startPingInterval(): void {
    this.clearPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Send a ping message to keep the connection alive
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000); // Every 30 seconds
  }

  // Clear the ping interval
  private clearPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // Set player name
  setPlayerName(name: string): void {
    this.playerName = name;
  }

  // Create a new game room
  createRoom(playerName?: string, roomId?: string): void {
    if (playerName) {
      this.playerName = playerName;
    }
    this.isHost = true;
    this.sendMessage("create-room", { name: this.playerName || playerName, roomId });
  }

  // Join an existing game room
  joinRoom(roomId: string, playerName?: string): void {
    if (playerName) {
      this.playerName = playerName;
    }
    this.roomId = roomId;
    this.isHost = false;
    this.sendMessage("join-room", { roomId, name: this.playerName || playerName });
  }

  // Set player as ready
  setReady(): void {
    this.sendMessage("set-ready", { ready: true });
  }

  // Send game update (e.g., score change)
  sendGameUpdate(data: any): void {
    this.sendMessage("game-update", data);
  }

  // Send real-time position update for player and ball
  sendPositionUpdate(data: {
    player: {
      x: number;
      y: number;
      z: number;
      rotation: number;
    };
    ball?: {
      x: number;
      y: number;
      z: number;
      velocityX?: number;
      velocityY?: number;
      velocityZ?: number;
      angularVelocityX?: number;
      angularVelocityY?: number;
      angularVelocityZ?: number;
    };
  }): void {
    this.sendMessage("position-update", data);
  }

  // Request a game reset (host only)
  resetGame(): void {
    if (!this.isHost) {
      console.warn("Only host can reset the game");
      return;
    }
    this.sendMessage("game-reset", {});
  }

  // Request a game restart (can be initiated by any player)
  requestRestart(): void {
    this.sendMessage("game-restart", {});
  }

  // Select a character
  selectCharacter(character: string): void {
    this.selectedCharacter = character;
    this.sendMessage("select-character", { character });
  }

  // Store peer's character when they select it
  setPeerCharacter(character: string): void {
    this.peerCharacter = character;
  }

  // Store peer's name
  setPeerName(name: string): void {
    this.peerName = name;
  }

  // Check if connected to WebSocket server
  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // Check if player is host
  get isRoomHost(): boolean {
    return this.isHost;
  }

  // Get current room ID
  get currentRoomId(): string | null {
    return this.roomId;
  }

  // Store room ID when room is created or joined
  setRoomId(roomId: string): void {
    this.roomId = roomId;
  }
}

// Create a singleton instance of the WebSocket service
const websocketService = new WebSocketService();
export default websocketService;