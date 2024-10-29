import * as fs from "node:fs";
import Api from "./api.ts";
import {connections, NewPlayerIdMessage, SpawnMessage, SpawnResponseMessage } from "./ws.ts";
import {MessageKind, NewPlayerMessage, type Message} from "./ws.ts";
import type { ServerWebSocket } from "bun";
import * as s from "./serial.js";

type FilePath = string;
const read_static_files = ((cur_path: FilePath) => {
    var files: Set<FilePath> = new Set();
    fs.readdirSync(`./static/${cur_path}`, {withFileTypes: true}).forEach(f => {
        // Recursive file read
        if (f.isDirectory()) {
            files = files.union(read_static_files(`${cur_path}${f.name}/`));
        } else {
            files.add(`./static/${cur_path}${f.name}`);
        }
    });
    return files;
});
const static_files = read_static_files("");
console.log("Registered the following static files:");
console.log(static_files, '\n')

// Run game simulation
const game_worker = new Worker("./src/game.ts");

// Declare server
Bun.serve({
    fetch(req: Request) {
        const path = new URL(req.url).pathname;
        if (path.startsWith("/api")) {
            const api_func = Api[path.substring(5)];
            if (api_func !== undefined) {
                return api_func(this, req);
            } else {
                return new Response("Not found", {status: 404});
            }
        }

        // Serve static routes
        // Base route is / which turns into index.html
        if (path === "/") return new Response(Bun.file("./static/index.html"));
        if (static_files.has(`./static${path}`)) {
            return new Response(Bun.file(`./static${path}`));
        } else {
            console.log(`Couldn't find file with URL path: ${path}`)
            return new Response("Not found", {status: 404});
        }   
    },
    websocket: {
        open(ws: ServerWebSocket) {
            console.log(`Client with address ${ws.remoteAddress} connected`);
            game_worker.postMessage(new NewPlayerMessage())
            game_worker.onmessage = ev => {
                console.log(`Received from game logic worker:`)
                console.log(JSON.stringify(ev.data, null, 4))

                const outer_msg: Message = ev.data;
                // Store connection
                if (outer_msg.kind === MessageKind.new_player_id) {
                    const msg = outer_msg as NewPlayerIdMessage;
                    connections[msg.id] = ws;
                    connections[msg.id].send(s.serialize(msg), true);
                }
                if (outer_msg.kind === MessageKind.spawn_response) {
                    const msg = outer_msg as SpawnResponseMessage;
                    const conn = connections[msg.player_id];
                    conn.send(s.serialize(msg), true);
                }
            }
        },
        message(ws, message) {
            const outer_msg = s.deserialize(message) as Message;
            switch (outer_msg.kind) {
                case MessageKind.spawn:
                    console.log(message);
                    const msg = outer_msg as SpawnMessage;
                    game_worker.postMessage(outer_msg);
                    break;
                default:
                    console.log("Error, unknown message kind received from client")
                    break;
            }
        }
    },
    port: 3000
})