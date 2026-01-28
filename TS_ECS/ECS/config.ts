export const GameConfig = {
    // Display
    VIRTUAL_WIDTH: 800,
    VIRTUAL_HEIGHT: 600,
    SCALE_MODE: 'fit' as 'fit' | 'fill' | 'stretch',
    
    // Network
    WEBSOCKET_URL: 'ws://localhost:8080',
    SIGNALING_URL: 'ws://localhost:8080/signaling',
    NETWORK_SEND_RATE: 20, // messages per second
    
    // Physics
    FIXED_TIME_STEP: 1 / 60,
    
    // Game
    PLAYER_SPEED: 200,
    MAX_PLAYERS: 4,
};