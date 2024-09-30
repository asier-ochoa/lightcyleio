import {static_routes, static_file_map} from "./frontend";

Bun.serve({
    fetch(req: Request) {
        const path = new URL(req.url).pathname;
        if (path.startsWith("/api")) {
            return new Response("Api under construction", {status: 204});
        }

        // Serve static routes
        // Base route is / which turns into index.html
        return static_routes((path !== "/") ? path.slice(1) : "index.html");
    }
})