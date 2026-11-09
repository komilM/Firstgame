// JANG MAYDONI — onlayn server (qo‘shimcha kutubxona kerak emas)
// Ishga tushirish:  node server.cjs        (port o‘zgartirish: PORT=4000 node server.cjs)
"use strict";

const http = require("http");
const crypto = require("crypto");
const os = require("os");

const PORT = Number(process.env.PORT) || 3001;
const MAX_TEAM = 3; // 3x3
const KILL_LIMIT = 10;
const RESPAWN_MS = 4000;
const PROTECT_MS = 2000;
const MAPS = ["meadow", "desert", "snow"];

// O‘yindagi qurollar bilan bir xil (App.jsx dagi WEAPONS)
const WEAPONS = {
  stick: { kind: "melee", damage: 20, cooldown: 380, reach: 3.2 },
  sword: { kind: "melee", damage: 35, cooldown: 430, reach: 3.6 },
  bow: { kind: "ranged", damage: 40, cooldown: 430 },
  crossbow: { kind: "ranged", damage: 65, cooldown: 900 },
};

const rooms = new Map();
const clients = new Set();
let nextId = 1;

/* ---------------- WebSocket (RFC 6455, minimal) ---------------- */

const server = http.createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  res.end("Jang maydoni serveri ishlayapti.\n");
});

server.on("upgrade", (req, socket) => {
  const key = req.headers["sec-websocket-key"];
  if (!key || String(req.headers.upgrade).toLowerCase() !== "websocket") {
    socket.destroy();
    return;
  }
  const accept = crypto
    .createHash("sha1")
    .update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
    .digest("base64");
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " +
      accept +
      "\r\n\r\n",
  );
  socket.setNoDelay(true);

  const c = { socket, buf: Buffer.alloc(0), frag: null, player: null };
  clients.add(c);
  socket.on("data", (chunk) => {
    c.buf = Buffer.concat([c.buf, chunk]);
    parseFrames(c);
  });
  socket.on("close", () => {
    clients.delete(c);
    removePlayer(c);
  });
  socket.on("error", () => socket.destroy());
});

function parseFrames(c) {
  for (;;) {
    const b = c.buf;
    if (b.length < 2) return;
    const fin = (b[0] & 0x80) !== 0;
    const op = b[0] & 0x0f;
    const masked = (b[1] & 0x80) !== 0;
    let len = b[1] & 0x7f;
    let off = 2;
    if (len === 126) {
      if (b.length < 4) return;
      len = b.readUInt16BE(2);
      off = 4;
    } else if (len === 127) {
      if (b.length < 10) return;
      len = Number(b.readBigUInt64BE(2));
      off = 10;
    }
    if (len > 65536) {
      c.socket.destroy();
      return;
    }
    const total = off + (masked ? 4 : 0) + len;
    if (b.length < total) return;
    let payload = b.subarray(off + (masked ? 4 : 0), total);
    if (masked) {
      const mask = b.subarray(off, off + 4);
      payload = Buffer.from(payload);
      for (let i = 0; i < payload.length; i += 1) payload[i] ^= mask[i & 3];
    }
    c.buf = b.subarray(total);
    handleFrame(c, fin, op, payload);
  }
}

function handleFrame(c, fin, op, payload) {
  if (op === 0x8) {
    c.socket.end(Buffer.from([0x88, 0x00]));
  } else if (op === 0x9) {
    const head = Buffer.from([0x8a, payload.length]);
    c.socket.write(Buffer.concat([head, payload]));
  } else if (op === 0x1 || op === 0x0) {
    if (op === 0x1) c.frag = [payload];
    else if (c.frag) c.frag.push(payload);
    if (fin && c.frag) {
      const text = Buffer.concat(c.frag).toString("utf8");
      c.frag = null;
      onMessage(c, text);
    }
  }
}

function send(c, obj) {
  if (!c || c.socket.destroyed || !c.socket.writable) return;
  const data = Buffer.from(JSON.stringify(obj));
  const n = data.length;
  let head;
  if (n < 126) head = Buffer.from([0x81, n]);
  else if (n < 65536) {
    head = Buffer.alloc(4);
    head[0] = 0x81;
    head[1] = 126;
    head.writeUInt16BE(n, 2);
  } else {
    head = Buffer.alloc(10);
    head[0] = 0x81;
    head[1] = 127;
    head.writeBigUInt64BE(BigInt(n), 2);
  }
  c.socket.write(Buffer.concat([head, data]));
}

function fail(c, code) {
  send(c, { t: "error", code });
  c.socket.end(Buffer.from([0x88, 0x00]));
}

/* ---------------- Xona va o‘yin mantig‘i ---------------- */

function makeCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  for (;;) {
    let s = "";
    for (let i = 0; i < 4; i += 1) s += letters[Math.floor(Math.random() * letters.length)];
    if (!rooms.has(s)) return s;
  }
}

function teamCounts(room) {
  const counts = { blue: 0, red: 0 };
  for (const p of room.players.values()) counts[p.team] += 1;
  return counts;
}

function teamIndex(room, player) {
  let i = 0;
  for (const p of room.players.values()) {
    if (p === player) return i;
    if (p.team === player.team) i += 1;
  }
  return i;
}

// Ko‘k jamoa janubdan (z=+7), qizil jamoa shimoldan (z=-26) chiqadi
function spawnFor(team, index) {
  const x = (index - 1) * 2.6 + (Math.random() - 0.5) * 0.6;
  return team === "blue"
    ? { x, z: 7 + Math.random() * 1.5, yaw: 0 }
    : { x, z: -26 - Math.random() * 1.5, yaw: Math.PI };
}

function lobbyMsg(room) {
  return {
    t: "lobby",
    code: room.code,
    phase: room.phase,
    hostId: room.hostId,
    map: room.map,
    players: [...room.players.values()].map((p) => ({ id: p.id, name: p.name, team: p.team })),
  };
}

function broadcast(room, obj, except) {
  for (const p of room.players.values()) if (p !== except) send(p.c, obj);
}

function cleanName(name, id) {
  const s = String(name || "")
    .replace(/[^\p{L}\p{N} _-]/gu, "")
    .trim()
    .slice(0, 14);
  return s || `Player${id}`;
}

function joinRoom(c, room, name) {
  const counts = teamCounts(room);
  if (counts.blue >= MAX_TEAM && counts.red >= MAX_TEAM) return fail(c, "full");
  const id = nextId++;
  const team = counts.blue <= counts.red ? (counts.blue < MAX_TEAM ? "blue" : "red") : counts.red < MAX_TEAM ? "red" : "blue";
  const p = {
    id, c, room, team,
    name: cleanName(name, id),
    x: 0, z: 0, yaw: 0, jy: 0, w: "stick", a: 0,
    hp: 100, alive: true, respawnAt: 0, protectUntil: 0, lastHit: 0, kills: 0,
  };
  room.players.set(id, p);
  if (!room.hostId) room.hostId = id;
  c.player = p;
  send(c, { t: "joined", id, code: room.code });
  broadcast(room, lobbyMsg(room));
}

function startMatch(room) {
  room.phase = "play";
  room.score = { blue: 0, red: 0 };
  const idx = { blue: 0, red: 0 };
  const list = [];
  const now = Date.now();
  for (const p of room.players.values()) {
    const s = spawnFor(p.team, idx[p.team]++);
    Object.assign(p, {
      x: s.x, z: s.z, yaw: s.yaw, jy: 0, hp: 100, alive: true,
      protectUntil: now + PROTECT_MS, lastHit: 0, kills: 0, a: 0, w: "stick",
    });
    list.push({ id: p.id, name: p.name, team: p.team, x: s.x, z: s.z, yaw: s.yaw });
  }
  broadcast(room, lobbyMsg(room));
  broadcast(room, { t: "start", map: room.map, killLimit: KILL_LIMIT, score: room.score, players: list });
}

function endMatch(room, winner) {
  if (room.phase !== "play") return;
  room.phase = "lobby";
  broadcast(room, { t: "end", winner, score: room.score });
  broadcast(room, lobbyMsg(room));
}

function removePlayer(c) {
  const p = c.player;
  if (!p) return;
  c.player = null;
  const room = p.room;
  room.players.delete(p.id);
  if (room.players.size === 0) {
    rooms.delete(room.code);
    return;
  }
  if (room.hostId === p.id) room.hostId = room.players.keys().next().value;
  if (room.phase === "play") {
    broadcast(room, { t: "left", id: p.id });
    const counts = teamCounts(room);
    if (counts.blue === 0 || counts.red === 0) endMatch(room, counts.blue === 0 ? "red" : "blue");
  }
  broadcast(room, lobbyMsg(room));
}

function handleHit(p, m) {
  const room = p.room;
  const now = Date.now();
  if (room.phase !== "play" || !p.alive) return;
  const weapon = WEAPONS[m.w];
  if (!weapon) return;
  const target = room.players.get(Number(m.target));
  if (!target || target.team === p.team || !target.alive || now < target.protectUntil) return;
  if (now - p.lastHit < weapon.cooldown * 0.4) return;
  const dist = Math.hypot(p.x - target.x, p.z - target.z);
  const maxDist = weapon.kind === "melee" ? weapon.reach + 2.5 : 110;
  if (dist > maxDist) return;
  p.lastHit = now;

  target.hp = Math.max(0, target.hp - weapon.damage);
  broadcast(room, { t: "hp", id: target.id, hp: target.hp, by: p.id });
  if (target.hp === 0) {
    target.alive = false;
    target.respawnAt = now + RESPAWN_MS;
    p.kills += 1;
    room.score[p.team] += 1;
    broadcast(room, { t: "dead", id: target.id, by: p.id, score: room.score });
    if (room.score[p.team] >= KILL_LIMIT) endMatch(room, p.team);
  }
}

