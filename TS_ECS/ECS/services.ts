// IMPORTS
import { World } from './core';
import { auth, db } from '../Conquest/firebase';
import { collection, addDoc, onSnapshot, query, where, updateDoc, doc, deleteDoc, getDoc, getDocs, Timestamp, writeBatch, runTransaction } from 'firebase/firestore';

// INPUT
export class InputService {
    private keys: Map<string, boolean> = new Map();
    private keysPressed: Map<string, boolean> = new Map();
    private keysReleased: Map<string, boolean> = new Map();
    private mousePos = { x: 0, y: 0 };
    private mouseButtons: Map<number, boolean> = new Map();
    private mouseButtonsPressed: Map<number, boolean> = new Map();
    private mouseButtonsReleased: Map<number, boolean> = new Map();

    constructor(canvas: HTMLCanvasElement) {
        window.addEventListener('keydown', (e) => {
            if (!this.keys.get(e.code)) {
                this.keysPressed.set(e.code, true);
            }
            this.keys.set(e.code, true);
        });

        window.addEventListener('keyup', (e) => {
            this.keys.set(e.code, false);
            this.keysReleased.set(e.code, true);
        });

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            this.mousePos.x = e.clientX - rect.left;
            this.mousePos.y = e.clientY - rect.top;
        });

        canvas.addEventListener('mousedown', (e) => {
            if (!this.mouseButtons.get(e.button)) {
                this.mouseButtonsPressed.set(e.button, true);
            }
            this.mouseButtons.set(e.button, true);
        });

        canvas.addEventListener('mouseup', (e) => {
            this.mouseButtons.set(e.button, false);
            this.mouseButtonsReleased.set(e.button, true);
        });
    }

    isKeyDown(key: string): boolean {
        return this.keys.get(key) || false;
    }

    isKeyPressed(key: string): boolean {
        return this.keysPressed.get(key) ?? false;
    }

    isKeyReleased(key: string): boolean {
        return this.keysReleased.get(key) ?? false;
    }

    isMouseButtonDown(button: number = 0): boolean {
        return this.mouseButtons.get(button) ?? false;
    }

    isMouseButtonPressed(button: number = 0): boolean {
        return this.mouseButtonsPressed.get(button) ?? false;
    }

    isMouseButtonReleased(button: number = 0): boolean {
        return this.mouseButtonsReleased.get(button) ?? false;
    }

    getMousePosition(): { x: number; y: number } {
        return { ...this.mousePos };
    }

    update(): void {
        this.keysPressed.clear();
        this.keysReleased.clear();
        this.mouseButtonsPressed.clear();
        this.mouseButtonsReleased.clear();
    }
}

// CAMERA
export class Camera2D {
    public x: number = 0;
    public y: number = 0;
    public zoom: number = 1;
    public rotation: number = 0;

    constructor(
        private width: number,
        private height: number
    ) { }

    worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        const x = (worldX - this.x) * this.zoom + centerX;
        const y = (worldY - this.y) * this.zoom + centerY;

        return { x, y };
    }

    screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        const x = (screenX - centerX) / this.zoom + this.x;
        const y = (screenY - centerY) / this.zoom + this.y;

        return { x, y };
    }

    applyTransform(context: CanvasRenderingContext2D): void {
        context.translate(this.width / 2, this.height / 2);
        context.scale(this.zoom, this.zoom);
        context.rotate(this.rotation);
        context.translate(-this.x, -this.y);
    }

    updateSize(width: number, height: number): void {
        this.width = width;
        this.height = height;
    }
}

// RENDER SCALING
export class RenderScaler {
    private targetWidth: number;
    private targetHeight: number;
    private scale: number = 1;
    private offsetX: number = 0;
    private offsetY: number = 0;

    constructor(
        private canvas: HTMLCanvasElement,
        targetWidth: number,
        targetHeight: number,
        private scaleMode: 'fit' | 'fill' | 'stretch' = 'fit'
    ) {
        this.targetWidth = targetWidth;
        this.targetHeight = targetHeight;
        this.updateScale();
        window.addEventListener('resize', () => this.updateScale());
    }

    private updateScale(): void {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        switch (this.scaleMode) {
            case 'fit':
                this.scale = Math.min(
                    windowWidth / this.targetWidth,
                    windowHeight / this.targetHeight
                );
                break;
            case 'fill':
                this.scale = Math.max(
                    windowWidth / this.targetWidth,
                    windowHeight / this.targetHeight
                );
                break;
            case 'stretch':
                this.canvas.width = windowWidth;
                this.canvas.height = windowHeight;
                return;
        }

        this.canvas.width = this.targetWidth * this.scale;
        this.canvas.height = this.targetHeight * this.scale;
        this.offsetX = (windowWidth - this.canvas.width) / 2;
        this.offsetY = (windowHeight - this.canvas.height) / 2;

        this.canvas.style.left = `${this.offsetX}px`;
        this.canvas.style.top = `${this.offsetY}px`;
    }

    getVirtualWidth(): number {
        return this.targetWidth;
    }

    getVirtualHeight(): number {
        return this.targetHeight;
    }

    getScale(): number {
        return this.scale;
    }
}

// ASSET MANAGER
export class AssetManager {
    private images: Map<string, HTMLImageElement> = new Map();
    private audio: Map<string, HTMLAudioElement> = new Map();
    private data: Map<string, any> = new Map();
    private loadingPromises: Promise<void>[] = [];

