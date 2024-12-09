import type { ServerWebSocket } from "bun";
import { Direction, Color } from "./game.ts";

export enum MessageKind {
    new_player = 0,
    new_player_id = 1,
    spawn = 2,
    spawn_response = 3,
    player_position = 4,
    direction_request = 5,
    player_disconnect = 6,
    player_trail = 7,
    player_grip = 8,
    tick = 9,
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
        public player_id: number,
        public color: Color
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

// Message interpreted as a broadcast
export class PlayerPositionMessage implements Message {
    kind = MessageKind.player_position
    constructor (
        public pos: {id: number, x: number, y: number, dir: Direction, c: Color}[]
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
        public broadcast_id: number | null
    ) {}
}

// Interpreted as a broadcast message
// TODO: The way im sending every trail every tick is TERRIBLE
// Instead I should keep this message to send to a player that just connected
// so they can sync the state then have another message just to update a given player's trail
export class PlayerTrailMessage implements Message {
    kind = MessageKind.player_trail
    constructor (
        public segments: {
            [id: number]: {x: number, y: number, tick: number}[]
        },
    ) {}
}

export class PlayerGripMessage implements Message {
    kind = MessageKind.player_grip
    constructor (
        public id: number,
        public cur_grip: number,
        public regen_rate: number
    ) {}
}

// Used to transmit the current tick of the simulation to every player
// Message interpreted as a broadcast
export class TickMessage implements Message {
    kind = MessageKind.tick
    constructor (
        public tick: number
    ) {}
}

export const connections: {[player_id: number]: ServerWebSocket} = {};