const num = (v) => typeof v === "number" && Number.isFinite(v);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function onMessage(c, text) {
  let m;
  try {
    m = JSON.parse(text);
  } catch {
    return;
  }
  const p = c.player;

  switch (m.t) {
    case "create": {
      if (p) return;
      const room = { code: makeCode(), hostId: 0, phase: "lobby", map: "meadow", players: new Map(), score: { blue: 0, red: 0 } };
      rooms.set(room.code, room);
      joinRoom(c, room, m.name);
      break;
    }
    case "join": {
      if (p) return;
      const room = rooms.get(String(m.code || "").trim().toUpperCase());
      if (!room) return fail(c, "no_room");
      if (room.phase !== "lobby") return fail(c, "started");
      joinRoom(c, room, m.name);
      break;
    }
    case "team": {
      if (!p || p.room.phase !== "lobby") return;
      if (m.team !== "blue" && m.team !== "red") return;
      if (m.team === p.team || teamCounts(p.room)[m.team] >= MAX_TEAM) return;
      p.team = m.team;
      broadcast(p.room, lobbyMsg(p.room));
      break;
    }
    case "map": {
      if (!p || p.room.hostId !== p.id || p.room.phase !== "lobby" || !MAPS.includes(m.map)) return;
      p.room.map = m.map;
      broadcast(p.room, lobbyMsg(p.room));
      break;
    }
    case "start": {
      if (!p || p.room.hostId !== p.id || p.room.phase !== "lobby") return;
      const counts = teamCounts(p.room);
      if (counts.blue < 1 || counts.red < 1) return;
      startMatch(p.room);
      break;
    }
    case "state": {
      if (!p || p.room.phase !== "play" || !p.alive) return;
      if (!num(m.x) || !num(m.z) || !num(m.yaw)) return;
      p.x = clamp(m.x, -40, 40);
      p.z = clamp(m.z, -40, 40);
      p.yaw = m.yaw;
      p.jy = num(m.jy) ? clamp(m.jy, 0, 6) : 0;
      if (WEAPONS[m.w]) p.w = m.w;
      p.a = (m.a | 0) % 1000000;
      break;
    }
    case "hit": {
      if (p) handleHit(p, m);
      break;
    }
    case "shot": {
      if (!p || p.room.phase !== "play" || !p.alive) return;
      const w = WEAPONS[m.w];
      if (!w || w.kind !== "ranged") return;
      const ok = (a) => Array.isArray(a) && a.length === 3 && a.every(num);
      if (!ok(m.o) || !ok(m.d)) return;
      broadcast(p.room, { t: "shot", id: p.id, o: m.o, d: m.d, w: m.w }, p);
      break;
    }
    case "leave": {
      removePlayer(c);
      break;
    }
    default:
  }
}

// 20 marta/soniya: hamma o‘yinchilar holatini yuboradi + qayta tirilish
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.phase !== "play") continue;
    for (const p of room.players.values()) {
      if (p.alive || now < p.respawnAt) continue;
      const s = spawnFor(p.team, teamIndex(room, p));
      Object.assign(p, { x: s.x, z: s.z, yaw: s.yaw, jy: 0, hp: 100, alive: true, protectUntil: now + PROTECT_MS });
      broadcast(room, { t: "respawn", id: p.id, x: s.x, z: s.z, yaw: s.yaw });
    }
    const s = [...room.players.values()].map((p) => [
      p.id, +p.x.toFixed(2), +p.z.toFixed(2), +p.yaw.toFixed(2), +p.jy.toFixed(2), p.w, p.a,
    ]);
    broadcast(room, { t: "snap", s });
  }
}, 50);

// Aloqa uzilib qolmasligi uchun ping
setInterval(() => {
  for (const c of clients) if (c.socket.writable) c.socket.write(Buffer.from([0x89, 0x00]));
}, 25000);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\nJang maydoni serveri ishga tushdi (port ${PORT}).`);
  console.log("Do‘stlar shu manzillardan ulanishi mumkin:");
  console.log(`  ws://localhost:${PORT}   (shu kompyuterda)`);
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) if (i.family === "IPv4" && !i.internal) console.log(`  ws://${i.address}:${PORT}`);
  }
  console.log("");
});
