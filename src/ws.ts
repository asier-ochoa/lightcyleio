export enum MessageKind {
    new_player = 0,
    new_player_id = 1,
    spawn = 2
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

const messages = {};