import type { ServerWebSocket } from "bun";

export enum MessageKind {
    new_player = 0,
    new_player_id = 1,
    spawn = 2,
    spawn_response = 3,
}

export interface Message {
    kind: MessageKind
}

export class NewPlayerMessage implements Message {
    kind = MessageKind.new_player
}

export class NewPlayerIdMessage implements Message {
    kind = MessageKind.new_player_id
    constructor (
        public id: number
    ) {}
}

export class SpawnMessage implements Message {
    kind = MessageKind.spawn
    constructor (
        public player_id: number
    ) {}
}

// Tells client wether their spawning attempt was valid
export class SpawnResponseMessage implements Message {
    kind = MessageKind.spawn_response
    constructor (
        public success: boolean,
        public player_id: number
    ) {}
}

export const connections: {[player_id: number]: ServerWebSocket} = {};