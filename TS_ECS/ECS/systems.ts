import { World, Services } from './core';
import type { System } from './core';
import { Transform, Velocity, Sprite } from './components';
import { Camera2D, AssetManager, InputService } from './services';

// Movement System
export class MovementSystem implements System {
    constructor(private world: World) {}

    update(deltaTime: number): void {
        const entities = this.world.getEntitiesWith(Transform, Velocity);
        
        for (const entityId of entities) {
            const transform = this.world.getComponent(entityId, Transform)!;
            const velocity = this.world.getComponent(entityId, Velocity)!;
            
            transform.x += velocity.vx * deltaTime;
            transform.y += velocity.vy * deltaTime;
        }
    }
}

// Render System
export class RenderSystem implements System {
    constructor(private world: World) {}

    draw(context: CanvasRenderingContext2D): void {
        const camera = Services.get(Camera2D);
        const assets = Services.get(AssetManager);
        
        const entities = this.world.getEntitiesWith(Transform, Sprite);
        
        // Sort by Y position for depth
        const sorted = entities.sort((a, b) => {
            const transformA = this.world.getComponent(a, Transform)!;
            const transformB = this.world.getComponent(b, Transform)!;
            return transformA.y - transformB.y;
        });
        
        context.save();
        camera.applyTransform(context);
        
        for (const entityId of sorted) {
            const transform = this.world.getComponent(entityId, Transform)!;
            const sprite = this.world.getComponent(entityId, Sprite)!;
            
            const image = assets.getImage(sprite.imageName);
            
            context.save();
            context.translate(transform.x, transform.y);
            context.rotate(transform.rotation);
            context.scale(transform.scaleX, transform.scaleY);
            
            if (image) {
                context.drawImage(
                    image,
                    -sprite.width / 2 + sprite.offsetX,
                    -sprite.height / 2 + sprite.offsetY,
                    sprite.width,
                    sprite.height
                );
            } else {
                // Fallback rectangle
                context.fillStyle = '#ff00ff';
                context.fillRect(
                    -sprite.width / 2,
                    -sprite.height / 2,
                    sprite.width,
                    sprite.height
                );
            }
            
            context.restore();
        }
        
        context.restore();
    }
}

// Player Input System
export class PlayerInputSystem implements System {
    constructor(private world: World, private playerId: number) {}

    update(deltaTime: number): void {
        const input = Services.get(InputService);
        const velocity = this.world.getComponent(this.playerId, Velocity);
        
        if (!velocity) return;
        
        const speed = 200;
        velocity.vx = 0;
        velocity.vy = 0;
        
        if (input.isKeyDown('KeyW') || input.isKeyDown('ArrowUp')) {
            velocity.vy = -speed;
        }
        if (input.isKeyDown('KeyS') || input.isKeyDown('ArrowDown')) {
            velocity.vy = speed;
        }
        if (input.isKeyDown('KeyA') || input.isKeyDown('ArrowLeft')) {
            velocity.vx = -speed;
        }
        if (input.isKeyDown('KeyD') || input.isKeyDown('ArrowRight')) {
            velocity.vx = speed;
        }
    }
}