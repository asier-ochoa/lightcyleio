import type { Server } from "bun";
import { game_props } from "./game.ts";

const Api: {[func_name: string]: (s: Server, r: Request) => Response} = {
    "connect": (s: Server, req: Request) => {
        const success = s.upgrade(req);
        return success ?
            new Response("Upgrading to WS successful") :
            new Response("Failed upgrading to WS", {status: 500});
    },

    "game_params": (s: Server, req: Request) => {
        return new Response(JSON.stringify(game_props));
    }
};

export default Api;