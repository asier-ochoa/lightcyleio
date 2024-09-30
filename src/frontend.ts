import * as fs from "node:fs"
import { file_not_found } from "./responses";

// Set up static resources. If in dev mode, add a watcher that reloads the file.
// 1. Make a lookup table for every file in static
// 2. Set up a watcher to rebuild every jsx file on change
// 3. Reload file on change (Create a new response object with the new file)
// ATTENTION! Do not make async, must run before server starts!
const setup_hotreload = () => {
    console.log("Starting in DEV mode. Static files will be reloaded.")
};

var static_file_map = (() => {
    var map: {[index: string]: Response} = {};
    for (var f of fs.readdirSync("./static/")) {
        map[f] = new Response(Bun.file(`./static/${f}`));
    }
    console.log(`Finished building static response map:\n ${JSON.stringify(map)}`);

    if (Bun.env.DEV_ENV === "true") {
        setup_hotreload();
    }
    return map;
})();

const static_routes = (path_trimmed: string): Response => {
    const resp = static_file_map[path_trimmed];
    if (resp === undefined) {return file_not_found;}
    return resp;
};

export {static_routes, static_file_map};