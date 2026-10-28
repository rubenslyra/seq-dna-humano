const CHANNEL_NAME = "slide-sync";
const STORAGE_KEY = "slide-sync-event";
const ROOM_KEY = "slide-sync-room";

function getClientId() {
  if (typeof window === "undefined") return "server";
  const key = "slide-sync-client-id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem(key, id);
  }
  return id;
}

const clientId = typeof window !== "undefined" ? getClientId() : "server";

function getRoom() {
  if (typeof window === "undefined") return "default";
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("room");
  if (fromUrl) {
    localStorage.setItem(ROOM_KEY, fromUrl);
    return fromUrl;
  }
  const fromStorage = localStorage.getItem(ROOM_KEY);
  if (fromStorage) return fromStorage;
  const room = Math.random().toString(36).slice(2, 8);
  localStorage.setItem(ROOM_KEY, room);
  return room;
}

let room = typeof window !== "undefined" ? getRoom() : "default";
let ws = null;
let wsUrl = null;
let connected = false;
let reconnectTimer = null;
const listeners = new Set();

function getWsUrl() {
  if (wsUrl) return wsUrl;
  if (typeof window === "undefined") return null;
  const envUrl = typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_SLIDE_WS_URL;
  if (envUrl) {
    wsUrl = envUrl;
    return wsUrl;
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  if (window.location.protocol === "file:") { wsUrl = null; return wsUrl; } if (import.meta.env && import.meta.env.DEV) { wsUrl = `${proto}//${window.location.hostname}:8787`; return wsUrl; } wsUrl = null; return wsUrl;
  return wsUrl;
}

function connect() {
  if (typeof window === "undefined") return;
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  
  const url = getWsUrl();
  if (!url) return;
  
  try {
    ws = new WebSocket(url);
    ws.onopen = () => {
      connected = true;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "join", room: room, clientId: clientId }));
      }
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "slide" && typeof msg.slide === "number") {
          if (msg.source === clientId) return;
          for (const cb of listeners) {
            cb(msg.slide);
          }
        }
      } catch {
        // ignore
      }
    };
    ws.onclose = () => {
      connected = false;
      ws = null;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 1500);
    };
    ws.onerror = () => {
      connected = false;
    };
  } catch {
    connected = false;
  }
}

function ensureConnected() {
  if (typeof window === "undefined") return;
  connect();
}

// BroadcastChannel fallback
let channel = null;
function getChannel() {
  if (typeof window === "undefined") return null;
  if (!("BroadcastChannel" in window)) return null;
  if (!channel) {
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      channel = null;
    }
  }
  return channel;
}

export function getRoomName() {
  return room;
}

export function setRoomName(newRoom) {
  if (!newRoom) return;
  room = String(newRoom);
  if (typeof window !== "undefined") {
    localStorage.setItem(ROOM_KEY, room);
    const url = new URL(window.location.href);
    url.searchParams.set("room", room);
    window.history.replaceState({}, "", url.toString());
  }
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "join", room: room, clientId: clientId }));
  }
}

export function emitSlideChange(slide) {
  if (typeof window === "undefined") return;
  const num = Number(slide);
  if (!Number.isFinite(num)) return;
  
  // Try WebSocket first
  ensureConnected();
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({ type: "slide", room: room, slide: num, clientId: clientId }));
    } catch {
      // continue to fallbacks
    }
  }
  
  // BroadcastChannel
  const ch = getChannel();
  if (ch) {
    try {
      ch.postMessage({ type: "go", slide: num, source: clientId, ts: Date.now(), room: room });
    } catch {
      // ignore
    }
  }
  
  // localStorage fallback
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ type: "go", slide: num, source: clientId, ts: Date.now(), room: room }));
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function onSlideChange(cb) {
  if (typeof window === "undefined") return function() {};
  
  listeners.add(cb);
  ensureConnected();
  
  const ch = getChannel();
  const chHandler = (ev) => {
    const data = ev.data;
    if (!data || data.type !== "go") return;
    if (data.source === clientId) return;
    if (typeof data.slide === "number") {
      cb(data.slide);
    }
  };
  if (ch) ch.addEventListener("message", chHandler);
  
  const storageHandler = (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      const data = JSON.parse(e.newValue);
      if (data.type !== "go") return;
      if (data.source === clientId) return;
      if (typeof data.slide === "number") {
        cb(data.slide);
      }
    } catch {
      // ignore
    }
  };
  window.addEventListener("storage", storageHandler);
  
  return function() {
    listeners.delete(cb);
    if (ch) ch.removeEventListener("message", chHandler);
    window.removeEventListener("storage", storageHandler);
    if (listeners.size === 0 && ws) {
      try { ws.close(); } catch {}
      ws = null;
    }
  };
}

if (typeof window !== "undefined") {
  ensureConnected();
}

