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
    player_pos: {
        x: 400,
        y: 400,
        toString() {
            return `x: ${this.x}, y: ${this.y}`;
        }
    },
    current_direction: Direction.right,
    // Used to get delta_time
    last_timestamp: 0
}

addEventListener("DOMContentLoaded", () => {
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
 
    // Set up main loop
    const main_loop = ((t) => {
        const deltatime = (t - game_state.last_timestamp) / 1000.0;
        const fps = 1 / deltatime;

        // Get input
        addEventListener('keydown', (e) => {
            switch (e.key) {
                case "w":
                    game_state.current_direction = Direction.up;
                    break;
                case "s":
                    game_state.current_direction = Direction.down;
                    break;
                case "a":
                    game_state.current_direction = Direction.left;
                    break;
                case "d":
                    game_state.current_direction = Direction.right;
                    break;
            }
        })

        // Update game state
        {
            var pos = game_state.player_pos;
            switch (game_state.current_direction) {
                case Direction.up:
                    pos.y -= game_params.base_speed * deltatime;
                    break;
                case Direction.down:
                    pos.y += game_params.base_speed * deltatime;
                    break;
                case Direction.left:
                    pos.x -= game_params.base_speed * deltatime;
                    break;
                case Direction.right:
                    pos.x += game_params.base_speed * deltatime;
                    break;
            }
        }

        // Draw game state
        {
           context.clearRect(0, 0, game_canvas.width, game_canvas.height);

           // Draw player
           const player_pos = game_state.player_pos;
           const bbox = game_params.player_bbox;
           context.fillRect(
            player_pos.x - bbox.width / 2,
            player_pos.y - bbox.height / 2,
            bbox.width,
            bbox.height
           );
        }

        // Update DOM UI
        {
            Object.entries(debug_values).forEach((e) => e[1](eval(e[0])).toString());
        }

        game_state.last_timestamp = t;
        requestAnimationFrame(main_loop)
    })
    requestAnimationFrame(main_loop);
});