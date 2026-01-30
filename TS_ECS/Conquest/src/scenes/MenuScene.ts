import { World, Services } from '../../../ECS/core';
import { InputService, SceneManager, BaseScene } from '../../../ECS/services';

export class MenuScene extends BaseScene {
    private menuContainer: HTMLElement | null = null;

    load(): void {
        console.log('📋 Menu Scene Loaded');
        this.createMenuUI();
    }

    unload(): void {
        console.log('📋 Menu Scene Unloaded');
        if (this.menuContainer) {
            this.menuContainer.remove();
            this.menuContainer = null;
        }
    }

    private createMenuUI(): void {
        this.menuContainer = document.createElement('div');
        this.menuContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            padding: 3rem;
            border-radius: 20px;
            text-align: center;
            z-index: 1000;
            color: white;
        `;

        this.menuContainer.innerHTML = `
            <h1 style="font-size: 3rem; margin-bottom: 2rem; color: #667eea;">Conquest</h1>
            <button id="play-btn" style="
                padding: 1rem 3rem;
                font-size: 1.5rem;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                margin: 0.5rem;
            ">Play Game</button>
            <br>
            <button id="settings-btn" style="
                padding: 1rem 3rem;
                font-size: 1.5rem;
                background: rgba(255, 255, 255, 0.1);
                color: white;
                border: 2px solid #667eea;
                border-radius: 10px;
                cursor: pointer;
                margin: 0.5rem;
            ">Settings</button>
        `;

        document.body.appendChild(this.menuContainer);

        // Add event listeners
        const playBtn = document.getElementById('play-btn');
        const settingsBtn = document.getElementById('settings-btn');

        playBtn?.addEventListener('click', () => {
            const sceneManager = Services.get(SceneManager);
            sceneManager.loadScene('game');
        });

        settingsBtn?.addEventListener('click', () => {
            const sceneManager = Services.get(SceneManager);
            sceneManager.loadScene('settings');
        });
    }

    update(deltaTime: number): void {
        // Menu doesn't need world updates
    }

    draw(context: CanvasRenderingContext2D): void {
        // Clear with a nice gradient
        const gradient = context.createLinearGradient(0, 0, 0, context.canvas.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        context.fillStyle = gradient;
        context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    }
}