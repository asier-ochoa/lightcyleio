import { serialize, deserialize } from './bundle/serial.js';

const Direction = Object.freeze({
    up: Symbol('up'),
    down: Symbol('down'),
    left: Symbol('left'),
    right: Symbol('right'),
})

const game_params = Object.freeze({
    player_bbox: {
        width: 10,
        height: 20
    },
    // Pixels per second
    base_speed: 10
})

const game_state = {
    // Holds ref to web socket
    connection: null,
    // Given by server
    client_player: {
        id: null,
        pos: {
            x: 400,
            y: 400,
        },
        alive: false,
        toString() {
            return `id: ${this.id} x: ${this.pos.x}, y: ${this.pos.y}`;
        },
        grip: 0,
        segments: null
    },
    // Same as client_player but without id or grip, id as key
    other_players: {},
    // Used to get delta_time
    last_timestamp: 0,
    // Indicates the server's current simulation tick
    simulation_tick: 0
}
window.game_state = game_state;

const spawn_player = (player_id) => {
    game_state.other_players[player_id] = {
        pos: {x: 0, y: 0},
        alive: true,
        segments: null
    }
}

/**
 * @param {{x: number, y: number}} start
 * @param {{x: number: y: number}[]} points
 * @param {CanvasRenderingContext2D} canvas
 * @param {string} color
 */
const draw_trail = (start, points, canvas, color) => {
    canvas.beginPath();
    canvas.moveTo(start.x, start.y);
    points.forEach(p => {
        canvas.lineTo(p.x, p.y);
    });
    canvas.lineWidth = 4;
    canvas.strokeStyle = color;
    canvas.stroke();
}

// Find all children of debug info and adds them to an object
// with the key as the value itself and a function to update it with a string parameter
// as the value.
// HTML element reference is held thanks to closure.
const register_debug_values = ((html_elements) => {
    let ret = {};
    for (let v of html_elements) {
        if (v.className === 'debug_value') {
            ret = {...ret, [v.getAttribute('value')]: (val) => v.textContent = val};
        } else {
            ret = {...ret, ...register_debug_values(v.children)};
        }
    }
    return ret;
});
const debug_values = register_debug_values(document.getElementById('debug_info').children);

/** @type {HTMLCanvasElement} **/
const game_canvas = document.getElementById("main_window");
const context = game_canvas.getContext("2d");

// Set up web socket
/** @type {HTMLButtonElement} */
const connection_button = document.getElementById("ws_connect");
connection_button.addEventListener("click", ev => {
    if (game_state.connection === null) {
        console.log("Attempting connection");
        game_state.connection = new WebSocket("/api/connect");
        game_state.connection.addEventListener("open", e => {
            console.log("connected!");
        });
        game_state.connection.addEventListener("message", e => {
            const msg = deserialize(e.data);
            switch (msg.kind) {
                case 1:
                    game_state.client_player.id = msg.id;
                    break;
                case 3:
                    game_state.client_player.alive = true;
                    break;
                case 4:
                    msg.pos.forEach(p => {
                        if (p.id === game_state.client_player.id) {
                            game_state.client_player.pos = {x: p.x, y: 600 - p.y}
                        } else {
                            if (game_state.other_players[p.id] === undefined) {
                                spawn_player(p.id);
                            }
                            game_state.other_players[p.id].pos  = {x: p.x, y: 600 - p.y}
                        }
                    });
                    break;
                case 6:
                    delete game_state.other_players[msg.dc_id];
                    break;
                case 7:
                    Object.entries(msg.segments).forEach(([str_id, s]) => {
                        const id = Number(str_id);
                        if (id === game_state.client_player.id) {
                            game_state.client_player.segments = s.map((p) => {return {x: p.x, y: 600 - p.y};});
                        } else {
                            game_state.other_players[id].segments = s.map((p) => {return {x: p.x, y: 600 - p.y};});
                        }
                    })
                    break;
                case 8:
                    game_state.client_player.grip = msg.cur_grip;
                    break;
                case 9:
                    game_state.simulation_tick = msg.tick;
                    break;
                default:
                    throw("Unknown message kind received");
            }
        })
        game_state.connection.addEventListener("close", e => {
            console.log("Lost connection!");
            game_state.connection = null;
            game_state.other_players = [];
            game_state.client_player.id = null;
            game_state.client_player.alive = false;
        })
    }
})

// Spawning logic
/** @type {HTMLButtonElement} */
const spawn_button = document.getElementById("spawn");
spawn_button.addEventListener("click", e => {
    if (game_state.connection !== null) {
        game_state.connection.send(serialize({
            player_id: game_state.client_player.id,
            kind: 2
        }));
    }
})

// Get input
addEventListener('keyup', (e) => {
    if (game_state.client_player.id !== null) {
        let msg = {kind: 5, player_id: game_state.client_player.id};
        switch (e.key) {
            case "w":
                game_state.current_direction = Direction.up;
                msg.direction = 0;
                break;
            case "s":
                game_state.current_direction = Direction.down;
                msg.direction = 1;
                break;
            case "a":
                game_state.current_direction = Direction.left;
                msg.direction = 2;
                break;
            case "d":
                game_state.current_direction = Direction.right;
                msg.direction = 3;
                break;
        }
        if (msg.direction !== undefined) {
            game_state.connection.send(serialize(msg));
        }
    }
})

// Set up main loop
const main_loop = ((t) => {
    const deltatime = (t - game_state.last_timestamp) / 1000.0;
    const fps = 1 / deltatime;

    // Update game state
    {

    }

    // Draw game state
    {
        context.clearRect(0, 0, game_canvas.width, game_canvas.height);

        // Draw player
        if (game_state.client_player.alive) {
            const player_pos = game_state.client_player.pos;
            const bbox = game_params.player_bbox;
            context.fillStyle = "red";
            context.fillRect(
                player_pos.x - bbox.width / 2,
                player_pos.y - bbox.height / 2,
                bbox.width,
                bbox.height
            );
            if (game_state.client_player.segments !== null) {
                draw_trail(game_state.client_player.pos, game_state.client_player.segments, context, "red");
            }
        }

        // Draw other players
        Object.entries(game_state.other_players).forEach(([id, p]) => {
            const bbox = game_params.player_bbox;
            context.fillStyle = "green";
            context.fillRect(
                p.pos.x - bbox.width / 2,
                p.pos.y - bbox.height / 2,
                bbox.width,
                bbox.height
            );
            if (p.segments !== null) {
                draw_trail(p.pos, p.segments, context, "green");
            }
            context.fillStyle = "black";
            context.fillText(id, p.pos.x, p.pos.y);
        })
    }

    // Update DOM UI
    {
        Object.entries(debug_values).forEach((e) => e[1](eval(e[0])).toString());
    }

    game_state.last_timestamp = t;
    requestAnimationFrame(main_loop)
})
requestAnimationFrame(main_loop);
