import { MessageKind, NewPlayerIdMessage, type Message } from './ws';

declare var self: Worker;

const game_props = {
    // Given in seconds
    simulation_tick_time: 1/10,
    base_player_speed: 10,
    arena_bounds: {
        width: 10000,
        height: 10000
    }
}

const enum Direction {
    up,
    down,
    left,
    right
};

type Player = {
    id: number,
    alive: boolean,
    pos: {x: number, y: number},
    direction: Direction,
};

class GameState {
    players: Player[] = []
};

let state = new GameState();

// Returns ID of created player
const create_player = (state: GameState) => {
    let new_id = state.players.length !== 0 ? Math.max(...state.players.map(p => p.id)) : 0;
    state.players.push({
        id: new_id,
        alive: false,
        pos: {x: 0, y: 0},
        direction: Direction.up,
    })
    console.log(`New player with id ${new_id} created`);
    return new_id;
}

const game_loop = async () => {
    const time = new Date();

    // Gameloop
    {
        // Move players according to their direction
        state.players.filter(p => p.alive).forEach(p => {
            switch (p.direction) {
                case Direction.up:
                    p.pos.y += game_props.base_player_speed * game_props.simulation_tick_time;
                    break;
                case Direction.down:
                    p.pos.y -= game_props.base_player_speed * game_props.simulation_tick_time;
                    break;
                case Direction.left:
                    p.pos.x -= game_props.base_player_speed * game_props.simulation_tick_time;
                    break;
                case Direction.right:
                    p.pos.x += game_props.base_player_speed * game_props.simulation_tick_time;
                    break;
            }
        });
    }

    const time_elapsed_in_tick = (new Date()).getMilliseconds() - time.getMilliseconds();
    await Bun.sleep(game_props.simulation_tick_time * 1000 - time_elapsed_in_tick);
    await game_loop();
};

// Receiving commands from main thread
self.onmessage = ev => {
    const outer_message: Message = ev.data;
    switch (outer_message.kind){
        case MessageKind.new_player:
            postMessage(new NewPlayerIdMessage(create_player(state)));
            break;
        default:
            console.log("Invalid message received:")
            console.log(JSON.stringify(ev.data, null, 4))
            break;
    }
    console.log("Communicated!", outer_message.kind);
}

console.log("Game runner worker started");
game_loop();