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
    base_speed: 1
})

const game_state = {
    player_pos: {
        x: 400,
        y: 400
    },
    current_direction: Direction.right
}

addEventListener("DOMContentLoaded", () => {
    // Find all children of debug info and add them to a list that
    // holds a method to change its value.
    // HTML element reference is held thanks to closure.
    const debug_values = (() => {
        const values = document.getElementById('debug_info').children;
        let ret = {}
        for (let v of values) {
            ret = {...ret, [v.getAttribute('value')]: () => {
                console.log(v.getAttribute('value'));
                v.textContent = eval(v.getAttribute('value')).toString();
            }};
        }
        return(ret)
    })()

    /** @type {HTMLCanvasElement} **/
    const game_canvas = document.getElementById("main_window")
    const context = game_canvas.getContext("2d");

    // Set up web socket

    // Set up main loop
    /**
     * @param {number} dt
     */
    const main_loop = ((dt) => {
        const deltatime = dt / 1000.0;

        // Get input

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
            console.log(eval("dt").toString())
            Object.values(debug_values).forEach(v => v());
        }

        requestAnimationFrame(main_loop)
    })
    requestAnimationFrame(main_loop);
});