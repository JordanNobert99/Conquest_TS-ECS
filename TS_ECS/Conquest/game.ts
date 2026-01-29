import { World, Services } from '../ECS/core';
import { ComponentRegistry } from '../ECS/componentRegistry';
import {
    InputService,
    Camera2D,
    RenderScaler,
    AssetManager,
    AudioService,
    EventService,
    TimeService,
    SceneManager
} from '../ECS/services';
import { GameLoop } from '../ECS/gameLoop';
import { GameConfig } from '../ECS/config';
import { EntityFactory } from '../Conquest/src/entityFactory';
import { MovementSystem, RenderSystem, PlayerInputSystem } from '../ECS/systems';
import { Transform, Velocity, Sprite } from '../ECS/components';
import { LoginManager } from './loginManager';

export class Game {
    private world: World;
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;
    private gameLoop: GameLoop;
    private playerId: number = -1;
    private debugMode: boolean = false;
    private loginManager: LoginManager;
    private isGameLoaded: boolean = false;

    constructor() {
        // Get canvas
        this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        if (!this.canvas) {
            throw new Error('Canvas element not found');
        }

        const ctx = this.canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get 2D context');
        }
        this.context = ctx;

        // Initialize world
        this.world = new World();

        // Setup services
        this.initializeServices();

        // Initialize component registry
        ComponentRegistry.initialize();

        // Create game loop
        this.gameLoop = new GameLoop(
            (deltaTime) => this.update(deltaTime),
            (fixedDeltaTime) => this.fixedUpdate(fixedDeltaTime),
            () => this.draw()
        );

        // Setup debug toggle
        this.setupDebugToggle();

        // Initialize login manager - game will start after login
        this.loginManager = new LoginManager(() => this.onLoginSuccess());
    }

    private async onLoginSuccess(): Promise<void> {
        if (!this.isGameLoaded) {
            await this.load();
            this.isGameLoaded = true;
        }
        this.start();

        // Log admin status
        if (this.loginManager.isAdmin()) {
            console.log('🔑 Admin access granted');
            // You can add admin-specific features here
            this.enableAdminFeatures();
        }
    }

    private enableAdminFeatures(): void {
        // Add admin-specific functionality
        window.addEventListener('keydown', (e) => {
            if (e.code === 'F1') {
                e.preventDefault();
                console.log('Admin panel (to be implemented)');
                // Show admin panel UI
            }
        });

        // Add admin indicator to debug info
        const debugInfo = document.getElementById('debug-info');
        if (debugInfo) {
            const adminItem = document.createElement('div');
            adminItem.className = 'debug-item';
            adminItem.innerHTML = '<span style="color: #ffd700;">⭐ ADMIN MODE</span>';
            debugInfo.insertBefore(adminItem, debugInfo.firstChild);
        }
    }

    private initializeServices(): void {
        // Input Service
        const inputService = new InputService(this.canvas);
        Services.register(InputService, inputService);

        // Render Scaler
        const renderScaler = new RenderScaler(
            this.canvas,
            GameConfig.VIRTUAL_WIDTH,
            GameConfig.VIRTUAL_HEIGHT,
            GameConfig.SCALE_MODE
        );
        Services.register(RenderScaler, renderScaler);

        // Camera
        const camera = new Camera2D(
            renderScaler.getVirtualWidth(),
            renderScaler.getVirtualHeight()
        );
        Services.register(Camera2D, camera);

        // Asset Manager
        const assetManager = new AssetManager();
        Services.register(AssetManager, assetManager);

        // Audio Service
        const audioService = new AudioService(assetManager);
        Services.register(AudioService, audioService);

        // Event Service
        const eventService = new EventService();
        Services.register(EventService, eventService);

        // Time Service
        const timeService = new TimeService();
        Services.register(TimeService, timeService);

        // Scene Manager
        const sceneManager = new SceneManager();
        Services.register(SceneManager, sceneManager);
    }

    async load(): Promise<void> {
        const loadingScreen = document.getElementById('loading-screen');
        const loadingProgress = document.getElementById('loadingProgress') as HTMLElement;
        const loadingText = document.getElementById('loadingText') as HTMLElement;

        // Update loading progress
        const updateProgress = (progress: number, text: string) => {
            if (loadingProgress) loadingProgress.style.width = `${progress}%`;
            if (loadingText) loadingText.textContent = text;
        };

        try {
            // Load assets
            updateProgress(10, 'Loading assets...');
            await this.loadAssets();

            updateProgress(50, 'Creating world...');
            await this.createGameWorld();

            updateProgress(80, 'Initializing systems...');
            this.initializeSystems();

            updateProgress(100, 'Ready!');

            // Hide loading screen
            setTimeout(() => {
                if (loadingScreen) {
                    loadingScreen.classList.add('hidden');
                }
            }, 500);

        } catch (error) {
            console.error('Failed to load game:', error);
            if (loadingText) {
                loadingText.textContent = 'Failed to load game. Check console for details.';
            }
        }
    }

    private async loadAssets(): Promise<void> {
        const assets = Services.get(AssetManager);

        // Load placeholder assets (you can replace these with real assets)
        // For now, we'll just wait a bit to simulate loading
        await new Promise(resolve => setTimeout(resolve, 500));

        // Example: Load actual assets
        // await assets.loadImage('player', '/assets/images/player.png');
        // await assets.loadImage('enemy', '/assets/images/enemy.png');
        // await assets.loadAudio('bgm', '/assets/audio/music.mp3');

        await assets.waitForAll();
    }

    private async createGameWorld(): Promise<void> {
        const factory = new EntityFactory(this.world);

        // Create player
        this.playerId = factory.createPlayer(400, 300);

        // Create some test entities
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * 800;
            const y = Math.random() * 600;
            factory.createEnemy(x, y);
        }
    }

    private initializeSystems(): void {
        // Add systems to world
        this.world.addSystem(new PlayerInputSystem(this.world, this.playerId));
        this.world.addSystem(new MovementSystem(this.world));
        this.world.addSystem(new RenderSystem(this.world));
    }

    private update(deltaTime: number): void {
        // Update services
        const input = Services.get(InputService);
        input.update();

        // Update world
        this.world.update(deltaTime);

        // Update debug info
        if (this.debugMode) {
            this.updateDebugInfo(deltaTime);
        }
    }

    private fixedUpdate(fixedDeltaTime: number): void {
        this.world.fixedUpdate(fixedDeltaTime);
    }

    private draw(): void {
        // Clear canvas
        this.context.fillStyle = '#1a1a2e';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw world
        this.world.draw(this.context);
    }

    private setupDebugToggle(): void {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'F3') {
                e.preventDefault();
                this.debugMode = !this.debugMode;
                const debugInfo = document.getElementById('debug-info');
                if (debugInfo) {
                    debugInfo.classList.toggle('hidden', !this.debugMode);
                }
            }
        });
    }

    private updateDebugInfo(deltaTime: number): void {
        const fps = Math.round(1 / deltaTime);
        const entityCount = this.world.getAllEntities().length;

        const fpsElement = document.getElementById('fps');
        const entityCountElement = document.getElementById('entityCount');

        if (fpsElement) fpsElement.textContent = fps.toString();
        if (entityCountElement) entityCountElement.textContent = entityCount.toString();
    }

    start(): void {
        this.gameLoop.start();
    }

    stop(): void {
        this.gameLoop.stop();
    }
}

// Initialize game (login will show first)
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});