    loadImage(key: string, url: string): Promise<void> {
        const promise = new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.images.set(key, img);
                resolve();
            };
            img.onerror = reject;
            img.src = url;
        });
        this.loadingPromises.push(promise);
        return promise;
    }

    loadAudio(key: string, url: string): Promise<void> {
        const promise = new Promise<void>((resolve, reject) => {
            const audio = new Audio(url);
            audio.oncanplaythrough = () => {
                this.audio.set(key, audio);
                resolve();
            };
            audio.onerror = reject;
        });
        this.loadingPromises.push(promise);
        return promise;
    }

    loadJSON(key: string, url: string): Promise<void> {
        const promise = fetch(url)
            .then(response => response.json())
            .then(data => {
                this.data.set(key, data);
            });
        this.loadingPromises.push(promise);
        return promise;
    }

    async waitForAll(): Promise<void> {
        await Promise.all(this.loadingPromises);
        this.loadingPromises = [];
    }

    getImage(key: string): HTMLImageElement | undefined {
        return this.images.get(key);
    }

    getAudio(key: string): HTMLAudioElement | undefined {
        return this.audio.get(key);
    }

    getData(key: string): any {
        return this.data.get(key);
    }
}

// SCENE MANAGER
export interface Scene {
    load?(): void;
    unload?(): void;
    update?(deltaTime: number): void;
    fixedUpdate?(fixedDeltaTime: number): void;
    draw?(context: CanvasRenderingContext2D): void;
}

export abstract class BaseScene implements Scene {
    protected world: World;
    protected context: CanvasRenderingContext2D;
    public World: World;

    constructor(context: CanvasRenderingContext2D) {
        this.world = new World();
        this.context = context;
        this.World = this.world;
    }

    abstract load(): void;
    abstract unload(): void;

    update(deltaTime: number): void {
        this.world.update(deltaTime);
    }

    fixedUpdate(fixedDeltaTime: number): void {
        this.world.fixedUpdate(fixedDeltaTime);
    }

    draw(context: CanvasRenderingContext2D): void {
        this.world.draw(context);
    }
}
export class SceneManager {
    private scenes: Map<string, BaseScene> = new Map();
    private currentScene: BaseScene | null = null;
    private currentSceneName: string | null = null;

    registerScene(name: string, scene: BaseScene): void {
        this.scenes.set(name, scene);
    }

    loadScene(name: string): void {
        const scene = this.scenes.get(name);
        if (!scene) {
            throw new Error(`Scene ${name} not found`);
        }

        if (this.currentScene) {
            this.currentScene.unload?.();
        }

        this.currentScene = scene;
        this.currentSceneName = name;
        this.currentScene.load?.();
    }

    getCurrentScene(): BaseScene | null {
        return this.currentScene;
    }

    getCurrentSceneName(): string | null {
        return this.currentSceneName;
    }

    update(deltaTime: number): void {
        this.currentScene?.update?.(deltaTime);
    }

    fixedUpdate(fixedDeltaTime: number): void {
        this.currentScene?.fixedUpdate?.(fixedDeltaTime);
    }

    draw(context: CanvasRenderingContext2D): void {
        this.currentScene?.draw?.(context);
    }
}

// AUDIO
export class AudioService {
    private masterVolume: number = 1;
    private musicVolume: number = 1;
    private sfxVolume: number = 1;
    private currentMusic: HTMLAudioElement | null = null;

    constructor(private assetManager: AssetManager) { }

    playMusic(key: string, loop: boolean = true): void {
        this.stopMusic();
        const audio = this.assetManager.getAudio(key);
        if (audio) {
            audio.loop = loop;
            audio.volume = this.masterVolume * this.musicVolume;
            audio.play();
            this.currentMusic = audio;
        }
    }

    stopMusic(): void {
        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
            this.currentMusic = null;
        }
    }

    playSFX(key: string, volume: number = 1): void {
        const audio = this.assetManager.getAudio(key);
        if (audio) {
            const clone = audio.cloneNode() as HTMLAudioElement;
            clone.volume = this.masterVolume * this.sfxVolume * volume;
            clone.play();
        }
    }

    setMasterVolume(volume: number): void {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.currentMusic) {
            this.currentMusic.volume = this.masterVolume * this.musicVolume;
        }
    }

    setMusicVolume(volume: number): void {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.currentMusic) {
            this.currentMusic.volume = this.masterVolume * this.musicVolume;
        }
    }

    setSFXVolume(volume: number): void {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }
}

// TIME
export class TimeService {
    private serverTime: number = 0;
    private clientTime: number = 0;
    private timeDifference: number = 0;
    private rtt: number = 0;

    updateServerTime(serverTime: number, sentAt: number): void {
        const now = performance.now();
        this.rtt = now - sentAt;
        this.timeDifference = serverTime - (now - this.rtt / 2);
    }

    getServerTime(): number {
        return performance.now() + this.timeDifference;
    }

    getRTT(): number {
        return this.rtt;
    }
}

// EVENTS
export class EventService {
    private listeners: Map<string, ((data?: any) => void)[]> = new Map();

    on(event: string, callback: (data?: any) => void): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    }

    off(event: string, callback: (data?: any) => void): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event: string, data?: any): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }
    }

    clear(): void {
        this.listeners.clear();
    }
}

// NETWORKING
export class NetworkService {
    private socket: WebSocket | null = null;
    private messageHandlers: Map<string, ((data: any) => void)[]> = new Map();
    private messageQueue: { type: string; data: any }[] = [];
    private sendRate: number = 20;
    private lastSendTime: number = 0;
    private reliableMessages: Map<number, { type: string; data: any; callback?: () => void }> = new Map();
    private messageIdCounter: number = 0;

    connect(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.socket = new WebSocket(url);

            this.socket.onopen = () => resolve();
            this.socket.onerror = (error) => reject(error);

            this.socket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);

