import * as fs from "node:fs";
import Api from "./api.ts";

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
console.log(static_files);

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
        open(ws) {
            console.log(`Client with address ${ws.remoteAddress} connected`);
        },
        message(ws, message) {

        }
    },
    port: 3000
})