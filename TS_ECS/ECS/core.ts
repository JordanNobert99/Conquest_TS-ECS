// CORE TYPES AND INTERFACES

type EntityId = number;

interface Component { 
	entityId: EntityId;
}

// NEW: Serializable components for networking
interface Serializable {
	serialize(): any;
	deserialize(data: any): void;
}

interface System {
	update?(deltaTime: number): void;
	fixedUpdate?(fixedDeltaTime: number): void;
	draw?(context: CanvasRenderingContext2D): void;
}

// SERVICE LOCATOR PATTERN
export class Services {
	private static services: Map<Function, any> = new Map();

	static register<T>(serviceType: new (...args: any[]) => T, instance: T): void {
		this.services.set(serviceType, instance);
	}

	static get<T>(serviceType: new (...args: any[]) => T): T {
		const service = this.services.get(serviceType);
		if (!service) {
			throw new Error(`Service ${serviceType.name} not registered`);
		}
		return service as T;
	}

	static has<T>(serviceType: new (...args: any[]) => T): boolean {
		return this.services.has(serviceType);
	}

	static clear(): void {
		this.services.clear();
	}
}

// ECS WORLD CLASS
export class World {
	private nextEntityId: EntityId = 0;
	private entities: Set<EntityId> = new Set();
	private components: Map<Function, Map<EntityId, Component>> = new Map();
	private systems: System[] = [];
	// NEW: Track networked entities
	private networkedEntities: Map<string, EntityId> = new Map();

	// Entity Management
	createEntity(): EntityId {
		const id = this.nextEntityId++;
		this.entities.add(id);
		return id;
	}

	// NEW: Create entity with network ID
	createNetworkEntity(networkId: string): EntityId {
		const id = this.createEntity();
		this.networkedEntities.set(networkId, id);
		return id;
	}

	// NEW: Get entity by network ID
	getEntityByNetworkId(networkId: string): EntityId | undefined {
		return this.networkedEntities.get(networkId);
	}

	destroyEntity(entityId: EntityId): void {
		this.entities.delete(entityId);
		this.components.forEach(componentMap => {
			componentMap.delete(entityId);
		});
		// Clean up network mapping
		for (const [netId, entId] of this.networkedEntities) {
			if (entId === entityId) {
				this.networkedEntities.delete(netId);
				break;
			}
		}
	}

	// Component Management
	addComponent<T extends Component>(entityId: EntityId, component: T): void {
		component.entityId = entityId;
		const componentType = component.constructor;

		if (!this.components.has(componentType)) {
			this.components.set(componentType, new Map());
		}
		this.components.get(componentType)!.set(entityId, component);
	}

	getComponent<T extends Component>(entityId: EntityId, componentType: new (...args: any[]) => T): T | undefined {
		const componentMap = this.components.get(componentType);
		return componentMap?.get(entityId) as T | undefined;
	}

	removeComponent<T extends Component>(entityId: EntityId, componentType: new (...args: any[]) => T): void {
		const componentMap = this.components.get(componentType);
		componentMap?.delete(entityId);
	}

	// Query components - FIXED: Accept any component types
	getEntitiesWith(...componentTypes: (new (...args: any[]) => Component)[]): EntityId[] {
		const result: EntityId[] = [];

		for (const entityId of this.entities) {
			const hasAll = componentTypes.every(type => {
				const componentMap = this.components.get(type);
				return componentMap?.has(entityId);
			});

			if (hasAll) { result.push(entityId); }
		}
		return result;
	}

	// NEW: Serialize entity state
	serializeEntity(entityId: EntityId): any {
		const entityData: any = { id: entityId, components: {} };
		
		this.components.forEach((componentMap, componentType) => {
			const component = componentMap.get(entityId);
			if (component && 'serialize' in component) {
				const typeName = componentType.name;
				entityData.components[typeName] = (component as any).serialize();
			}
		});

		return entityData;
	}

	// NEW: Get all entities
	getAllEntities(): EntityId[] {
		return Array.from(this.entities);
	}

	// System Management
	addSystem(system: System): void {
		this.systems.push(system);
	}

	// Main Loop Methods
	update(deltaTime: number): void {
		for (const system of this.systems) {
			system.update?.(deltaTime);
		}
	}

	fixedUpdate(fixedDeltaTime: number): void {
		for (const system of this.systems) {
			system.fixedUpdate?.(fixedDeltaTime);
		}
	}

	draw(context: CanvasRenderingContext2D): void {
		for (const system of this.systems) {
			system.draw?.(context);
		}
	}
}

// Export types and interfaces
export type { EntityId, Component, Serializable, System };