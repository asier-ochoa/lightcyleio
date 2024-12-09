import { stdout } from 'bun';
import { DeathMessage, DirectionRequestMessage, MessageKind, NewPlayerIdMessage, PlayerDisconnectMessage, PlayerGripMessage, PlayerPositionMessage, PlayerTrailMessage, SpawnMessage, SpawnResponseMessage, TickMessage, type Message } from './ws';

declare var self: Worker;

export const game_props = {
    // Given in seconds
    simulation_tick_time: 1/20,
    base_player_speed: 50,
    // Frontend can't handle rectangles
    arena_bounds: {
        width: 800,
        height: 800
    },
    turn_grip_cost: 20,
    grip_base_regen: 1000, // Given in points per second
    max_grip: 100,
    max_trail_length: 600,
}

export enum Direction {
    up,
    down,
    left,
    right
};

export enum Color {
    Red,
    Blue,
    Orange,
    Cyan,
    Gold,
    White
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
    // If a player is alive, this should have a value
    color: Color | null,
    // Trail is null when player is dead
    trail: Trail | null,
    trail_tail: [Trail, Trail | null] | null,
    name: string
};

type Trail = {
    owner_id: number,
    end_pos: {x: number, y: number},
    next_segment: Trail | null,
}

class GameState {
    players: {[id: number]: Player} = {}
    player_count: number = 0
    // Tracks the current tick of the simulation
    current_tick: number = 0
    // Tracks who has died this tick
    death_arr: {p: number, killer: number}[] = []
};

let state = new GameState();

// Returns ID of created player
const create_player = (state: GameState) => {
    // Find unused ID
    let new_id = Math.round(Math.random() * 100_000_000);
    
    state.players[new_id] = {
        alive: false,
        pos: {x: 0, y: 0},
        direction: Direction.right,
        requested_direction: null,
        grip: game_props.max_grip,
        score: 0,
        color: null,
        trail: null,
        trail_tail: null,
        name: ""
    };
    state.player_count += 1;
    console.log(`New player with id ${new_id} created`);
    return new_id;
}

