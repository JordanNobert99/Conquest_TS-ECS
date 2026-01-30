// IMPORTS
// ========================================================
// Core ECS
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
import { LoginManager } from './loginManager';
import { MenuScene } from './src/scenes/MenuScene';
import { GameScene } from './src/scenes/GameScene';
import { SettingsScene } from './src/scenes/SettingsScene';
// =======================================================

// GAME CLASS
// =======================================================
export class Game {
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;
    private gameLoop: GameLoop;
    private debugMode: boolean = false;
    private loginManager: LoginManager;
    private isGameLoaded: boolean = false;
    private sceneManager: SceneManager;

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

        // Setup services
        this.initializeServices();

        // Get scene manager
        this.sceneManager = Services.get(SceneManager);

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
            this.enableAdminFeatures();
        }

        // Load menu scene
        this.sceneManager.loadScene('menu');
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

            updateProgress(50, 'Initializing scenes...');
            this.initializeScenes();

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
        await new Promise(resolve => setTimeout(resolve, 500));
        await assets.waitForAll();
    }

    private initializeScenes(): void {
        // Register all scenes
        this.sceneManager.registerScene('menu', new MenuScene(this.context));
        this.sceneManager.registerScene('game', new GameScene(this.context));
        this.sceneManager.registerScene('settings', new SettingsScene(this.context));
    }

    private update(deltaTime: number): void {
        // Update services
        const input = Services.get(InputService);
        input.update();

        // Update current scene
        this.sceneManager.update(deltaTime);

        // Update debug info
        if (this.debugMode) {
            this.updateDebugInfo(deltaTime);
        }
    }

    private fixedUpdate(fixedDeltaTime: number): void {
        // Fixed update current scene
        this.sceneManager.fixedUpdate(fixedDeltaTime);
    }

    private draw(): void {
        // Draw current scene
        this.sceneManager.draw(this.context);
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
        const currentScene = this.sceneManager.getCurrentSceneName();
        const entityCount = this.sceneManager.getCurrentScene()?.World.getAllEntities().length;

        if (entityCount == undefined || entityCount < 1) return;

        const fpsElement = document.getElementById('fps');
        const entityCountElement = document.getElementById('entityCount');

        if (fpsElement) fpsElement.textContent = fps.toString();
        if (entityCountElement) entityCountElement.textContent = entityCount.toString();

        // Add scene name to debug info
        let sceneElement = document.getElementById('current-scene');
        if (!sceneElement) {
            const debugInfo = document.getElementById('debug-info');
            if (debugInfo) {
                sceneElement = document.createElement('div');
                sceneElement.className = 'debug-item';
                sceneElement.id = 'current-scene';
                debugInfo.appendChild(sceneElement);
            }
        }
        if (sceneElement) {
            sceneElement.innerHTML = `Scene: <span>${currentScene || 'None'}</span>`;
        }
    }

    start(): void {
        this.gameLoop.start();
    }

    stop(): void {
        this.gameLoop.stop();
    }
}
// =======================================================

// Initialize game (login will show first)
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});