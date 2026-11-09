import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

export const MAX_TEAM = 3;
const SERVER_KEY = "arena-server";
const NAME_KEY = "arena-name";

export const ONLINE_TEXT = {
  uz: {
    title: "ONLAYN O‘YIN",
    name: "Ismingiz",
    server: "Server manzili",
    serverHint: "Server ochish: terminalda «node server.cjs» ni ishga tushiring. Do‘stlar shu kompyuterning IP manzilini kiritadi.",
    create: "XONA OCHISH",
    join: "QO‘SHILISH",
    code: "Xona kodi",
    connecting: "Ulanmoqda…",
    room: "XONA",
    score: "HISOB",
    firstTo: "G‘alaba:",
    blue: "Ko‘k jamoa",
    red: "Qizil jamoa",
    joinTeam: "Shu jamoaga o‘tish",
    empty: "bo‘sh",
    you: "sen",
    host: "egasi",
    start: "O‘YINNI BOSHLASH",
    needBoth: "Boshlash uchun har bir jamoada kamida 1 o‘yinchi kerak.",
    waitHost: "Xona egasi o‘yinni boshlashini kuting…",
    leave: "XONADAN CHIQISH",
    resume: "O‘YINGA QAYTISH",
    respawning: "Tirilmoqdasan…",
    teamWon: "Sening jamoang yutdi!",
    teamLost: "Qarshi jamoa yutdi.",
    backLobby: "Xonaga qaytish",
    redYou: "QIZIL JAMOA · SEN",
    map: "Xarita",
    err: {
      connect: "Serverga ulanib bo‘lmadi. Server ishlayotganini va manzilni tekshiring.",
      closed: "Server bilan aloqa uzildi.",
      no_room: "Bunday xona topilmadi.",
      full: "Xona to‘lgan (3x3).",
      started: "O‘yin allaqachon boshlangan.",
    },
  },
  ru: {
    title: "ОНЛАЙН-ИГРА",
    name: "Ваше имя",
    server: "Адрес сервера",
    serverHint: "Запуск сервера: в терминале выполните «node server.cjs». Друзья вводят IP-адрес этого компьютера.",
    create: "СОЗДАТЬ КОМНАТУ",
    join: "ВОЙТИ",
    code: "Код комнаты",
    connecting: "Подключение…",
    room: "КОМНАТА",
    score: "СЧЁТ",
    firstTo: "До победы:",
    blue: "Синяя команда",
    red: "Красная команда",
    joinTeam: "Перейти в эту команду",
    empty: "пусто",
    you: "ты",
    host: "хозяин",
    start: "НАЧАТЬ ИГРУ",
    needBoth: "Для старта нужен хотя бы 1 игрок в каждой команде.",
    waitHost: "Ждите, пока хозяин комнаты начнёт игру…",
    leave: "ВЫЙТИ ИЗ КОМНАТЫ",
    resume: "ВЕРНУТЬСЯ В ИГРУ",
    respawning: "Возрождение…",
    teamWon: "Твоя команда победила!",
    teamLost: "Победила команда соперников.",
    backLobby: "В комнату",
    redYou: "КРАСНАЯ КОМАНДА · ТЫ",
    map: "Карта",
    err: {
      connect: "Не удалось подключиться. Проверьте, что сервер запущен и адрес верный.",
      closed: "Связь с сервером потеряна.",
      no_room: "Такая комната не найдена.",
      full: "Комната заполнена (3x3).",
      started: "Игра уже началась.",
    },
  },
  en: {
    title: "ONLINE PLAY",
    name: "Your name",
    server: "Server address",
    serverHint: "To host: run “node server.cjs” in a terminal. Friends enter this computer’s IP address.",
    create: "CREATE ROOM",
    join: "JOIN",
    code: "Room code",
    connecting: "Connecting…",
    room: "ROOM",
    score: "SCORE",
    firstTo: "First to",
    blue: "Blue team",
    red: "Red team",
    joinTeam: "Switch to this team",
    empty: "empty",
    you: "you",
    host: "host",
    start: "START MATCH",
    needBoth: "Each team needs at least 1 player to start.",
    waitHost: "Waiting for the host to start the match…",
    leave: "LEAVE ROOM",
    resume: "BACK TO GAME",
    respawning: "Respawning…",
    teamWon: "Your team won!",
    teamLost: "The other team won.",
    backLobby: "Back to room",
    redYou: "RED TEAM · YOU",
    map: "Map",
    err: {
      connect: "Could not connect. Check that the server is running and the address is right.",
      closed: "Connection to the server was lost.",
      no_room: "No room with that code.",
      full: "Room is full (3x3).",
      started: "The match has already started.",
    },
  },
};

