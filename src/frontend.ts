import * as fs from "node:fs"
import { watch } from "fs";
import { build_jsx_file } from "./compile";
import type { BunFile } from "bun";

// Set up static resources. If in dev mode, add a watcher that reloads the file.
// 1. Make a lookup table for every file in static
// 2. Set up a watcher to rebuild every jsx file on change
// 3. Reload file on change (Create a new response object with the new file)
// ATTENTION! Do not make async, must run before server starts!
const setup_hotreload = (static_file_map: {[index: string]: BunFile}) => {
    console.log("Starting in DEV mode. Static files will be reloaded.");
    for (const k in static_file_map) {
        watch(`./static/${k}`, {}, (!k.endsWith(".jsx")) ? async () => {
            console.log(`File: ${k} modified, rebuilding response.`);
            static_file_map[k] = Bun.file(`./static/${k}`);
            console.log("Finished building response");
        } : async () => {
            console.log(`File: ${k} modified, recompiling and rebuilding response.`);
            await build_jsx_file(`./static/${k}`)
            static_file_map[k] = Bun.file(`./static/out/${k.split(".")[0]}.js`);
            console.log("Finished building response");
        });
    }
};

var static_file_map = await (async () => {
    var map: {[index: string]: BunFile} = {};
    for (const f of fs.readdirSync("./static/", {withFileTypes: true})) {
        // Skip folders
        // TODO: implement recursive search
        if (f.isDirectory()) {
            continue;
        }

        const file_name = f.name.split('.')[0];
        // Point to "out" folder when its a jsx file
        if(f.name.endsWith(".jsx")) {
            map[f.name] = Bun.file(`./static/out/${file_name}.js`);
        } else {
            map[f.name] = Bun.file(`./static/${f.name}`);
        }
    }
    console.log(`Finished building static response map:\n ${JSON.stringify(map)}`);

    if (Bun.env.DEV_ENV === "true") {
        setup_hotreload(map);
    }
    return map;
})();

const static_routes = async (path_trimmed: string): Promise<Response> => {
    console.log(`Static file with path "${path_trimmed}" requested`);
    const resp = new Response(static_file_map[path_trimmed]);
    if (resp === undefined) {new Response("File not found", {status: 404})}
    return resp;
};

export {static_routes, static_file_map};