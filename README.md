# lightcycle

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run main.js
```

This repo is divided into 2 parts: the frontend and backend server. The backend server is separated into 2 processes:
- Server logic which deals with game logic, api and session management.
- Frontend serving which deals with serving react javascript and html, 

## Game session connection workflow
This describes the steps backend takes to establish a connection from a new player
- Received get request to `/api/connect`
- Establish websocket connection with client by storing in `connections` array in `ws.ts`
- Send `new_player` message kind to worker
- Worker returns `new_player_id` message
- Player id gets sent back to client