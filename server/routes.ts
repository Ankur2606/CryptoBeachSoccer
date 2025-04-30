import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { log } from "./vite";

export async function registerRoutes(app: Express): Promise<Server> {
  // Add API status route
  app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', message: 'Crypto Beach Soccer API is running' });
  });
  
  // Add WebSocket status route to help diagnose WebSocket issues
  app.get('/api/websocket-status', (req, res) => {
    res.json({ 
      status: 'ok', 
      message: 'WebSocket server should be available at /ws/game',
      host: req.headers.host,
      protocol: req.protocol,
      secure: req.secure,
      wsPath: '/ws/game'
    });
  });

  // Create HTTP server
  log('Creating HTTP server for both Express and WebSocket', 'server');
  const httpServer = createServer(app);

  return httpServer;
}