                    if (message.type === 'ack' && message.messageId !== undefined) {
                        const reliableMsg = this.reliableMessages.get(message.messageId);
                        if (reliableMsg?.callback) {
                            reliableMsg.callback();
                        }
                        this.reliableMessages.delete(message.messageId);
                        return;
                    }

                    const handlers = this.messageHandlers.get(message.type) ?? [];
                    handlers.forEach(handler => handler(message.data));
                } catch (e) {
                    console.error('Failed to parse message:', e);
                }
            };
        });
    }

    send(type: string, data: any, reliable: boolean = false): void {
        if (reliable) {
            this.sendReliable(type, data);
        } else {
            this.messageQueue.push({ type, data });
        }
    }

    sendImmediate(type: string, data: any): void {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type, data }));
        }
    }

    private sendReliable(type: string, data: any, callback?: () => void): void {
        const messageId = this.messageIdCounter++;
        this.reliableMessages.set(messageId, { type, data, callback });

        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type, data, messageId, reliable: true }));
        }
    }

    update(): void {
        const now = performance.now();
        const interval = 1000 / this.sendRate;

        if (now - this.lastSendTime >= interval && this.messageQueue.length > 0) {
            const message = this.messageQueue.shift()!;
            this.sendImmediate(message.type, message.data);
            this.lastSendTime = now;
        }
    }

    on(type: string, handler: (data: any) => void): void {
        if (!this.messageHandlers.has(type)) {
            this.messageHandlers.set(type, []);
        }
        this.messageHandlers.get(type)!.push(handler);
    }

    off(type: string, handler: (data: any) => void): void {
        const handlers = this.messageHandlers.get(type);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    disconnect(): void {
        this.socket?.close();
        this.socket = null;
        this.messageQueue = [];
        this.reliableMessages.clear();
    }

    isConnected(): boolean {
        return this.socket?.readyState === WebSocket.OPEN;
    }

    setSendRate(messagesPerSecond: number): void {
        this.sendRate = messagesPerSecond;
    }
}
export class NetworkReplicationService {
    private replicatedEntities: Set<number> = new Set();
    private snapshotBuffer: Map<number, any[]> = new Map();
    private interpolationDelay: number = 100;

    constructor(
        private world: any,
        private network: NetworkService
    ) {
        this.network.on('entity_update', (data) => this.handleEntityUpdate(data));
        this.network.on('entity_create', (data) => this.handleEntityCreate(data));
        this.network.on('entity_destroy', (data) => this.handleEntityDestroy(data));
    }

    replicateEntity(entityId: number): void {
        this.replicatedEntities.add(entityId);
    }

    sendEntityState(entityId: number): void {
        const entityData = this.world.serializeEntity(entityId);
        this.network.send('entity_state', entityData);
    }

    sendSnapshot(): void {
        const snapshot: any[] = [];
        this.replicatedEntities.forEach(entityId => {
            snapshot.push(this.world.serializeEntity(entityId));
        });
        this.network.send('snapshot', {
            timestamp: performance.now(),
            entities: snapshot
        });
    }

    private handleEntityUpdate(data: any): void {
        const { networkId, components } = data;
        let entityId = this.world.getEntityByNetworkId(networkId);

        if (entityId === undefined) {
            entityId = this.world.createNetworkEntity(networkId);
        }
    }

    private handleEntityCreate(data: any): void {
        const { networkId, components } = data;
        const entityId = this.world.createNetworkEntity(networkId);
    }

    private handleEntityDestroy(data: any): void {
        const { networkId } = data;
        const entityId = this.world.getEntityByNetworkId(networkId);
        if (entityId !== undefined) {
            this.world.destroyEntity(entityId);
        }
    }

    update(deltaTime: number): void {
        // Implement snapshot interpolation logic here
    }
}
export class P2PNetworkService {
    private peerConnections: Map<string, RTCPeerConnection> = new Map();
    private dataChannels: Map<string, RTCDataChannel> = new Map();
    private messageHandlers: Map<string, ((peerId: string, data: any) => void)[]> = new Map();
    private localPeerId: string = '';
    private signalingServer: WebSocket | null = null;

    constructor() {
        this.localPeerId = this.generatePeerId();
    }

