import { DirectionRequestMessage, MessageKind, NewPlayerIdMessage, PlayerDisconnectMessage, PlayerPositionMessage, SpawnMessage, SpawnResponseMessage, type Message } from './ws';

declare var self: Worker;

const game_props = {
    // Given in seconds
    simulation_tick_time: 1/10,
    base_player_speed: 50,
    arena_bounds: {
        width: 800,
        height: 600
    }
}

export enum Direction {
    up,
    down,
    left,
    right
};

type Player = {
    alive: boolean,
    pos: {x: number, y: number},
    direction: Direction,
    // Used to indicate a command to turn
    requested_direction: Direction | null
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
        requested_direction: null 
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
        console.log(`Player with id ${id} spawned at pos x: ${player.pos.x} y: ${player.pos.y}`);
        return true;
    }
}

// Queues a player direction to be set next tick
const set_player_direction = (state: GameState, id: number, direction: Direction) => {
    const player = state.players[id];
    if (player !== undefined) {
        player.requested_direction = direction
    } else {
        console.log(`Error: Attempted to set direction on invalid player ID: ${id}`)
    }
}

// Removes a player from the simulation
const remove_player = (state: GameState, id: number) => {
    delete state.players[id];
    state.player_count -= 1;
    
    // Broadcast to every player the removed player
    Object.keys(state.players).forEach(e => postMessage(new PlayerDisconnectMessage(id, Number(e))));
}

const game_loop = async () => {
    const time = new Date();

    // Gameloop state
    const players_arr = Object.entries(state.players);
    const alive_players_arr = players_arr.filter(([_, p]) => p.alive);
    {
        // Update players' requested direction
        alive_players_arr.filter(([_, p]) => p.requested_direction !== null).forEach(([_, p]) => {
            p.direction = p.requested_direction!;
            p.requested_direction = null;
        })

        // Move players according to their direction
        alive_players_arr.forEach(([_, p]) => {
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

    // Networking update
    {
        // Broadcast every alive player position to every connected player
        players_arr.forEach(([bid, _]) => {
            alive_players_arr.forEach(([id, p]) => {
                postMessage(new PlayerPositionMessage(Number(bid), Number(id), p.pos.x, p.pos.y))
            });
        });
    }

    const time_elapsed_in_tick = (new Date()).getMilliseconds() - time.getMilliseconds();
    // Expressed in ms
    const time_left_in_tick = game_props.simulation_tick_time * 1000 - time_elapsed_in_tick > 0 ?
        game_props.simulation_tick_time * 1000 - time_elapsed_in_tick : 0;
    // Log if server is running slow
    if (time_elapsed_in_tick > game_props.simulation_tick_time * 1000 / 1.5) {
        console.log("Warning! Gameloop took more than 66% of its tick time to run!");
    }
    await Bun.sleep(time_left_in_tick);
    await game_loop();
};

// Receiving commands from main thread
self.onmessage = ev => {
    const outer_message: Message = ev.data;
    switch (outer_message.kind){
        case MessageKind.new_player:
            postMessage(new NewPlayerIdMessage(create_player(state)));
            break;
        case MessageKind.spawn: {
            const msg = outer_message as SpawnMessage;
            const success = spawn_player(state, msg.player_id);
            postMessage(new SpawnResponseMessage(success, msg.player_id));
            break;
        }
        case MessageKind.direction_request: {
            const msg = outer_message as DirectionRequestMessage;
            set_player_direction(state, msg.player_id, msg.direction);
            break;
        }
        case MessageKind.player_disconnect: {
            const msg = outer_message as PlayerDisconnectMessage;
            remove_player(state, msg.dc_id);
            break;
        }
        default:
            console.log("Invalid message received at game worker:")
            console.log(JSON.stringify(ev.data, null, 4))
            break;
    }
}

console.log("Game runner worker started");
game_loop();