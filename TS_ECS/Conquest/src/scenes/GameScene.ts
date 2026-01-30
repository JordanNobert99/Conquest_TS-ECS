import { World, Services } from '../../../ECS/core';
import { EntityFactory } from '../entityFactory';
import { MovementSystem, RenderSystem, PlayerInputSystem } from '../../../ECS/systems';
import { InputService, SceneManager, BaseScene } from '../../../ECS/services';

export class GameScene extends BaseScene {
    private playerId: number = -1;

    load(): void {
        console.log('🎮 Game Scene Loaded');

        // Create player
        const factory = new EntityFactory(this.world);
        this.playerId = factory.createPlayer(400, 300);

        // Create some test entities
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * 800;
            const y = Math.random() * 600;
            factory.createEnemy(x, y);
        }

        // Add systems
        this.world.addSystem(new PlayerInputSystem(this.world, this.playerId));
        this.world.addSystem(new MovementSystem(this.world));
        this.world.addSystem(new RenderSystem(this.world));
    }

    unload(): void {
        console.log('🎮 Game Scene Unloaded');

        // Clear all entities
        const entities = this.world.getAllEntities();
        entities.forEach(id => this.world.destroyEntity(id));
    }

    update(deltaTime: number): void {
        super.update(deltaTime);

        // Check for ESC to return to menu
        const input = Services.get(InputService);
        if (input.isKeyPressed('Escape')) {
            const sceneManager = Services.get(SceneManager);
            sceneManager.loadScene('menu');
        }
    }

    draw(context: CanvasRenderingContext2D): void {
        // Clear canvas
        context.fillStyle = '#1a1a2e';
        context.fillRect(0, 0, context.canvas.width, context.canvas.height);

        // Draw world
        super.draw(context);
    }
}