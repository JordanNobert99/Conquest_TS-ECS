import { Component, Serializable } from './core';

// Transform Component
export class Transform implements Component, Serializable {
    entityId: number = 0;
    
    constructor(
        public x: number = 0,
        public y: number = 0,
        public rotation: number = 0,
        public scaleX: number = 1,
        public scaleY: number = 1
    ) {}

    serialize(): any {
        return {
            x: this.x,
            y: this.y,
            rotation: this.rotation,
            scaleX: this.scaleX,
            scaleY: this.scaleY
        };
    }

    deserialize(data: any): void {
        this.x = data.x ?? 0;
        this.y = data.y ?? 0;
        this.rotation = data.rotation ?? 0;
        this.scaleX = data.scaleX ?? 1;
        this.scaleY = data.scaleY ?? 1;
    }
}

// Velocity Component
export class Velocity implements Component, Serializable {
    entityId: number = 0;
    
    constructor(
        public vx: number = 0,
        public vy: number = 0
    ) {}

    serialize(): any {
        return { vx: this.vx, vy: this.vy };
    }

    deserialize(data: any): void {
        this.vx = data.vx ?? 0;
        this.vy = data.vy ?? 0;
    }
}

// Sprite Component
export class Sprite implements Component, Serializable {
    entityId: number = 0;
    
    constructor(
        public imageName: string = '',
        public width: number = 32,
        public height: number = 32,
        public offsetX: number = 0,
        public offsetY: number = 0
    ) {}

    serialize(): any {
        return {
            imageName: this.imageName,
            width: this.width,
            height: this.height,
            offsetX: this.offsetX,
            offsetY: this.offsetY
        };
    }

    deserialize(data: any): void {
        this.imageName = data.imageName ?? '';
        this.width = data.width ?? 32;
        this.height = data.height ?? 32;
        this.offsetX = data.offsetX ?? 0;
        this.offsetY = data.offsetY ?? 0;
    }
}

// Network Identity Component
export class NetworkIdentity implements Component, Serializable {
    entityId: number = 0;
    
    constructor(
        public networkId: string = '',
        public ownerId: string = '',
        public isLocal: boolean = false
    ) {}

    serialize(): any {
        return {
            networkId: this.networkId,
            ownerId: this.ownerId
        };
    }

    deserialize(data: any): void {
        this.networkId = data.networkId ?? '';
        this.ownerId = data.ownerId ?? '';
    }
}

// Collider Component (for physics/collision)
export class Collider implements Component {
    entityId: number = 0;
    
    constructor(
        public width: number = 32,
        public height: number = 32,
        public isTrigger: boolean = false,
        public layer: string = 'default'
    ) {}
}

// Health Component
export class Health implements Component, Serializable {
    entityId: number = 0;
    
    constructor(
        public current: number = 100,
        public max: number = 100
    ) {}

    serialize(): any {
        return { current: this.current, max: this.max };
    }

    deserialize(data: any): void {
        this.current = data.current ?? 100;
        this.max = data.max ?? 100;
    }
}