export function loadName() {
  try {
    return localStorage.getItem(NAME_KEY) || "";
  } catch {
    return "";
  }
}

export function saveName(name) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // saqlab bo‘lmadi
  }
}

export function defaultServerUrl() {
  try {
    const saved = localStorage.getItem(SERVER_KEY);
    if (saved) return saved;
  } catch {
    // saqlangan manzil yo‘q
  }
  const secure = window.location.protocol === "https:";
  return `${secure ? "wss" : "ws"}://${window.location.hostname || "localhost"}:3001`;
}

// "192.168.1.5" -> "ws://192.168.1.5:3001"
export function normalizeUrl(input) {
  let url = input.trim();
  if (!url) return defaultServerUrl();
  if (!/^wss?:\/\//i.test(url)) {
    url = `${window.location.protocol === "https:" ? "wss" : "ws"}://${url}`;
    if (!/:\d+(\/|$)/.test(url.replace(/^wss?:\/\//i, ""))) url += ":3001";
  }
  try {
    localStorage.setItem(SERVER_KEY, url);
  } catch {
    // saqlab bo‘lmadi
  }
  return url;
}

function makeRemote(p) {
  return {
    id: p.id,
    name: p.name,
    team: p.team,
    health: 100,
    weapon: "stick",
    attack: 0,
    position: new THREE.Vector3(p.x, 0, p.z),
    target: { x: p.x, z: p.z, yaw: p.yaw, jy: 0 },
    actor: { current: { x: p.x, z: p.z, yaw: p.yaw, jumpY: 0 } },
  };
}

export function useOnline({ onStart, onKill, onEnd }) {
  const cbs = useRef({});
  cbs.current = { onStart, onKill, onEnd };

  const ws = useRef(null);
  const joined = useRef(false);
  const phaseRef = useRef("lobby");
  const me = useRef({ id: 0, team: "blue", hp: 100, pendingSpawn: null });
  const remotes = useRef(new Map());
  const names = useRef(new Map());
  const onShot = useRef(null);
  const enemiesBuf = useRef([]);
  const feedId = useRef(0);
  const handleRef = useRef(() => {});

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [room, setRoom] = useState(null);
  const [myHp, setMyHp] = useState(100);
  const [score, setScore] = useState({ blue: 0, red: 0 });
  const [killLimit, setKillLimit] = useState(10);
  const [ended, setEnded] = useState(false);
  const [winner, setWinner] = useState(null);
  const [remoteList, setRemoteList] = useState([]);
  const [feed, setFeed] = useState([]);

  const resetAll = useCallback(() => {
    remotes.current.clear();
    names.current.clear();
    Object.assign(me.current, { id: 0, team: "blue", hp: 100, pendingSpawn: null });
    phaseRef.current = "lobby";
    setRoom(null);
    setMyHp(100);
    setScore({ blue: 0, red: 0 });
    setEnded(false);
    setWinner(null);
    setRemoteList([]);
    setFeed([]);
  }, []);

  const send = useCallback((obj) => {
    const sock = ws.current;
    if (sock && sock.readyState === 1) sock.send(JSON.stringify(obj));
  }, []);

  handleRef.current = (m) => {
    switch (m.t) {
      case "joined":
        joined.current = true;
        me.current.id = m.id;
        break;
      case "lobby": {
        names.current = new Map(m.players.map((p) => [p.id, p.name]));
        const mine = m.players.find((p) => p.id === me.current.id);
        if (mine) me.current.team = mine.team;
        phaseRef.current = m.phase;
        setRoom({ code: m.code, id: me.current.id, hostId: m.hostId, phase: m.phase, map: m.map, players: m.players });
        setStatus("open");
        break;
      }
      case "start": {
        remotes.current.clear();
        for (const p of m.players) {
          if (p.id === me.current.id) {
            me.current.team = p.team;
            me.current.hp = 100;
            me.current.pendingSpawn = { x: p.x, z: p.z, yaw: p.yaw };
          } else {
            remotes.current.set(p.id, makeRemote(p));
          }
        }
        setMyHp(100);
        setScore(m.score);
        setKillLimit(m.killLimit);
        setEnded(false);
        setWinner(null);
        setFeed([]);
        setRemoteList([...remotes.current.values()]);
        cbs.current.onStart?.(m.map);
        break;
      }
      case "snap":
        for (const e of m.s) {
          const r = remotes.current.get(e[0]);
          if (!r) continue;
          r.target.x = e[1];
          r.target.z = e[2];
          r.target.yaw = e[3];
          r.target.jy = e[4];
          r.weapon = e[5];
          r.attack = e[6];
        }
        break;
      case "hp":
        if (m.id === me.current.id) {
          me.current.hp = m.hp;
          setMyHp(m.hp);
        } else {
          const r = remotes.current.get(m.id);
          if (r) r.health = m.hp;
        }
        break;
      case "dead": {
        if (m.id === me.current.id) {
          me.current.hp = 0;
          setMyHp(0);
        } else {
          const r = remotes.current.get(m.id);
          if (r) r.health = 0;
        }
        setScore(m.score);
        if (m.by === me.current.id) cbs.current.onKill?.();
        const id = ++feedId.current;
        const text = `${names.current.get(m.by) || "?"} ⚔ ${names.current.get(m.id) || "?"}`;
        setFeed((f) => [...f.slice(-3), { id, text }]);
        setTimeout(() => setFeed((f) => f.filter((x) => x.id !== id)), 4500);
        break;
      }
      case "respawn":
        if (m.id === me.current.id) {
          me.current.hp = 100;
          me.current.pendingSpawn = { x: m.x, z: m.z, yaw: m.yaw };
          setMyHp(100);
        } else {
          const r = remotes.current.get(m.id);
          if (r) {
            r.health = 100;
            Object.assign(r.target, { x: m.x, z: m.z, yaw: m.yaw, jy: 0 });
            Object.assign(r.actor.current, { x: m.x, z: m.z, yaw: m.yaw, jumpY: 0 });
          }
        }
        break;
      case "shot":
        onShot.current?.(m);
        break;
      case "end":
        setScore(m.score);
        setWinner(m.winner);
        setEnded(true);
        cbs.current.onEnd?.(m.winner === me.current.team);
        break;
      case "left":
        remotes.current.delete(m.id);
        setRemoteList([...remotes.current.values()]);
        break;
      case "error":
        setError(m.code);
        break;
      default:
    }
  };

  const closeSocket = useCallback(() => {
    const sock = ws.current;
    ws.current = null;
    joined.current = false;
    if (sock) {
      try {
        sock.send(JSON.stringify({ t: "leave" }));
      } catch {
        // hali ulanmagan
      }
      sock.close();
    }
  }, []);

  const connect = useCallback(
    (url, name, mode, code) => {
      closeSocket();
      resetAll();
      setError("");
      setStatus("connecting");
      let sock;
      try {
        sock = new WebSocket(url);
      } catch {
        setError("connect");
        setStatus("idle");
        return;
      }
      ws.current = sock;
      sock.onopen = () => {
        sock.send(JSON.stringify(mode === "create" ? { t: "create", name } : { t: "join", name, code }));
      };
      sock.onmessage = (event) => {
        let m;
        try {
          m = JSON.parse(event.data);
        } catch {
          return;
        }
        handleRef.current(m);
      };
      sock.onclose = () => {
        if (ws.current !== sock) return;
        ws.current = null;
        const wasIn = joined.current;
        joined.current = false;
        resetAll();
        setStatus("idle");
        setError((current) => current || (wasIn ? "closed" : "connect"));
      };
    },
    [closeSocket, resetAll],
  );

  const leave = useCallback(() => {
    closeSocket();
    resetAll();
    setStatus("idle");
    setError("");
  }, [closeSocket, resetAll]);

  useEffect(() => () => closeSocket(), [closeSocket]);

  // O‘yin sahnasi (GameScene) uchun barqaror interfeys
  const net = useMemo(
    () => ({
      me,
      onShot,
      sendState: (s) => {
        if (phaseRef.current !== "play" || me.current.hp <= 0) return;
        send({ t: "state", ...s });
      },
      sendHit: (target, w) => send({ t: "hit", target, w }),
      sendShot: (o, d, w) => send({ t: "shot", o: [o.x, o.y, o.z], d: [d.x, d.y, d.z], w }),
      getEnemies: () => {
        const list = enemiesBuf.current;
        list.length = 0;
        for (const r of remotes.current.values()) {
          if (r.team !== me.current.team && r.health > 0) list.push(r);
        }
        return list;
      },
    }),
    [send],
  );

  const team = room?.players.find((p) => p.id === room.id)?.team || "blue";

  return {
    net,
    status,
    error,
    room,
    team,
    inRoom: !!room,
    phase: room?.phase || "lobby",
    myHp,
    score,
    killLimit,
    ended,
    winner,
    remoteList,
    feed,
    connect,
    leave,
    start: () => send({ t: "start" }),
    setTeam: (t) => send({ t: "team", team: t }),
    setMap: (map) => send({ t: "map", map }),
    backToLobby: () => {
      remotes.current.clear();
      setRemoteList([]);
      setEnded(false);
      setWinner(null);
    },
  };
}
