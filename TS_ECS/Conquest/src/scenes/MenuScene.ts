import { Services } from '../../../ECS/core';
import { SceneManager, BaseScene, MatchmakingService, Match } from '../../../ECS/services';
import { auth } from '../../firebase';

export class MenuScene extends BaseScene {
    private menuContainer: HTMLElement | null = null;
    private matchmaking: MatchmakingService;
    private isSearching: boolean = false;
    private currentMatch: Match | null = null;

    constructor(context: CanvasRenderingContext2D) {
        super(context);
        this.matchmaking = new MatchmakingService();
    }

    load(): void {
        console.log('📋 Menu Scene Loaded');
        this.createMenuUI();
    }

    unload(): void {
        console.log('📋 Menu Scene Unloaded');
        // ALWAYS leave queue when unloading, regardless of isSearching state
        this.matchmaking.leaveQueue();
        
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
            min-width: 400px;
        `;

        this.menuContainer.innerHTML = `
            <h1 style="font-size: 3rem; margin-bottom: 2rem; color: #667eea;">Conquest</h1>
            
            <div id="menu-buttons">
                <button id="play-btn" style="
                    padding: 1rem 3rem;
                    font-size: 1.5rem;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    margin: 0.5rem;
                    width: 100%;
                ">Find Match</button>
                
                <button id="settings-btn" style="
                    padding: 1rem 3rem;
                    font-size: 1.5rem;
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    border: 2px solid #667eea;
                    border-radius: 10px;
                    cursor: pointer;
                    margin: 0.5rem;
                    width: 100%;
                ">Settings</button>
            </div>

            <div id="matchmaking-status" style="display: none; margin-top: 2rem;">
                <div style="margin-bottom: 1rem;">
                    <div class="spinner" style="
                        border: 4px solid rgba(255, 255, 255, 0.1);
                        border-top: 4px solid #667eea;
                        border-radius: 50%;
                        width: 50px;
                        height: 50px;
                        animation: spin 1s linear infinite;
                        margin: 0 auto;
                    "></div>
                </div>
                <p style="font-size: 1.2rem; color: #667eea;">Searching for opponent...</p>
                <p id="queue-timer" style="font-size: 0.9rem; color: #888; margin-top: 0.5rem;">0:00</p>
                <button id="cancel-btn" style="
                    padding: 0.75rem 2rem;
                    font-size: 1rem;
                    background: #ff4444;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    margin-top: 1rem;
                ">Cancel</button>
            </div>

            <div id="match-found" style="display: none; margin-top: 2rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⚔️</div>
                <p style="font-size: 1.5rem; color: #44ff44; font-weight: bold;">Match Found!</p>
                <p id="opponent-name" style="font-size: 1.2rem; color: #888; margin-top: 0.5rem;"></p>
                <p style="font-size: 0.9rem; color: #888; margin-top: 1rem;">Starting game...</p>
            </div>

            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;

        document.body.appendChild(this.menuContainer);

        // Add event listeners
        const playBtn = document.getElementById('play-btn');
        const settingsBtn = document.getElementById('settings-btn');
        const cancelBtn = document.getElementById('cancel-btn');

        playBtn?.addEventListener('click', () => this.startMatchmaking());
        settingsBtn?.addEventListener('click', () => this.openSettings());
        cancelBtn?.addEventListener('click', () => this.cancelMatchmaking());
    }

    private async startMatchmaking(): Promise<void> {
        this.isSearching = true;

        // Show matchmaking UI
        const menuButtons = document.getElementById('menu-buttons');
        const matchmakingStatus = document.getElementById('matchmaking-status');

        if (menuButtons) menuButtons.style.display = 'none';
        if (matchmakingStatus) matchmakingStatus.style.display = 'block';

        // Start queue timer
        const startTime = Date.now();
        const timerInterval = setInterval(() => {
            if (!this.isSearching) {
                clearInterval(timerInterval);
                return;
            }
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            const timerElement = document.getElementById('queue-timer');
            if (timerElement) {
                timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);

        // Join matchmaking queue
        await this.matchmaking.joinQueue(
            (match) => this.onMatchFound(match),
            (error) => this.onMatchmakingError(error)
        );
    }

    private async cancelMatchmaking(): Promise<void> {
        this.isSearching = false;
        await this.matchmaking.leaveQueue();

        // Show menu buttons again
        const menuButtons = document.getElementById('menu-buttons');
        const matchmakingStatus = document.getElementById('matchmaking-status');

        if (menuButtons) menuButtons.style.display = 'block';
        if (matchmakingStatus) matchmakingStatus.style.display = 'none';
    }

    private onMatchFound(match: Match): void {
        console.log('🎮 Match found!', match);
        this.isSearching = false;
        this.currentMatch = match;

        // Show match found UI
        const matchmakingStatus = document.getElementById('matchmaking-status');
        const matchFoundDiv = document.getElementById('match-found');
        const opponentName = document.getElementById('opponent-name');

        if (matchmakingStatus) matchmakingStatus.style.display = 'none';
        if (matchFoundDiv) matchFoundDiv.style.display = 'block';

        // Determine opponent - FIXED: Use imported auth instead of require
        const user = auth.currentUser;
        const opponent = match.player1.userId === user?.uid ? match.player2 : match.player1;

        if (opponentName) {
            opponentName.textContent = `vs ${opponent.username}`;
        }

        // Start game after 3 seconds
        setTimeout(() => {
            const sceneManager = Services.get(SceneManager);
            // Pass match info to game scene
            (sceneManager.getCurrentScene() as any).matchId = match.id;
            sceneManager.loadScene('game');
        }, 3000);
    }

    private onMatchmakingError(error: string): void {
        console.error('❌ Matchmaking error:', error);
        alert(`Matchmaking error: ${error}`);
        this.cancelMatchmaking();
    }

    private openSettings(): void {
        const sceneManager = Services.get(SceneManager);
        sceneManager.loadScene('settings');
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