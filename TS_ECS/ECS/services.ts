// IMPORTS
import { World } from './core';

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