import { stdout } from 'bun';
import { DirectionRequestMessage, MessageKind, NewPlayerIdMessage, PlayerDisconnectMessage, PlayerGripMessage, PlayerPositionMessage, PlayerTrailMessage, SpawnMessage, SpawnResponseMessage, TickMessage, type Message } from './ws';

declare var self: Worker;

const game_props = {
    // Given in seconds
    simulation_tick_time: 1/20,
    base_player_speed: 50,
    arena_bounds: {
        width: 800,
        height: 600
    },
    turn_grip_cost: 20,
    grip_base_regen: 200, // Given in points per second
    max_grip: 100
}

export enum Direction {
    up,
    down,
    left,
    right
};

// Game mechanic:
// - Turning is a resource on a meter. The bar is called grip and goes from 0 to 100.
//   Each turn takes 20 points from said bar. You gain ${grip_base_regen} points per second at base score.
//   The faster you go, the slower it should regenerate.

type Player = {
    alive: boolean,
    pos: {x: number, y: number},
    direction: Direction,
    // Used to indicate a command to turn
    requested_direction: Direction | null,
    grip: number,
    score: number,
    // Trail is null when player is dead
    trail: Trail | null
};

type Trail = {
    owner_id: number,
    start_tick: number,
    end_pos: {x: number, y: number},
    next_segment: Trail | null,
}

class GameState {
    players: {[id: number]: Player} = {}
    player_count: number = 0
    // Tracks the current tick of the simulation
    current_tick: number = 0
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
        requested_direction: null ,
        grip: game_props.max_grip,
        score: 0,
        trail: null
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
        player.grip = game_props.max_grip;
        player.direction = Direction.up;
        // Add a starting trail to player
        make_new_trail_segment(state, id);
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
    console.log(`Player with id ${id} disconnected`);
}

// Adds a new segment to trail
// Should only be done when player switches direction
// Should only be called on alive players
const make_new_trail_segment = (state: GameState, p_id: number) => {
    const player = state.players[p_id];
    // Case when player has no trail
    if (player.trail === null) {
        player.trail = {start_tick: state.current_tick, end_pos: structuredClone(player.pos), owner_id: p_id, next_segment: null}
    // Case when already existing trail
    // Add another segment
    } else {
        const new_trail_segment: Trail = {start_tick: state.current_tick, end_pos: structuredClone(player.pos), owner_id: p_id, next_segment: player.trail}
        player.trail = new_trail_segment;
    }
}

// Returns an array with all segments of a trail
const get_trail_pos_arr = (t: Trail) => {
    const ret = [t.end_pos];
    let cur_trail = t.next_segment;
    while(cur_trail !== null) {
        ret.push(cur_trail.end_pos);
        cur_trail = cur_trail.next_segment;
    }
    return ret;
}

const print_trail = (start_pos: {x: number, y: number}, t: Trail) => {
    const writer = stdout.writer();
    let cur_trail = t.next_segment;
    writer.write(`{x: ${start_pos.x}, y: ${start_pos.y}}`);
    while(cur_trail !== null) {
        writer.write(` => {x: ${cur_trail.end_pos.x}, y: ${cur_trail.end_pos.y}}`);
        cur_trail = cur_trail.next_segment;
    }
    writer.write("\n");
    writer.flush();
}

const game_loop = async () => {
    const time = new Date();

    // Gameloop state
    const players_arr = Object.entries(state.players);
    const alive_players_arr = players_arr.filter(([_, p]) => p.alive);
    const trails_arr = alive_players_arr.map(([_, p]) => p.trail)
    {
        // Update players' requested direction
        alive_players_arr.filter(
            ([_, p]) => p.requested_direction !== null && p.requested_direction !== p.direction
        ).forEach(([p_id, p]) => {
            // Check if player has enough grip and deduct
            if (p.grip - game_props.turn_grip_cost >= 0){
                p.direction = p.requested_direction!;
                p.grip -= game_props.turn_grip_cost;
                // Add a new trail segment if player turned
                make_new_trail_segment(state, Number(p_id));
            }
            p.requested_direction = null;
        })

        // Move players according to their direction and regen their grip
        alive_players_arr.forEach(([_, p]) => {
            if (p.grip < game_props.max_grip) {
                p.grip += game_props.turn_grip_cost * game_props.simulation_tick_time;
            }
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
        const formatted_positions = alive_players_arr.map(([id, p]) => {return {id: Number(id), x: p.pos.x, y: p.pos.y};});
        players_arr.forEach(_ => {
            postMessage(new PlayerPositionMessage(formatted_positions));
        });

        // Broadcast trail positions to every player
        let formatted_trails = {};
        for (const t of trails_arr.filter(t => t !== null)) {
            formatted_trails = {...formatted_trails, [t.owner_id]: get_trail_pos_arr(t)}
        }
        players_arr.forEach(([id, _]) => {
            postMessage(new PlayerTrailMessage(formatted_trails))
        })

        // Broadcast their grip to every player
        alive_players_arr.forEach(([id, _]) => {
            const player_id = Number(id);
            postMessage(new PlayerGripMessage(player_id, state.players[player_id].grip, game_props.grip_base_regen));
        });

        // Broadcast current tick to every player
        // This message kind is interpreted as a broadcast, no need to carry a broadcast ID
        postMessage(new TickMessage(state.current_tick))
    }

    state.current_tick += 1;

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