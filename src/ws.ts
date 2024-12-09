import type { ServerWebSocket } from "bun";
import { Direction } from "./game.ts";

export enum MessageKind {
    new_player = 0,
    new_player_id = 1,
    spawn = 2,
    spawn_response = 3,
    player_position = 4,
    direction_request = 5,
    player_disconnect = 6
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

export class PlayerPositionMessage implements Message {
    kind = MessageKind.player_position
    constructor (
        public broadcast_id: number,
        public player_id: number,
        public pos_x: number,
        public pos_y: number
    ) {}
}

export class DirectionRequestMessage implements Message {
    kind = MessageKind.player_position
    constructor (
        public player_id: number,
        public direction: Direction
    ) {}
}

export class PlayerDisconnectMessage implements Message {
    kind = MessageKind.player_disconnect
    constructor (
        public dc_id: number,
        public broadcast_id: number | null,
    ) {}
}

export const connections: {[player_id: number]: ServerWebSocket} = {};