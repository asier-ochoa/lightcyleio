import * as fs from "node:fs";
import Api from "./api.ts";
import {connections, DirectionRequestMessage, NewPlayerIdMessage, PlayerDisconnectMessage, PlayerGripMessage, PlayerPositionMessage, PlayerTrailMessage, SpawnMessage, SpawnResponseMessage, TickMessage } from "./ws.ts";
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
                // console.log(`Received from game logic worker:`)
                // console.log(JSON.stringify(ev.data, null, 4))

                const outer_msg: Message = ev.data;
                // Store connection
                if (outer_msg.kind === MessageKind.new_player_id) {
                    const msg = outer_msg as NewPlayerIdMessage;
                    connections[msg.id] = ws;
                    connections[msg.id].send(s.serialize(msg), true);
                }
                // Respond to spawning
                if (outer_msg.kind === MessageKind.spawn_response) {
                    const msg = outer_msg as SpawnResponseMessage;
                    const conn = connections[msg.player_id];
                    if (conn !== undefined){
                        conn.send(s.serialize(msg), true);
                    }
                }
                // Broadcast all player positions
                if (outer_msg.kind === MessageKind.player_position) {
                    const msg = outer_msg as PlayerPositionMessage;
                    Object.values(connections).forEach(conn => conn.send(s.serialize(msg), true));
                }
                // Broadcast all trails
                if (outer_msg.kind === MessageKind.player_trail) {
                    const msg = outer_msg as PlayerTrailMessage;
                    Object.values(connections).forEach(conn => conn.send(s.serialize(msg), true));
                }
                // Notify of a disconnected player
                if (outer_msg.kind === MessageKind.player_disconnect) {
                    const msg = outer_msg as PlayerDisconnectMessage;
                    const conn = connections[msg.broadcast_id!];
                    if (conn !== undefined){
                        conn.send(s.serialize(msg), true);
                    }
                }
                // Send player their grip
                if (outer_msg.kind === MessageKind.player_grip) {
                    const msg = outer_msg as PlayerGripMessage;
                    const conn = connections[msg.id];
                    if (conn !== undefined) {
                        conn.send(s.serialize(msg), true);
                    }
                }
                // Broadcast current tick to all clients
                if (outer_msg.kind === MessageKind.tick) {
                    const msg = outer_msg as TickMessage;
                    Object.values(connections).forEach(conn => conn.send(s.serialize(msg), true));
                }
            }
        },
        message(ws, message) {
            const outer_msg = s.deserialize(message) as Message;
            switch (outer_msg.kind) {
                case MessageKind.spawn: {
                    const msg = outer_msg as SpawnMessage;
                    game_worker.postMessage(msg);
                    break;
                }
                case MessageKind.direction_request: {
                    const msg = outer_msg as DirectionRequestMessage
                    game_worker.postMessage(msg)
                    break;
                }
                default:
                    console.log(`Error, unknown message kind received from client: ${outer_msg.kind}`);
                    break;
            }
        },
        close(ws, code, reason) {
            // Linear search through the connections to find id and then close it in game loop
            const disconnected = Object.entries(connections).filter(([_, socket]) => socket === ws);
            if (disconnected.length < 1) {
                console.log("Error: couldn't find ID of player that just disconnected");
            } else {
                const id = Number(disconnected[0][0]);
                game_worker.postMessage(new PlayerDisconnectMessage(id, null));
                delete connections[id];
            }
        },
    },
    port: 3000
})