// Simple multiplayer manager using Socket.IO
// Handles connecting to server, sending/receiving player positions, and managing other players

import io from 'socket.io-client';

export class MultiplayerManager {
  constructor(scene) {
    this.scene = scene;
    this.socket = null;
    this.myId = null;
    this.players = {}; // Store all player data and sprites { id: { x, y, sprite, nameText } }
    this.isConnected = false;
  }
  
  // Connect to the multiplayer server
  connect() {
    // Connect to Socket.IO server at ngrok URL
    this.socket = io('https://gave-shininess-fall.ngrok-free.dev', {
      transports: ['websocket', 'polling']
    });
    
    // When successfully connected
    this.socket.on('connect', () => {
      console.log('Connected to multiplayer server!');
      this.isConnected = true;
      this.myId = this.socket.id;
      
      // Send my initial position to server
      this.sendPlayerPosition();
    });
    
    // When a new player joins the game
    this.socket.on('playerJoined', (playerData) => {
      console.log('Player joined:', playerData);
      
      // Don't create a sprite for ourselves
      if (playerData.id !== this.myId) {
        this.createOrUpdatePlayer(playerData.id, playerData);
      }
    });
    
    // When a player moves
    this.socket.on('playerMoved', (playerData) => {
      console.log('Player moved:', playerData);
      
      // Update the player's position
      if (playerData.id !== this.myId) {
        this.createOrUpdatePlayer(playerData.id, playerData);
      }
    });
    
    // When a player leaves the game
    this.socket.on('playerLeft', (playerId) => {
      console.log('Player left:', playerId);
      this.removePlayer(playerId);
    });
    
    // Handle disconnect
    this.socket.on('disconnect', () => {
      console.log('Disconnected from multiplayer server');
      this.isConnected = false;
    });
  }
  
  // Create or update a player sprite based on server data
  createOrUpdatePlayer(playerId, playerData) {
    const TILE_SIZE = 32; // Default tile size (matches CONFIG.TILE_SIZE)
    
    // Check if player already exists in our players object
    if (this.players[playerId]) {
      // Player exists - update their position
      const player = this.players[playerId];
      
      // Update stored position data
      player.x = playerData.x;
      player.y = playerData.y;
      
      // Smoothly move sprite to new position
      if (player.sprite && player.sprite.active) {
        this.scene.tweens.add({
          targets: player.sprite,
          x: playerData.x,
          y: playerData.y,
          duration: 100,
          ease: 'Linear'
        });
      }
      
      console.log('Updated player position:', playerId, playerData.x, playerData.y);
    } else {
      // Player doesn't exist - create new sprite
      
      // Create sprite for other player (use a different color to distinguish)
      const sprite = this.scene.add.sprite(playerData.x, playerData.y, 'player');
      sprite.setDisplaySize(TILE_SIZE, TILE_SIZE);
      sprite.setTint(0x00ffff); // Cyan tint for other players
      sprite.setDepth(10);
      
      // Add name label above player
      const nameText = this.scene.add.text(playerData.x, playerData.y - 20, `Player ${playerId.slice(0, 4)}`, {
        fontSize: '8px',
        fontFamily: '"Press Start 2P"',
        color: '#00ffff',
        stroke: '#000',
        strokeThickness: 2
      }).setOrigin(0.5);
      nameText.setDepth(11);
      
      // Store player data in players object
      this.players[playerId] = {
        x: playerData.x,
        y: playerData.y,
        sprite: sprite,
        nameText: nameText
      };
      
      console.log('Created new player:', playerId, playerData.x, playerData.y);
    }
  }
  
  // Remove a player when they disconnect
  removePlayer(playerId) {
    if (this.players[playerId]) {
      const player = this.players[playerId];
      
      // Destroy sprite and name text
      if (player.sprite) {
        player.sprite.destroy();
      }
      if (player.nameText) {
        player.nameText.destroy();
      }
      
      // Remove from players object
      delete this.players[playerId];
      
      console.log('Removed player:', playerId);
    }
  }
  
  // Send my current position to server
  sendPlayerPosition() {
    if (!this.isConnected || !this.socket) {
      return;
    }
    
    // Get player position
    const player = this.scene.player;
    if (!player) {
      return;
    }
    
    // Send position to server with x and y coordinates
    this.socket.emit('playerMove', {
      x: player.x,
      y: player.y
    });
    
    console.log('Sent position to server:', player.x, player.y);
  }
  
  // Update name label positions (call every frame)
  update() {
    // Update name positions to follow sprites
    Object.keys(this.players).forEach((id) => {
      const player = this.players[id];
      if (player && player.sprite && player.sprite.active && player.nameText) {
        // Keep name text positioned above sprite
        player.nameText.setPosition(player.sprite.x, player.sprite.y - 20);
      }
    });
  }
  
  // Disconnect from server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    // Clean up all players
    Object.keys(this.players).forEach((id) => {
      this.removePlayer(id);
    });
    
    this.players = {};
    this.isConnected = false;
  }
}
