import { WebSocketServer } from "ws";

const PORT = process.env.SLIDE_WS_PORT || 8787;
const wss = new WebSocketServer({ port: PORT });

const rooms = new Map();

function getRoom(room) {
  if (!rooms.has(room)) {
    rooms.set(room, new Set());
  }
  return rooms.get(room);
}

wss.on("connection", (ws, req) => {
  let currentRoom = null;
  let clientId = null;

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      
      if (msg.type === "join" && msg.room) {
        currentRoom = String(msg.room);
        clientId = msg.clientId || Math.random().toString(36).slice(2);
        const roomSet = getRoom(currentRoom);
        roomSet.add(ws);
        ws.send(JSON.stringify({ type: "joined", room: currentRoom, clientId }));
        return;
      }

      if (msg.type === "slide" && currentRoom && clientId) {
        const roomSet = getRoom(currentRoom);
        for (const client of roomSet) {
          if (client === ws) continue;
          if (client.readyState === 1) {
            client.send(JSON.stringify({
              type: "slide",
              room: currentRoom,
              slide: msg.slide,
              source: clientId,
              ts: Date.now()
            }));
          }
        }
      }
    } catch (e) {
      // ignore
    }
  });

  ws.on("close", () => {
    if (currentRoom && rooms.has(currentRoom)) {
      const roomSet = rooms.get(currentRoom);
      roomSet.delete(ws);
      if (roomSet.size === 0) {
        rooms.delete(currentRoom);
      }
    }
  });
});

console.log(`Slide WS server running on ws://localhost:${PORT}`);
