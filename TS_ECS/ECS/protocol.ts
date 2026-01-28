// Network message protocol definitions
export interface NetworkMessage {
    type: string;
    data: any;
    timestamp?: number;
    messageId?: number;
    reliable?: boolean;
}

export interface EntitySnapshot {
    networkId: string;
    components: Record<string, any>;
}

export interface WorldSnapshot {
    timestamp: number;
    entities: EntitySnapshot[];
}

// Client -> Server messages
export const ClientMessages = {
    CONNECT: 'client_connect',
    DISCONNECT: 'client_disconnect',
    INPUT: 'client_input',
    ENTITY_STATE: 'entity_state',
    CUSTOM: 'client_custom',
} as const;

// Server -> Client messages
export const ServerMessages = {
    WELCOME: 'server_welcome',
    ENTITY_CREATE: 'entity_create',
    ENTITY_UPDATE: 'entity_update',
    ENTITY_DESTROY: 'entity_destroy',
    SNAPSHOT: 'snapshot',
    TIME_SYNC: 'time_sync',
    CUSTOM: 'server_custom',
} as const;