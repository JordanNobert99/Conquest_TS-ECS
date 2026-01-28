import { Serializable } from './core';
import { Transform, Velocity, Sprite, NetworkIdentity, Health } from './components';

// Component Registry for network serialization
export class ComponentRegistry {
    private static componentTypes: Map<string, new (...args: any[]) => any> = new Map();
    private static initialized: boolean = false;

    static initialize(): void {
        if (this.initialized) return;
        
        // Register all component types
        this.register('Transform', Transform);
        this.register('Velocity', Velocity);
        this.register('Sprite', Sprite);
        this.register('NetworkIdentity', NetworkIdentity);
        this.register('Health', Health);
        
        this.initialized = true;
    }

    static register<T>(name: string, componentType: new (...args: any[]) => T): void {
        this.componentTypes.set(name, componentType);
    }

    static create(name: string, data?: any): any {
        const ComponentType = this.componentTypes.get(name);
        if (!ComponentType) {
            throw new Error(`Component type ${name} not registered`);
        }

        const component = new ComponentType();
        if (data && 'deserialize' in component) {
            (component as any).deserialize(data);
        }
        return component;
    }

    static getTypeName(component: any): string | undefined {
        for (const [name, type] of this.componentTypes) {
            if (component instanceof type) {
                return name;
            }
        }
        return undefined;
    }

    static getAllTypes(): string[] {
        return Array.from(this.componentTypes.keys());
    }
}