import type { Server } from "bun";

const Api: {[func_name: string]: (s: Server, r: Request) => Response} = {
    "connect": (s: Server, req: Request) => {
        const success = s.upgrade(req);
        return success ?
            new Response("Upgrading to WS successful") :
            new Response("Failed upgrading to WS", {status: 500});
    }
};

export default Api;