const CHANNEL_NAME = "slide-sync";
const STORAGE_KEY = "slide-sync-event";

export type SlideSyncEvent = {
  type: "go";
  slide: number;
  source: string;
  ts: number;
};

function getSourceId() {
  if (typeof window === "undefined") return "server";
  const key = "slide-sync-id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2, 9);
    sessionStorage.setItem(key, id);
  }
  return id;
}

const sourceId = typeof window !== "undefined" ? getSourceId() : "server";

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

export function emitSlideChange(slide) {
  if (typeof window === "undefined") return;
  const ev = {
    type: "go",
    slide,
    source: sourceId,
    ts: Date.now(),
  };

  const ch = getChannel();
  if (ch) {
    try {
      ch.postMessage(ev);
      return;
    } catch {
      // fall through
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ev));
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function onSlideChange(cb) {
  if (typeof window === "undefined") return function() {};

  const ch = getChannel();
  const handler = function(ev) {
    const data = ev.data;
    if (!data || data.type !== "go") return;
    if (data.source === sourceId) return;
    if (typeof data.slide === "number") {
      cb(data.slide);
    }
  };

  if (ch) {
    ch.addEventListener("message", handler);
  }

  const storageHandler = function(e) {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      const data = JSON.parse(e.newValue);
      if (data.type !== "go") return;
      if (data.source === sourceId) return;
      if (typeof data.slide === "number") {
        cb(data.slide);
      }
    } catch {
      // ignore
    }
  };

  window.addEventListener("storage", storageHandler);

  return function() {
    if (ch) {
      ch.removeEventListener("message", handler);
      try {
        ch.close();
      } catch {
        // ignore
      }
      channel = null;
    }
    window.removeEventListener("storage", storageHandler);
  };
}
