import * as fs from "node:fs"

// Set up static resources if in dev mode.
// 1. Make a lookup table for every file in static
// 2. Set up a watcher to rebuild every jsx file on change
// 3. Reload file on change (Create a new response object with the new file)
// ATTENTION! Do not make async, must run before server starts!
var static_file_map: {[index: string]: Response} | null = null;
if (Bun.env.DEV_ENV === "true") {
    console.log("Starting in DEV mode. Static files will be reloaded.")
    static_file_map = {};
    for (var f of fs.readdirSync("./static/")) {
        console.log(`Watching file: ${f}`);
        static_file_map[f] = new Response(Bun.file(`./index/${f}`));
    }
    console.log(`Finished building static response map:\n ${JSON.stringify(static_file_map)}`);
}

Bun.serve({
    fetch(req: Request) {
        if (req.url.match("^.+?\/api\/")) {
            return new Response("Api under construction");
        }
        return new Response("Static files go here!");
    }
})