// Returns if spawning the player was succesful
const spawn_player = (state: GameState, id: number, color: Color, name: string) => {
    const player = state.players[id];
    if (player === undefined || player.alive === true) {
        return false;
    } else {
        player.alive = true;
        player.pos = {
            x: Math.floor(Math.random() * game_props.arena_bounds.width),
            y: Math.floor(Math.random() * game_props.arena_bounds.height)
        };
        player.color = color;
        player.grip = game_props.max_grip;
        player.direction = Direction.right;
        console.log("NIGGER", name)
        player.name = name.substring(0, 20);
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

// Returns true if requested direction is opposite to current
const is_opposite = (dir: Direction, new_dir: Direction) => {
    switch (dir) {
        case Direction.up:
            return new_dir === Direction.down;
            break;
        case Direction.down:
            return new_dir === Direction.up;
            break;
        case Direction.left:
            return new_dir === Direction.right;
            break;
        case Direction.right:
            return new_dir === Direction.left;
            break;
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
        player.trail = {end_pos: structuredClone(player.pos), owner_id: p_id, next_segment: null};
        player.trail_tail = [player.trail, null];
    // Case when already existing trail
    // Add another segment
    } else {
        const new_trail_segment: Trail = {end_pos: structuredClone(player.pos), owner_id: p_id, next_segment: player.trail};
        player.trail = new_trail_segment;
        player.trail_tail = get_trail_tail(new_trail_segment);
    }
}

// Returns the last segment of a trail
// Possible cases are [t, null], [t, t] and [..., t, t], last two have the same return
const get_trail_tail = (t: Trail): [Trail, Trail | null] => {
    let cur_trail = t.next_segment;
    if (cur_trail === null) {
        return [t, null]
    }
    let next_trail = cur_trail.next_segment;
    if (next_trail === null) {
        return [t, cur_trail]
    }
    let swap = cur_trail;
    while (next_trail !== null) {
        swap = cur_trail;
        cur_trail = next_trail;
        next_trail = next_trail.next_segment;
    }
    return [swap, cur_trail];
}

const get_trail_length = (start_pos: {x: number, y: number}, t: Trail) => {
    let cur_trail = t.next_segment;
    let last_pos = t.end_pos;
    let distance = 0;
    distance += (start_pos.x === t.end_pos.x) ? Math.abs(start_pos.y - t.end_pos.y) : Math.abs(start_pos.x - t.end_pos.x);
    while (cur_trail !== null) {
        distance += (last_pos.x === cur_trail.end_pos.x) ? Math.abs(last_pos.y - cur_trail.end_pos.y) : Math.abs(last_pos.x - cur_trail.end_pos.x);
        last_pos = cur_trail.end_pos;
        cur_trail = cur_trail.next_segment;
    }
    return distance;
}


// Last segment's end position gets pushed forwards if trail is longer than max
const shrink_tail = (start_pos: {x: number, y: number}, t: Trail, tail: [Trail, Trail | null]) => {
    const trail_length = get_trail_length(start_pos, t);
    if (trail_length > game_props.max_trail_length) {
        // Case when the trail is single segment
        if (tail[1] === null) {
            // Check if we gotta shrink on x or y axis
            if (start_pos.x === tail[0].end_pos.x) {
                const diff = start_pos.y - tail[0].end_pos.y;
                // Start pos is above
                if (diff > 0) {
                    tail[0].end_pos.y += diff - game_props.max_trail_length; 
                // Start pos is below
                } else {
                    tail[0].end_pos.y -= Math.abs(diff) - game_props.max_trail_length;
                }
            } else {
                const diff = start_pos.x - tail[0].end_pos.x;
                // Start pos is right
                if (diff > 0) {
                    tail[0].end_pos.x += diff - game_props.max_trail_length; 
                // Start pos is left
                } else {
                    tail[0].end_pos.x -= Math.abs(diff) - game_props.max_trail_length;
                }
            }
        } else {
            if (tail[0].end_pos.x === tail[1].end_pos.x) {
                const diff = tail[0].end_pos.y - tail[1].end_pos.y;
                // If after removing the segement length is above max, delete the segment
                if ((trail_length - Math.abs(diff)) > game_props.max_trail_length) {
                    tail[0].next_segment = null;
                    const new_trail = get_trail_tail(t)
                    tail[0] = new_trail[0]
                    tail[1] = new_trail[1]
                    return;
                }
                if (diff > 0) {
                    tail[1].end_pos.y += trail_length - game_props.max_trail_length;
                } else {
                    tail[1].end_pos.y -= trail_length - game_props.max_trail_length;
                }
            } else {
                const diff = tail[0].end_pos.x - tail[1].end_pos.x;
                // If after removing the segement length is above max, delete the segment
                if ((trail_length - Math.abs(diff)) > game_props.max_trail_length) {
                    tail[0].next_segment = null;
                    const new_trail = get_trail_tail(t)
                    tail[0] = new_trail[0]
                    tail[1] = new_trail[1]
                    return;
                }
                if (diff > 0) {
                    tail[1].end_pos.x += trail_length - game_props.max_trail_length;
                } else {
                    tail[1].end_pos.x -= trail_length - game_props.max_trail_length;
                }
            }
        }
    }
}

// Returns an array with all segments of a trail
const get_trail_pos_arr = (t: Trail) => {
    const ret = [{...t.end_pos}];
    let cur_trail = t.next_segment;
    while(cur_trail !== null) {
        ret.push({...cur_trail.end_pos});
        cur_trail = cur_trail.next_segment;
    }
    return ret;
}

function* trail_iter(t: Trail) {
    yield t;
    let cur_trail = t.next_segment
    while (cur_trail !== null) {
        yield cur_trail;
        cur_trail = cur_trail.next_segment;
    }
}

const player_death = (state: GameState, p_id: number, killer_id: number) => {
    postMessage(new DeathMessage(p_id, killer_id));
    state.players[p_id].alive = false;
    state.players[p_id].trail = null;
    state.players[p_id].trail_tail = null;
    console.log(`Player ${p_id}(${state.players[p_id].name}) was killed by`, killer_id === -1 ? "the arena" : (killer_id === p_id ? "himself" : `player ${killer_id}(${state.players[killer_id].name})`));
};

type point = {x: number, y: number};
const collides = (s1_start: point, s1_end: point, s2_start: point, s2_end: point) => {
    // Check orientation of segments
    const s1_v = s1_start.x === s1_end.x;
    const s2_v = s2_start.x === s2_end.x;
    // If parallel, return false
    if (s1_v && s2_v || !s1_v && !s2_v) {
        return false;
    }
    if (s1_v) {
        if (s1_start.y > s1_end.y) {
            const tmp = s1_start;
            s1_start = s1_end;
            s1_end = tmp;
        }
        if (s2_start.x > s2_end.x) {
            const tmp = s2_start;
            s2_start = s2_end;
            s2_end = tmp;
        }
        return (s1_start.x >= s2_start.x && s1_start.x <= s2_end.x) && (s2_start.y >= s1_start.y && s2_start.y <= s1_end.y)
    } else {
        if (s1_start.x > s1_end.x) {
            const tmp = s1_start;
            s1_start = s1_end;
            s1_end = tmp;
        }
        if (s2_start.y > s2_end.y) {
            const tmp = s2_start;
            s2_start = s2_end;
            s2_end = tmp;
        }
        return (s2_start.x >= s1_start.x && s2_start.x <= s1_end.x) && (s1_start.y >= s2_start.y && s1_start.y <= s2_end.y)
    }
};

const print_trail = (start_pos: {x: number, y: number}, t: Trail) => {
    const writer = stdout.writer();
    let cur_trail = t.next_segment;
    writer.write(`^{x: ${start_pos.x}, y: ${start_pos.y}} => {x: ${t.end_pos.x}, y: ${t.end_pos.y}}`);
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
        // Clear deaths
        state.death_arr = [];

        // Update players' requested direction
        alive_players_arr.filter(
            ([_, p]) => p.requested_direction !== null && p.requested_direction !== p.direction && !is_opposite(p.direction, p.requested_direction)
        ).forEach(([p_id, p]) => {
            // Check if player has enough grip and deduct
            if (p.grip - game_props.turn_grip_cost >= 0){
                p.direction = p.requested_direction!;
                p.grip -= game_props.turn_grip_cost;
                // Add a new trail segment if player turned
                make_new_trail_segment(state, Number(p_id));
            }
            p.requested_direction = null;
        });

        alive_players_arr.forEach(([id, p], idx) => {
            // Arena wall collision detection
            // Must be done before player movement but
            // after direction change to sweep the
            // the collision line into the next tick
            const pos = p.pos;
            // Store computed next direction
            const next_pos = (() => {
                switch (p.direction) {
                    case Direction.up:
                        return {x: p.pos.x, y: p.pos.y + game_props.base_player_speed * game_props.simulation_tick_time}
                    case Direction.down:
                        return {x: p.pos.x, y: p.pos.y - game_props.base_player_speed * game_props.simulation_tick_time}
                    case Direction.left:
                        return {x: p.pos.x - game_props.base_player_speed * game_props.simulation_tick_time, y: p.pos.y}
                    case Direction.right:
                        return {x: p.pos.x + game_props.base_player_speed * game_props.simulation_tick_time, y: p.pos.y}
                }
            })();
            if (next_pos.x > game_props.arena_bounds.width || next_pos.x < 0 || next_pos.y > game_props.arena_bounds.height || next_pos.y < 0){
                state.death_arr.push({p: Number(id), killer: -1});
            }

            // Player vs trail collision
            alive_players_arr.forEach(([i_id, i_p], idx) => {
                const iter = trail_iter(i_p.trail!)
                // If checking the trail of the currently evaled player, skip first segment
                let last_trail: Trail | null = iter.next().value!;
                if (i_id !== id) {
                    if (collides(pos, next_pos, i_p.pos, last_trail.end_pos)) {
                        state.death_arr.push({p: Number(id), killer: last_trail.owner_id})
                    }
                } else {
                    iter.next();
                    if (last_trail.next_segment !== null) {
                        last_trail = last_trail.next_segment;
                    }
                }
                for (let t of iter) {
                    if (last_trail != null) {
                        if (collides(pos, next_pos, last_trail.end_pos, t.end_pos)) {
                            state.death_arr.push({p: Number(id), killer: t.owner_id})
                        }
                    }
                    last_trail = t;
                }
            });

            // Move players according to their direction and regen their grip
            if (p.grip < game_props.max_grip) {
                p.grip += game_props.grip_base_regen * game_props.simulation_tick_time;
            }
            p.pos = next_pos;
        });

        // Shrink each alive player's trail
        alive_players_arr.forEach(([_, p]) => {
            shrink_tail(p.pos, p.trail!, p.trail_tail!);
        })

        // DEATH HAS COME FOR ALL
        state.death_arr.forEach(d => {
            player_death(state, d.p, d.killer)
        })
    }

    // Networking update
    {
        // Broadcast every alive player position to every connected player
        const formatted_positions = alive_players_arr.map(([id, p]) => {return {
            id: Number(id),
            x: p.pos.x,
            y: p.pos.y,
            dir: p.direction,
            c: p.color!,
            n: p.name
        };});
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
            const success = spawn_player(state, msg.player_id, msg.color, msg.name);
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