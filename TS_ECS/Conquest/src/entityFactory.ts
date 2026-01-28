import { World, EntityId } from './core';
import { Transform, Velocity, Sprite, NetworkIdentity } from './components';

export class EntityFactory {
    constructor(private world: World) {}

    createPlayer(x: number, y: number, networkId?: string): EntityId {
        const entity = this.world.createEntity();
        
        this.world.addComponent(entity, new Transform(x, y));
        this.world.addComponent(entity, new Velocity());
        this.world.addComponent(entity, new Sprite('player', 64, 64));
        
        if (networkId) {
            this.world.addComponent(entity, new NetworkIdentity(networkId, '', true));
        }
        
        return entity;
    }

    createEnemy(x: number, y: number): EntityId {
        const entity = this.world.createEntity();
        
        this.world.addComponent(entity, new Transform(x, y));
        this.world.addComponent(entity, new Velocity());
        this.world.addComponent(entity, new Sprite('enemy', 48, 48));
        
        return entity;
    }

    createBullet(x: number, y: number, vx: number, vy: number): EntityId {
        const entity = this.world.createEntity();
        
        this.world.addComponent(entity, new Transform(x, y));
        this.world.addComponent(entity, new Velocity(vx, vy));
        this.world.addComponent(entity, new Sprite('bullet', 8, 8));
        
        return entity;
    }
}