import { MessageKind, NewPlayerIdMessage, SpawnMessage, SpawnResponseMessage, type Message } from './ws';

declare var self: Worker;

const game_props = {
    // Given in seconds
    simulation_tick_time: 1/10,
    base_player_speed: 10,
    arena_bounds: {
        width: 800,
        height: 800
    }
}

const enum Direction {
    up,
    down,
    left,
    right
};

type Player = {
    alive: boolean,
    pos: {x: number, y: number},
    direction: Direction,
};

class GameState {
    players: {[id: number]: Player} = {}
    player_count: number = 0
};

let state = new GameState();

// Returns ID of created player
const create_player = (state: GameState) => {
    // Find unused ID
    let new_id = Math.round(Math.random() * 100_000_000);
    
    state.players[new_id] = {
        alive: false,
        pos: {x: 0, y: 0},
        direction: Direction.up,
    };
    state.player_count += 1;
    console.log(`New player with id ${new_id} created`);
    return new_id;
}

// Returns if spawning the player was succesful
const spawn_player = (state: GameState, id: number) => {
    const player = state.players[id];
    if (player === undefined || player.alive === true) {
        return false;
    } else {
        player.alive = true;
        player.pos = {
            x: Math.floor(Math.random() * game_props.arena_bounds.width),
            y: Math.floor(Math.random() * game_props.arena_bounds.height)
        };
        player.direction = Direction.up;
        return true;
    }
}

const game_loop = async () => {
    const time = new Date();

    // Gameloop
    {
        // Move players according to their direction
        Object.entries(state.players).filter(([_, p]) => p.alive).forEach(([_, p]) => {
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
    console.log('WHAT THE FUCK THIS SHOULD RUN')
    const outer_message: Message = ev.data;
    switch (outer_message.kind){
        case MessageKind.new_player:
            postMessage(new NewPlayerIdMessage(create_player(state)));
            break;
        case MessageKind.spawn:
            const msg = outer_message as SpawnMessage;
            const success = spawn_player(state, msg.player_id);
            postMessage(new SpawnResponseMessage(success, msg.player_id));
            break;
        default:
            console.log("Invalid message received:")
            console.log(JSON.stringify(ev.data, null, 4))
            break;
    }
}

console.log("Game runner worker started");
game_loop();