    private generatePeerId(): string {
        return `peer_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Connect to signaling server (still need this for initial handshake)
    async connectToSignaling(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.signalingServer = new WebSocket(url);

            this.signalingServer.onopen = () => {
                this.signalingServer!.send(JSON.stringify({
                    type: 'register',
                    peerId: this.localPeerId
                }));
                resolve();
            };

            this.signalingServer.onerror = reject;

            // Handle signaling messages
            this.signalingServer.onmessage = (event) => {
                const message = JSON.parse(event.data);
                this.handleSignalingMessage(message);
            };
        });
    }

    // Create connection to another peer
    async connectToPeer(remotePeerId: string): Promise<void> {
        const peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        // Create data channel
        const dataChannel = peerConnection.createDataChannel('game', {
            ordered: false, // Faster, allows packet loss
            maxRetransmits: 0
        });

        this.setupDataChannel(remotePeerId, dataChannel);

        // ICE candidate handling
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignalingMessage({
                    type: 'ice-candidate',
                    to: remotePeerId,
                    from: this.localPeerId,
                    candidate: event.candidate
                });
            }
        };

        // Create and send offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        this.sendSignalingMessage({
            type: 'offer',
            to: remotePeerId,
            from: this.localPeerId,
            offer: offer
        });

        this.peerConnections.set(remotePeerId, peerConnection);
    }

    private setupDataChannel(peerId: string, channel: RTCDataChannel): void {
        channel.onopen = () => {
            console.log(`P2P connection established with ${peerId}`);
        };

        channel.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                const handlers = this.messageHandlers.get(message.type) ?? [];
                handlers.forEach(handler => handler(peerId, message.data));
            } catch (e) {
                console.error('Failed to parse P2P message:', e);
            }
        };

        channel.onerror = (error) => {
            console.error(`DataChannel error with ${peerId}:`, error);
        };

        this.dataChannels.set(peerId, channel);
    }

    private async handleSignalingMessage(message: any): Promise<void> {
        const { type, from, offer, answer, candidate } = message;

        switch (type) {
            case 'offer':
                await this.handleOffer(from, offer);
                break;
            case 'answer':
                await this.handleAnswer(from, answer);
                break;
            case 'ice-candidate':
                await this.handleIceCandidate(from, candidate);
                break;
        }
    }

    private async handleOffer(peerId: string, offer: RTCSessionDescriptionInit): Promise<void> {
        const peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        });

        // Handle incoming data channel
        peerConnection.ondatachannel = (event) => {
            this.setupDataChannel(peerId, event.channel);
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignalingMessage({
                    type: 'ice-candidate',
                    to: peerId,
                    from: this.localPeerId,
                    candidate: event.candidate
                });
            }
        };

        await peerConnection.setRemoteDescription(offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        this.sendSignalingMessage({
            type: 'answer',
            to: peerId,
            from: this.localPeerId,
            answer: answer
        });

        this.peerConnections.set(peerId, peerConnection);
    }

    private async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
        const peerConnection = this.peerConnections.get(peerId);
        if (peerConnection) {
            await peerConnection.setRemoteDescription(answer);
        }
    }

    private async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
        const peerConnection = this.peerConnections.get(peerId);
        if (peerConnection) {
            await peerConnection.addIceCandidate(candidate);
        }
    }

    private sendSignalingMessage(message: any): void {
        if (this.signalingServer?.readyState === WebSocket.OPEN) {
            this.signalingServer.send(JSON.stringify(message));
        }
    }

    // Send data to specific peer
    sendToPeer(peerId: string, type: string, data: any): void {
        const channel = this.dataChannels.get(peerId);
        if (channel?.readyState === 'open') {
            channel.send(JSON.stringify({ type, data }));
        }
    }

    // Broadcast to all connected peers
    broadcast(type: string, data: any): void {
        this.dataChannels.forEach((channel, peerId) => {
            if (channel.readyState === 'open') {
                channel.send(JSON.stringify({ type, data }));
            }
        });
    }

    // Listen for messages from peers
    on(type: string, handler: (peerId: string, data: any) => void): void {
        if (!this.messageHandlers.has(type)) {
            this.messageHandlers.set(type, []);
        }
        this.messageHandlers.get(type)!.push(handler);
    }

    // Get list of connected peers
    getConnectedPeers(): string[] {
        return Array.from(this.dataChannels.keys()).filter(
            peerId => this.dataChannels.get(peerId)?.readyState === 'open'
        );
    }

    // Disconnect from peer
    disconnectPeer(peerId: string): void {
        const channel = this.dataChannels.get(peerId);
        const connection = this.peerConnections.get(peerId);

        channel?.close();
        connection?.close();

        this.dataChannels.delete(peerId);
        this.peerConnections.delete(peerId);
    }

    // Disconnect from all peers
    disconnectAll(): void {
        this.dataChannels.forEach((channel) => channel.close());
        this.peerConnections.forEach((connection) => connection.close());
        this.dataChannels.clear();
        this.peerConnections.clear();
        this.signalingServer?.close();
    }

    getLocalPeerId(): string {
        return this.localPeerId;
    }
}

export interface MatchmakingPlayer {
    userId: string;
    username: string;
    rating?: number;
    timestamp: number;
}

export interface Match {
    id: string;
    player1: MatchmakingPlayer;
    player2: MatchmakingPlayer;
    status: 'waiting' | 'ready' | 'in-progress' | 'completed';
    createdAt: number;
}

interface QueuePlayer {
    id: string;
    userId: string;
    username: string;
    rating: number;
    timestamp: number;
    status: string;
}

export class MatchmakingService {
    private static instance: MatchmakingService | null = null;
    private queueRef = collection(db, 'matchmaking_queue');
    private matchesRef = collection(db, 'matches');
    private currentQueueId: string | null = null;
    private currentUserId: string | null = null;
    private matchListener: (() => void) | null = null;
    private queueListener: (() => void) | null = null;
    private isMatched: boolean = false;
    private heartbeatInterval: number | null = null;
    private isJoiningQueue: boolean = false;
    private isCreatingMatch: boolean = false;
    private initCleanupPromise!: Promise<void>;
    private authUnsub: (() => void) | null = null; // <- new
    private joinedAt: number | null = null;

    constructor() {
        if (MatchmakingService.instance) {
            return MatchmakingService.instance;
        }
        MatchmakingService.instance = this;

        this.setupBeforeUnloadCleanup();
        // SKIP constructor cleanup - it fails with permission errors on old docs
        this.initCleanupPromise = Promise.resolve();
        console.log('⚠️ Skipping constructor cleanup (manually delete old docs from Firebase Console)');

        // flag used to suppress noisy permission-denied logs while we rapidly unsubscribe
        (this as any).suppressPermissionWarnings = false;

        // Listen for auth state changes (covers other tabs signing in/out).
        // If auth changes to a different user while this tab has active matchmaking,
        // synchronously stop heartbeat and listeners to avoid permission-denied noise,
        // then do a best-effort async cleanup/remove.
        this.authUnsub = auth.onAuthStateChanged((user) => {
            try {
                // Signed out -> synchronous stop then async cleanup
                if (!user) {
                    // synchronously stop noisy operations
                    try { this.stopHeartbeat(); } catch { /* ignore */ }
                    try { this.matchListener && this.matchListener(); } catch { /* ignore */ }
                    try { this.queueListener && this.queueListener(); } catch { /* ignore */ }
                    this.matchListener = null;
                    this.queueListener = null;

                    // async cleanup (best-effort)
                    (async () => {
                        try {
                            if (this.currentQueueId) {
                                await this.removeFromQueue(this.currentQueueId);
                            }
                            await this.cleanup();
                        } catch (e) { /* ignore */ }
                    })();
                    return;
                }

                // Different user signed in (same browser / another tab)
                if (this.currentUserId && user.uid !== this.currentUserId) {
                    console.warn('⚠️ Auth changed to different user in this tab — cleaning up matchmaking state');

                    // suppress permission-denied logs while we unsubscribe synchronously
                    (this as any).suppressPermissionWarnings = true;

                    // Synchronously stop heartbeat/listeners to avoid new requests with wrong auth
                    try { this.stopHeartbeat(); } catch { /* ignore */ }
                    try { this.matchListener && this.matchListener(); } catch { /* ignore */ }
                    try { this.queueListener && this.queueListener(); } catch { /* ignore */ }
                    this.matchListener = null;
                    this.queueListener = null;

                    // Best-effort async removal + cleanup; do not block the auth change.
                    (async () => {
                        try {
                            if (this.currentQueueId) {
                                try { await this.removeFromQueue(this.currentQueueId); } catch (_) { /* ignore */ }
                            }
                            await this.cleanup();
                        } catch (_) { /* ignore */ }
                        // re-enable logging after async work completes
                        (this as any).suppressPermissionWarnings = false;
                    })();
                }
            } catch (e) {
                // avoid throwing from auth handler
                console.warn('⚠️ Error while handling auth state change:', e);
            }
        });
    }

    private setupBeforeUnloadCleanup(): void {
        window.addEventListener('beforeunload', () => {
            if (this.currentQueueId) {
                try {
                    deleteDoc(doc(this.queueRef, this.currentQueueId));
                } catch (e) { }
            }
        });

        document.addEventListener('visibilitychange', async () => {
            if (document.hidden && this.currentQueueId && !this.isMatched) {
                console.log('⚠️ Tab hidden, leaving queue...');
                await this.leaveQueue();
            }
        });
    }

    // NEW: Clean BOTH queue AND old matches
    private async cleanupEverything(): Promise<void> {
        try {
            // ensure fresh token so rules evaluate with current auth
            if (auth.currentUser) {
                await auth.currentUser.getIdToken(true);
            }
        } catch (tErr) {
            console.warn('⚠️ Token refresh failed (continuing):', tErr);
        }

        try {
            console.log('🧹 DELETING STALE QUEUE ENTRIES AND OLD MATCHES...');

            const queueSnapshot = await getDocs(query(this.queueRef));
            const now = Date.now();
            let deletionCount = 0;

            // DELETE ONLY STALE QUEUE ENTRIES (>30s without heartbeat)
            for (const docSnap of queueSnapshot.docs) {
                const data = docSnap.data();
                const age = now - (data.lastHeartbeat || data.timestamp);

                if (age > 30000) {
                    try {
                        await deleteDoc(doc(this.queueRef, docSnap.id));
                        deletionCount++;
                        console.log(`🗑️ Deleted stale queue entry: ${data.username} (${Math.floor(age / 1000)}s old)`);
                    } catch (e: any) {
                        // log and continue — permission errors for specific docs should not abort whole cleanup
                        console.warn(`⚠️ Failed to delete queue ${docSnap.id}:`, e.code ?? e.name, e.message ?? e);
                    }
                } else {
                    console.log(`✅ Keeping active queue entry: ${data.username} (${Math.floor(age / 1000)}s old)`);
                }
            }

            // QUERY ONLY stale matches (createdAt older than 60s) — avoids reading the whole collection
            const staleMatchesQuery = query(this.matchesRef, where('createdAt', '<', now - 60000));
            const matchesSnapshot = await getDocs(staleMatchesQuery);

            for (const docSnap of matchesSnapshot.docs) {
                try {
                    await deleteDoc(doc(this.matchesRef, docSnap.id));
                    deletionCount++;
                    console.log(`🗑️ Deleted old match: ${docSnap.id}`);
                } catch (e: any) {
                    console.warn(`⚠️ Failed to delete match ${docSnap.id}:`, e.code ?? e.name, e.message ?? e);
                }
            }

            console.log(`✅ Cleanup complete: deleted ${deletionCount} stale entries`);
        } catch (error: any) {
            // If the whole operation is blocked by rules, bail quietly — non-admin clients shouldn't spam errors.
            if (error?.code === 'permission-denied') {
                console.warn('⚠️ Cleanup aborted: insufficient permissions (permission-denied). This is expected for non-admin clients.');
                return;
            }
            console.error('❌ Cleanup error:', error.code ?? error.name, error.message ?? error);
        }
    }

    async joinQueue(onMatchFound: (match: Match) => void, onError: (error: string) => void): Promise<void> {
        const user = await this.waitForAuth();
        if (!user) {
            onError('Not authenticated');
            return;
        }

        if (this.isJoiningQueue) {
            console.log('⚠️ Already joining queue');
            return;
        }

        this.isJoiningQueue = true;
        this.isMatched = false;
        this.isCreatingMatch = false;
        this.currentUserId = user.uid;

        try {
            console.log('⏳ Waiting for init cleanup...');
            await this.initCleanupPromise;

            console.log('🧹 Step 1: DELETING EVERYTHING...');
            await this.cleanupEverything(); // CHANGED

            console.log('⏳ Step 2: Waiting 2s...');
            await new Promise(resolve => setTimeout(resolve, 2000));

            // record the moment we started joining BEFORE creating our queue doc
            this.joinedAt = Date.now();

            // Attach match + queue listeners BEFORE creating our queue doc or scanning.
            // This ensures we won't miss a match created by a near-simultaneous opponent.
            console.log('🎧 Step 3: Attaching match + queue listeners...');
            this.setupMatchListeners(user.uid, onMatchFound);
            this.setupQueueListener(user.uid);

            console.log('📝 Step 4: Adding to queue...');
            this.currentQueueId = await this.upsertQueueEntry(user);
            console.log('✅ Queue ID:', this.currentQueueId);

            // Small jitter helps reduce tight simultaneous-race frequency (optional)
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 20));

            // Immediately scan existing queue for opponents (handles the simultaneous-join race)
            await this.scanQueueForOpponents(user.uid);

            console.log('💓 Step 5: Starting heartbeat...');
            this.startHeartbeat();

            console.log('✅ Ready for matchmaking');

        } catch (error) {
            console.error('❌ Join error:', error);
            onError('Failed to join queue');
            await this.cleanup();
        } finally {
            this.isJoiningQueue = false;
        }
    }

    private async isValidOpponent(opponent: QueuePlayer, currentUserId: string): Promise<boolean> {
        if (opponent.userId === currentUserId || opponent.id === this.currentQueueId) {
            console.log(`❌ Same user/entry`);
            return false;
        }

        try {
            const docSnap = await getDoc(doc(this.queueRef, opponent.id));
            if (!docSnap.exists()) {
                console.log(`❌ Entry doesn't exist`);
                return false;
            }

