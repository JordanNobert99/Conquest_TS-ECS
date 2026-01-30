import { World, Services } from '../../../ECS/core';
import { SceneManager, BaseScene, AudioService } from '../../../ECS/services';

export class SettingsScene extends BaseScene {
    private settingsContainer: HTMLElement | null = null;

    load(): void {
        console.log('⚙️ Settings Scene Loaded');
        this.createSettingsUI();
    }

    unload(): void {
        console.log('⚙️ Settings Scene Unloaded');
        if (this.settingsContainer) {
            this.settingsContainer.remove();
            this.settingsContainer = null;
        }
    }

    private createSettingsUI(): void {
        this.settingsContainer = document.createElement('div');
        this.settingsContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            padding: 3rem;
            border-radius: 20px;
            z-index: 1000;
            color: white;
            min-width: 400px;
        `;

        this.settingsContainer.innerHTML = `
            <h1 style="font-size: 2rem; margin-bottom: 2rem; color: #667eea;">Settings</h1>
            
            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem;">Master Volume</label>
                <input type="range" id="master-volume" min="0" max="100" value="100" 
                    style="width: 100%;">
            </div>

            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem;">Music Volume</label>
                <input type="range" id="music-volume" min="0" max="100" value="100" 
                    style="width: 100%;">
            </div>

            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem;">SFX Volume</label>
                <input type="range" id="sfx-volume" min="0" max="100" value="100" 
                    style="width: 100%;">
            </div>

            <button id="back-btn" style="
                padding: 1rem 3rem;
                font-size: 1.2rem;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                width: 100%;
            ">Back to Menu</button>
        `;

        document.body.appendChild(this.settingsContainer);

        // Setup volume controls
        const audio = Services.get(AudioService);

        document.getElementById('master-volume')?.addEventListener('input', (e) => {
            const value = parseInt((e.target as HTMLInputElement).value) / 100;
            audio.setMasterVolume(value);
        });

        document.getElementById('music-volume')?.addEventListener('input', (e) => {
            const value = parseInt((e.target as HTMLInputElement).value) / 100;
            audio.setMusicVolume(value);
        });

        document.getElementById('sfx-volume')?.addEventListener('input', (e) => {
            const value = parseInt((e.target as HTMLInputElement).value) / 100;
            audio.setSFXVolume(value);
        });

        document.getElementById('back-btn')?.addEventListener('click', () => {
            const sceneManager = Services.get(SceneManager);
            sceneManager.loadScene('menu');
        });
    }

    update(deltaTime: number): void {
        // Settings doesn't need updates
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