            const data = docSnap.data();
            const age = Date.now() - (data.lastHeartbeat || data.timestamp || 0);

            // MATCH FIRESTORE RULES: only consider stale after 30s (30000ms)
            if (age > 30000) {
                console.log(`❌ Heartbeat too old (${Math.floor(age / 1000)}s)`);
                // Do NOT delete another user's doc from the client — rules prevent this.
                // Let cleanupEverything() or the owner remove stale entries.
                return false;
            }

            if (data.status !== 'searching') {
                console.log(`❌ Wrong status (${data.status})`);
                return false;
            }

            console.log(`✅ Valid (${Math.floor(age / 1000)}s old)`);
            return true;
        } catch (error: any) {
            // handle permission errors quietly and return false
            if (error?.code === 'permission-denied') {
                console.warn('⚠️ Validation error: permission-denied when reading opponent doc (treating as invalid)');
                return false;
            }
            console.error('❌ Validation error:', error);
            return false;
        }
    }

    private setupMatchListeners(userId: string, onMatchFound: (match: Match) => void): void {
    // remove createdAt filter (requires composite index). We'll filter client-side.
    const matchQuery1 = query(this.matchesRef, where('player1.userId', '==', userId), where('status', '==', 'ready'));
    const matchQuery2 = query(this.matchesRef, where('player2.userId', '==', userId), where('status', '==', 'ready'));

    // use the joinedAt recorded when joinQueue started (fallback to now)
    const joinedAt = this.joinedAt ?? Date.now();
    let hasFoundMatch = false; // LOCAL FLAG

    const handleMatch = async (match: Match) => {
        // ignore matches created before we started joining
        if ((match.createdAt || 0) <= joinedAt) {
            console.log('⏭️ Ignoring old match', match.id);
            return;
        }

        if (!this.isMatched && !hasFoundMatch) {
            hasFoundMatch = true;
            this.isMatched = true;
            console.log('✅ Match found:', match.id);
            await this.cleanup();
            onMatchFound(match);
        }
    };

    const unsubscribe1 = onSnapshot(matchQuery1, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' && !hasFoundMatch) {
                handleMatch({ id: change.doc.id, ...change.doc.data() } as Match);
            }
        });
    }, (err) => {
        console.error('❌ Match listener 1 error:', err.code ?? err.name, err.message ?? err);
        if (err?.code === 'permission-denied') {
            console.warn('⚠️ Unsubscribing match listener 1 due to permission-denied.');
            try { unsubscribe1(); } catch { /* ignore */ }
        }
    });

    const unsubscribe2 = onSnapshot(matchQuery2, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' && !hasFoundMatch) {
                handleMatch({ id: change.doc.id, ...change.doc.data() } as Match);
            }
        });
    }, (err) => {
        console.error('❌ Match listener 2 error:', err.code ?? err.name, err.message ?? err);
        if (err?.code === 'permission-denied') {
            console.warn('⚠️ Unsubscribing match listener 2 due to permission-denied.');
            try { unsubscribe2(); } catch { /* ignore */ }
        }
    });

    this.matchListener = () => {
        try { unsubscribe1(); } catch { /* ignore */ }
        try { unsubscribe2(); } catch { /* ignore */ }
    };
}

    private setupQueueListener(userId: string): void {
    const queueQuery = query(this.queueRef, where('status', '==', 'searching'));
    // declare so we can unsubscribe inside the error handler
    let unsubscribeQueue: (() => void) | null = null;

    unsubscribeQueue = onSnapshot(queueQuery, async (snapshot) => {
        if (this.isMatched || !this.currentQueueId || this.isCreatingMatch) return;

        for (const change of snapshot.docChanges()) {
            if (change.type === 'added' && !this.isCreatingMatch) {
                const data = change.doc.data();

                // ignore our own doc
                if (change.doc.id === this.currentQueueId) {
                    console.log('⏭️ Own entry');
                    continue;
                }

                // ignore same user (defensive)
                if (data.userId === userId) {
                    console.log('⚠️ Same userId');
                    continue;
                }

                this.isCreatingMatch = true;

                const potentialOpponent: QueuePlayer = {
                    id: change.doc.id,
                    userId: data.userId,
                    username: data.username,
                    rating: data.rating || 1000,
                    timestamp: data.timestamp,
                    status: data.status
                };

                console.log(`🔍 Validating: ${potentialOpponent.username}`);

                try {
                    if (await this.isValidOpponent(potentialOpponent, userId)) {
                        console.log(`🎯 Creating match with: ${potentialOpponent.username}`);
                        await this.createMatchFromQueue(auth.currentUser!, potentialOpponent);
                        break;
                    } else {
                        console.log(`❌ Invalid: ${potentialOpponent.username}`);
                        this.isCreatingMatch = false;
                    }
                } catch (err: any) {
                    // suppress logs if we're intentionally unsubscribing
                    if ((this as any).suppressPermissionWarnings && err?.code === 'permission-denied') {
                        try { unsubscribeQueue && unsubscribeQueue(); } catch { /* ignore */ }
                        this.queueListener = null;
                        this.isCreatingMatch = false;
                        return;
                    }

                    console.error('❌ Queue validation error:', err?.code ?? err?.name, err?.message ?? err);
                    if (err?.code === 'permission-denied') {
                        console.warn('⚠️ Unsubscribing queue listener due to permission-denied.');
                        try { unsubscribeQueue && unsubscribeQueue(); } catch { /* ignore */ }
                    }
                    this.isCreatingMatch = false;
                }
            }
        }
    }, (err) => {
        if ((this as any).suppressPermissionWarnings && err?.code === 'permission-denied') {
            try { unsubscribeQueue && unsubscribeQueue(); } catch { /* ignore */ }
            return;
        }
        console.error('❌ Queue listener error:', err.code ?? err.name, err.message ?? err);
        if (err?.code === 'permission-denied') {
            console.warn('⚠️ Queue listener unsubscribing due to permission-denied.');
            try { unsubscribeQueue && unsubscribeQueue(); } catch { /* ignore */ }
        }
    });

    this.queueListener = () => {
        try { unsubscribeQueue && unsubscribeQueue(); } catch { /* ignore */ }
    };
}

    private async createMatchFromQueue(currentUser: any, opponent: QueuePlayer): Promise<void> {
        if (this.isMatched) {
            console.log('⚠️ Already matched');
            return;
        }

        // prevent local races
        this.isCreatingMatch = true;

        if (!this.currentQueueId) {
            console.warn('⚠️ No currentQueueId when attempting to create match');
            this.isCreatingMatch = false;
            return;
        }

        const opponentRef = doc(this.queueRef, opponent.id);
        const currentRef = doc(this.queueRef, this.currentQueueId);
        const matchRef = doc(this.matchesRef); // auto-id

        try {
            await runTransaction(db, async (transaction) => {
                const oppSnap = await transaction.get(opponentRef);
                const curSnap = await transaction.get(currentRef);

                if (!oppSnap.exists()) throw new Error('opponent-removed');
                if (!curSnap.exists()) throw new Error('current-removed');

                const oppData: any = oppSnap.data();
                const curData: any = curSnap.data();

                const now = Date.now();
                const oppAge = now - (oppData.lastHeartbeat || oppData.timestamp || 0);
                const curAge = now - (curData.lastHeartbeat || curData.timestamp || 0);

                if (oppData.status !== 'searching') throw new Error('opponent-not-searching');
                if (curData.status !== 'searching') throw new Error('current-not-searching');

                if (oppAge > 10000 || curAge > 10000) throw new Error('stale-entry');

                const matchData: Omit<Match, 'id'> = {
                    player1: {
                        userId: currentUser.uid,
                        username: currentUser.email?.split('@')[0] || 'Player',
                        rating: 1000,
                        timestamp: Date.now()
                    },
                    player2: {
                        userId: opponent.userId,
                        username: oppData.username || opponent.username,
                        rating: opponent.rating,
                        timestamp: opponent.timestamp
                    },
                    status: 'ready',
                    createdAt: Date.now()
                };

                // create match and remove only the creator's queue entry (creator is allowed to delete their own doc)
                transaction.set(matchRef, matchData);
                transaction.delete(currentRef);
                // DO NOT delete opponentRef here — deletion of opponent queue doc must be performed by that user (or admin/cleanup)
            });

            console.log('✅ Match transaction succeeded');
            this.isMatched = true;

            // stop local matchmaking state and listeners; opponent will detect the match and remove their own entry
            await this.cleanup();

        } catch (error: any) {
            console.warn('❌ Match transaction failed:', error?.message ?? error);
            this.isMatched = false;
            this.isCreatingMatch = false;
        }
    }

    private async removeFromQueue(queueId: string | null): Promise<void> {
        if (!queueId) return;
        try {
            await deleteDoc(doc(this.queueRef, queueId));
            console.log(`🗑️ Removed: ${queueId}`);
        } catch (e) { }
    }

    private startHeartbeat(): void {
        this.heartbeatInterval = window.setInterval(async () => {
            if (this.currentQueueId && !this.isMatched) {
                try {
                    // refresh token to avoid intermittent permission failures
                    try {
                        if (auth.currentUser) await auth.currentUser.getIdToken(true);
                    } catch (tErr) {
                        console.warn('⚠️ Heartbeat token refresh failed (continuing):', tErr);
                    }

                    await updateDoc(doc(this.queueRef, this.currentQueueId), {
                        lastHeartbeat: Date.now()
                    });
                    console.log('💓');
                } catch (error: any) {
                    console.error('❌ Heartbeat failed:', error.code ?? error.name, error.message ?? error);
                    await this.cleanup();
                }
            }
        }, 5000);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatInterval !== null) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    async leaveQueue(): Promise<void> {
        console.log('👋 Leaving...');
        await this.removeFromQueue(this.currentQueueId);
        await this.cleanup();
    }

    private async cleanup(): Promise<void> {
        console.log('🧹 Cleanup...');

        this.stopHeartbeat();

        if (this.matchListener) {
            this.matchListener();
            this.matchListener = null;
        }
        if (this.queueListener) {
            this.queueListener();
            this.queueListener = null;
        }

        this.currentQueueId = null;
        this.currentUserId = null;
        // keep isMatched as-is (do not forcibly clear it here)
        this.isJoiningQueue = false;
        this.isCreatingMatch = false;
    }

    async updateMatchStatus(matchId: string, status: Match['status']): Promise<void> {
        try {
            await updateDoc(doc(this.matchesRef, matchId), { status });
        } catch (error) {
            console.error('❌ Update match status error:', error);
        }
    }

    async getMatch(matchId: string): Promise<Match | null> {
        try {
            const docSnap = await getDoc(doc(this.matchesRef, matchId));
            return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Match : null;
        } catch (error) {
            console.error('❌ Get match error:', error);
            return null;
        }
    }

    async forceCleanup(): Promise<void> {
        await this.cleanupEverything();
    }

    // Add helper inside MatchmakingService class (near other private helpers)
    private async upsertQueueEntry(user: any): Promise<string> {
        // If an active queue entry for this user exists, update it. Otherwise create one.
        const q = query(this.queueRef, where('userId', '==', user.uid), where('status', '==', 'searching'));
        const snapshot = await getDocs(q);

        // If multiple exist, keep the newest and remove the rest
        if (!snapshot.empty) {
            let newestDocId: string | null = null;
            let newestTimestamp = 0;
            for (const ds of snapshot.docs) {
                const data: any = ds.data();
                const ts = data.timestamp || 0;
                if (ts > newestTimestamp) {
                    newestTimestamp = ts;
                    newestDocId = ds.id;
                }
            }

            // update the newest with fresh heartbeat + timestamp
            if (newestDocId) {
                try {
                    await updateDoc(doc(this.queueRef, newestDocId), {
                        lastHeartbeat: Date.now(),
                        timestamp: Date.now(),
                        status: 'searching',
                        sessionId: `${user.uid}_${Date.now()}`
                    });
                } catch (e) {
                    // fallback: if update fails, create a new one
                    console.warn('⚠️ Failed to update existing queue entry, creating new one', e);
                    const newDoc = await addDoc(this.queueRef, {
                        userId: user.uid,
                        username: user.email?.split('@')[0] || 'Player',
                        rating: 1000,
                        timestamp: Date.now(),
                        status: 'searching',
                        lastHeartbeat: Date.now(),
                        sessionId: `${user.uid}_${Date.now()}`
                    });
                    newestDocId = newDoc.id;
                }
            }

            // delete any other duplicate docs
            for (const ds of snapshot.docs) {
                if (ds.id !== newestDocId) {
                    try { await deleteDoc(doc(this.queueRef, ds.id)); } catch (_) { /* ignore */ }
                }
            }

            return newestDocId!;
        }

        // No existing entry -> create one
        const queueEntry = await addDoc(this.queueRef, {
            userId: user.uid,
            username: user.email?.split('@')[0] || 'Player',
            rating: 1000,
            timestamp: Date.now(),
            status: 'searching',
            lastHeartbeat: Date.now(),
            sessionId: `${user.uid}_${Date.now()}`
        });

        return queueEntry.id;
    }

    // Add inside MatchmakingService class (near constructor)
    private async waitForAuth(timeoutMs: number = 5000): Promise<any | null> {
        if (auth.currentUser) return auth.currentUser;
        return await new Promise(resolve => {
            let resolved = false;
            const unsub = auth.onAuthStateChanged(user => {
                if (!resolved && user) {
                    resolved = true;
                    try { unsub(); } catch { /* ignore */ }
                    resolve(user);
                }
            });
            setTimeout(() => {
                if (!resolved) {
                    try { unsub(); } catch { /* ignore */ }
                    resolve(null);
                }
            }, timeoutMs);
        });
    }

    // Add inside MatchmakingService class (near other private helpers)
    private async scanQueueForOpponents(userId: string): Promise<void> {
        if (!this.currentQueueId || this.isMatched || this.isCreatingMatch) return;

        try {
            const q = query(this.queueRef, where('status', '==', 'searching'));
            const snapshot = await getDocs(q);

            for (const ds of snapshot.docs) {
                if (this.isMatched || this.isCreatingMatch) break;

                if (ds.id === this.currentQueueId) continue;

                const data: any = ds.data();
                if (!data || data.userId === userId) continue;

                const potentialOpponent: QueuePlayer = {
                    id: ds.id,
                    userId: data.userId,
                    username: data.username,
                    rating: data.rating || 1000,
                    timestamp: data.timestamp,
                    status: data.status
                };

                console.log(`🔎 scanQueueForOpponents: found ${potentialOpponent.username} (${ds.id})`);

                this.isCreatingMatch = true;
                try {
                    if (await this.isValidOpponent(potentialOpponent, userId)) {
                        console.log(`🎯 scanQueueForOpponents: creating match with ${potentialOpponent.username}`);
                        await this.createMatchFromQueue(auth.currentUser!, potentialOpponent);
                        break;
                    } else {
                        console.log(`❌ scanQueueForOpponents: invalid opponent ${potentialOpponent.username}`);
                        this.isCreatingMatch = false;
                    }
                } catch (err) {
                    console.warn('⚠️ scanQueueForOpponents error:', err);
                    this.isCreatingMatch = false;
                }
            }
        } catch (e) {
            console.warn('⚠️ scanQueueForOpponents failed:', e);
            this.isCreatingMatch = false;
        }
    }
}