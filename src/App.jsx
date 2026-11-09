import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import OnlineMenus from "./OnlineMenus.jsx";
import { ONLINE_TEXT, useOnline } from "./online.js";

alert("Ko'p telefo'n o'ynama");

const isTouch = typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;

const KILL_COINS = 5;
const WIN_COINS = 7;
const WEAPON_ORDER = ["stick", "sword", "bow", "crossbow"];
const WEAPON_ICONS = { stick: "🪵", sword: "⚔", bow: "🏹", crossbow: "🎯" };
const WEAPONS = {
  stick: { kind: "melee", damage: 20, cooldown: 380, reach: 3.2, price: 0 },
  sword: { kind: "melee", damage: 35, cooldown: 430, reach: 3.6, price: 60 },
  bow: { kind: "ranged", damage: 40, cooldown: 430, speed: 19, price: 100 },
  crossbow: { kind: "ranged", damage: 65, cooldown: 900, speed: 30, price: 160 },
};
const STORE_KEY = "arena-save-v1";

function loadSave() {
  try {
    const data = JSON.parse(localStorage.getItem(STORE_KEY));
    if (data && Array.isArray(data.owned)) {
      const owned = [...new Set(["stick", ...data.owned.filter((id) => WEAPONS[id])])];
      return {
        coins: Math.max(0, Number(data.coins) || 0),
        owned,
        weapon: owned.includes(data.weapon) ? data.weapon : "stick",
      };
    }
  } catch {
    // saqlangan ma'lumot yo'q yoki buzilgan
  }
  return { coins: 0, owned: ["stick"], weapon: "stick" };
}

function saveGame(state) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    // brauzer saqlashga ruxsat bermadi
  }
}

// Hamma raqiblar bitta tomondan chiqadi: shimol, qizil bayroq yonidan
const SPAWN_Z = -26;
const SPAWN_X = [0, -1, 1, -2, 2];
const STARTING_ENEMIES = Array.from({ length: 10 }, (_, index) => ({
  id: index + 1,
  position: [SPAWN_X[index % 5] * 2.6, 0, SPAWN_Z - Math.floor(index / 5) * 2.4],
  health: 100,
}));

const UI_TEXT = {
  uz: {
    title: "JANG MAYDONI",
    subtitle: "Jamoangni tuzla va jangga kir",
    play: "O‘YNASH",
    controlsMenu: "BOSHQARUV",
    settingsMenu: "PARAMETRLAR",
    settingsTitle: "JANG SOZLAMALARI",
    controlsTitle: "BOSHQARUV",
    back: "ORTGA",
    menu: "MENYU",
    language: "Til",
    map: "Xarita",
    meadow: "Yashil maydon",
    desert: "Qumli arena",
    snow: "Qorli tog‘",
    meadowDesc: "Yashil tekislik, o‘rmon va qadimiy toshlar",
    desertDesc: "Issiq qum, kaktuslar va qum rangli qal‘a",
    snowDesc: "Sovuq qor, qarag‘aylar va muz toshlar",
    chooseMap: "XARITANI TANLA",
    chooseCount: "NECHTA ODAM JANG QILADI?",
    next: "DAVOM ETISH",
    stick: "Oddiy yog‘och",
    crossbow: "Arbalet",
    shop: "MAGAZIN",
    shopHint: "Har o‘ldirgan raqib uchun +5, g‘alaba uchun +7 tanga",
    buy: "Sotib olish",
    equip: "Tanlash",
    equipped: "Tanlangan",
    melee: "Yaqin jang",
    ranged: "Uzoq jang",
    damageLabel: "Zarar",
    rateLabel: "Tezlik",
    blueTeam: "Ko‘k jamoa (sen bilan)",
    redTeam: "Qizil jamoa",
    start: "JANGNI BOSHLASH",
    resume: "O‘yinga qaytish",
    controls: "WASD — yurish · SPACE — sakrash · Sichqoncha/ekranni surish — qarash",
    bluePlayer: "KO‘K JAMOA · SEN",
    redEnemies: "QIZIL RAQIBLAR",
    enemyHealth: "RAQIB JONI",
    opponents: "Raqiblar soni",
    firstPerson: "1-shaxs",
    thirdPerson: "3-shaxs",
    sword: "Qilich",
    bow: "Kamon",
    move: "W A S D — yurish",
    jump: "SPACE — sakrash",
    look: "Sichqoncha yoki ekranni surish — qarash/aylantirish",
    attack: "Bosish — hujum/o‘q uzish",
    weaponKeys: "1–4 — qurol",
    cameraKey: "V — kamera",
    victory: "G‘ALABA!",
    defeat: "MAG‘LUBIYAT",
    lost: "Joning tugadi.",
    won: "Barcha raqiblarni yengding!",
    playAgain: "Qayta o‘ynash",
  },
  ru: {
    title: "АРЕНА БОЯ",
    subtitle: "Собери команду и вступай в бой",
    play: "ИГРАТЬ",
    controlsMenu: "УПРАВЛЕНИЕ",
    settingsMenu: "ПАРАМЕТРЫ",
    settingsTitle: "НАСТРОЙКИ БОЯ",
    controlsTitle: "УПРАВЛЕНИЕ",
    back: "НАЗАД",
    menu: "МЕНЮ",
    language: "Язык",
    map: "Карта",
    meadow: "Зелёное поле",
    desert: "Песчаная арена",
    snow: "Снежные горы",
    meadowDesc: "Зелёная равнина, лес и древние камни",
    desertDesc: "Горячий песок, кактусы и крепость",
    snowDesc: "Снег, ели и ледяные камни",
    chooseMap: "ВЫБЕРИ КАРТУ",
    chooseCount: "СКОЛЬКО БОЙЦОВ?",
    next: "ДАЛЕЕ",
    stick: "Простая палка",
    crossbow: "Арбалет",
    shop: "МАГАЗИН",
    shopHint: "+5 за каждого врага, +7 за победу",
    buy: "Купить",
    equip: "Выбрать",
    equipped: "Выбрано",
    melee: "Ближний бой",
    ranged: "Дальний бой",
    damageLabel: "Урон",
    rateLabel: "Скорость",
    blueTeam: "Синяя команда (с тобой)",
    redTeam: "Красная команда",
    start: "НАЧАТЬ БОЙ",
    resume: "Вернуться в игру",
    controls: "WASD — движение · SPACE — прыжок · Мышь/свайп по экрану — обзор",
    bluePlayer: "СИНЯЯ КОМАНДА · ТЫ",
    redEnemies: "КРАСНЫЕ ПРОТИВНИКИ",
    enemyHealth: "ЗДОРОВЬЕ ВРАГА",
    opponents: "Число противников",
    firstPerson: "1-е лицо",
    thirdPerson: "3-е лицо",
    sword: "Меч",
    bow: "Лук",
    move: "W A S D — движение",
    jump: "SPACE — прыжок",
    look: "Мышь или свайп по экрану — обзор/поворот",
    attack: "Клик — атака/выстрел",
    weaponKeys: "1–4 — оружие",
    cameraKey: "V — камера",
    victory: "ПОБЕДА!",
    defeat: "ПОРАЖЕНИЕ",
    lost: "У тебя закончились жизни.",
    won: "Ты победил всех противников!",
    playAgain: "Играть снова",
  },
  en: {
    title: "BATTLE ARENA",
    subtitle: "Build your team and enter the fight",
    play: "PLAY",
    controlsMenu: "CONTROLS",
    settingsMenu: "SETTINGS",
    settingsTitle: "BATTLE SETTINGS",
    controlsTitle: "CONTROLS",
    back: "BACK",
    menu: "MENU",
    language: "Language",
    map: "Map",
    meadow: "Green field",
    desert: "Desert arena",
    snow: "Snowy peaks",
    meadowDesc: "Green plains, forest and ancient stones",
    desertDesc: "Hot sand, cacti and a sandstone fortress",
    snowDesc: "Cold snow, pines and ice rocks",
    chooseMap: "CHOOSE A MAP",
    chooseCount: "HOW MANY FIGHTERS?",
    next: "CONTINUE",
    stick: "Wooden stick",
    crossbow: "Crossbow",
    shop: "SHOP",
    shopHint: "+5 per kill, +7 for a win",
    buy: "Buy",
    equip: "Equip",
    equipped: "Equipped",
    melee: "Melee",
    ranged: "Ranged",
    damageLabel: "Damage",
    rateLabel: "Rate",
    blueTeam: "Blue team (including you)",
    redTeam: "Red team",
    start: "START BATTLE",
    resume: "Resume game",
    controls: "WASD — move · SPACE — jump · Mouse/swipe — look",
    bluePlayer: "BLUE TEAM · YOU",
    redEnemies: "RED OPPONENTS",
    enemyHealth: "ENEMY HEALTH",
    opponents: "Opponents",
    firstPerson: "First person",
    thirdPerson: "Third person",
    sword: "Sword",
    bow: "Bow",
    move: "W A S D — move",
    jump: "SPACE — jump",
    look: "Mouse or swipe — look/rotate",
    attack: "Click — attack/shoot",
    weaponKeys: "1–4 — weapon",
    cameraKey: "V — camera",
    victory: "VICTORY!",
    defeat: "DEFEAT",
    lost: "You ran out of health.",
    won: "You defeated all opponents!",
    playAgain: "Play again",
  },
};

const PLATFORM = { x: 0, z: -10, r: 5.2, h: 0.15 };

function terrainHeight(x, z) {
  const base = Math.sin(x * 0.12 + z * 0.04) * 0.36 +
    Math.cos(z * 0.14 - x * 0.05) * 0.24 +
    Math.sin(x * 0.29 + z * 0.23) * 0.075;
  const d = Math.hypot(x - PLATFORM.x, z - PLATFORM.z);
  return THREE.MathUtils.lerp(PLATFORM.h, base, THREE.MathUtils.smoothstep(d, PLATFORM.r, PLATFORM.r + 2.2));
}

const TERRAIN_COLORS = {
  meadow: ["#5f7d38", "#8aa14f", "#7d6a47", "#47602d"],
  desert: ["#c4a874", "#d6bf8c", "#a58a5a", "#a8915f"],
  snow: ["#e4ecf3", "#f8fbff", "#aab8c3", "#c4d2de"],
};
const SKY = {
  meadow: { bg: "#b9d0e2", fog: "#b9d0e2", top: "#3d74c0", sun: "#ffe2a8", light: "#fff0d6", hemiSky: "#a8c6ec", hemiGround: "#556040", density: 0.01, cloud: "#ffffff", sunI: 3.0 },
  desert: { bg: "#e6d3b0", fog: "#e6d3b0", top: "#4f86c6", sun: "#ffd9a0", light: "#ffe4b8", hemiSky: "#cfd9e8", hemiGround: "#8a7048", density: 0.013, cloud: "#fff8ec", sunI: 3.2 },
  snow: { bg: "#d9e4ee", fog: "#d9e4ee", top: "#7f9fbf", sun: "#f2f4f8", light: "#e9eff7", hemiSky: "#c9d8e8", hemiGround: "#8a96a2", density: 0.015, cloud: "#e9eef3", sunI: 2.0 },
};
const SUN_POS = [-26, 22, -22];
const SUN_DIR = new THREE.Vector3(...SUN_POS).normalize();
const worldCache = {};
let activeObstacles = [];
const dummy = new THREE.Object3D();

function M(x, y, z, sx, sy, sz, ry = 0) {
  dummy.position.set(x, y, z);
  dummy.scale.set(sx, sy, sz);
  dummy.rotation.set(0, ry, 0);
  dummy.updateMatrix();
  return dummy.matrix.clone();
}

function seeded(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// To'siqlardan (daraxt, tosh, ustun) o'tib ketmaslik uchun
function pushOut(pos, radius) {
  for (const o of activeObstacles) {
    const dx = pos.x - o.x;
    const dz = pos.z - o.z;
    const min = o.r + radius;
    const d2 = dx * dx + dz * dz;
    if (d2 < min * min && d2 > 1e-6) {
      const d = Math.sqrt(d2);
      pos.x = o.x + (dx / d) * min;
      pos.z = o.z + (dz / d) * min;
    }
  }
}

function getWorld(mapId) {
  if (worldCache[mapId]) return worldCache[mapId];
  const desert = mapId === "desert";
  const snow = mapId === "snow";
  const rand = seeded({ desert: 77, snow: 4321 }[mapId] || 1234);
  const obstacles = [];
  const w = { trunk: [], leaf1: [], leaf2: [], leafColors: [], rocks: [], tufts: [], flowers: [], flowerColors: [], stones: [], obstacles };
  const leafPalette = (snow ? ["#27503a", "#e6eef4", "#2f6048"] : ["#3d6b2c", "#34602a", "#4f7d35"]).map((c) => new THREE.Color(c));
  const flowerPalette = ["#c0505c", "#d9bd5c", "#e8e8df"].map((c) => new THREE.Color(c));
  const free = (x, z, gap) => obstacles.every((o) => Math.hypot(o.x - x, o.z - z) > o.r + gap);

  const addTree = (x, z, s, solid) => {
    const y = terrainHeight(x, z);
    if (desert) {
      w.trunk.push(M(x, y + 1.3 * s, z, s, s, s));
      w.leaf1.push(M(x + 0.5 * s, y + 1.8 * s, z, s, s, s));
      w.leaf2.push(M(x - 0.5 * s, y + 1.4 * s, z, s, s, s));
    } else {
      w.trunk.push(M(x, y + s, z, s, s, s));
      if (snow) {
        w.leaf1.push(M(x, y + 2.6 * s, z, s, s, s));
        w.leaf2.push(M(x, y + 3.9 * s, z, s * 0.8, s * 0.8, s * 0.8));
      } else {
        w.leaf1.push(M(x + (rand() - 0.5) * 0.3 * s, y + 3.0 * s, z, 1.15 * s, 0.9 * s, 1.15 * s, rand() * 6));
        w.leaf2.push(M(x + (rand() - 0.5) * 0.4 * s, y + 4.2 * s, z + (rand() - 0.5) * 0.4 * s, 0.8 * s, 0.7 * s, 0.8 * s, rand() * 6));
      }
      w.leafColors.push(leafPalette[Math.floor(rand() * 3)]);
    }
    if (solid) obstacles.push({ x, z, r: 0.55 * s });
  };

  // markazdagi duel doirasi: 6 ta tik tosh
  [0, 45, 135, 180, 225, 315].forEach((deg) => {
    const x = Math.cos((deg * Math.PI) / 180) * 6.5;
    const z = -10 + Math.sin((deg * Math.PI) / 180) * 6.5;
    w.stones.push({ x, z });
    obstacles.push({ x, z, r: 0.7 });
  });

  let tries = 0;
  let placed = 0;
  while (placed < 16 && tries++ < 500) {
    const x = (rand() - 0.5) * 68;
    const z = -22 + rand() * 31;
    if (Math.abs(x) < 6 || !free(x, z, 3)) continue;
    addTree(x, z, 0.9 + rand() * 0.6, true);
    placed += 1;
  }
  tries = 0;
  placed = 0;
  while (placed < 10 && tries++ < 500) {
    const x = (rand() - 0.5) * 68;
    const z = -22 + rand() * 31;
    if (Math.abs(x) < 5 || !free(x, z, 2)) continue;
    const s = 0.8 + rand() * 1.1;
    w.rocks.push(M(x, terrainHeight(x, z) + 0.35 * s, z, s * 1.2, s * 0.8, s, rand() * 3));
    obstacles.push({ x, z, r: 0.9 * s });
    placed += 1;
  }

  // chekka bo'ylab daraxt devori
  const border = isTouch ? 70 : 110;
  for (let i = 0; i < border; i += 1) {
    const angle = rand() * Math.PI * 2;
    const k = 1 / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
    const r = (40 + rand() * 8) * k;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    if (z < -38 && Math.abs(x) < 22) continue;
    addTree(x, z, 1.1 + rand() * 0.9, false);
  }

  const tuftCount = isTouch ? 160 : 320;
  for (let i = 0; i < tuftCount; i += 1) {
    const x = (rand() - 0.5) * 74;
    const z = (rand() - 0.5) * 74;
    if (Math.abs(x) < 3) continue;
    w.tufts.push(M(x, terrainHeight(x, z) + 0.2, z, 0.5 + rand() * 0.5, 0.5 + rand() * 0.8, 0.5 + rand() * 0.5, rand() * 3));
  }
  if (mapId === "meadow") {
    for (let i = 0; i < 140; i += 1) {
      const x = (rand() - 0.5) * 74;
      const z = (rand() - 0.5) * 74;
      if (Math.abs(x) < 3) continue;
      w.flowers.push(M(x, terrainHeight(x, z) + 0.28, z, 1, 1, 1));
      w.flowerColors.push(flowerPalette[Math.floor(rand() * 3)]);
    }
  }
  worldCache[mapId] = w;
  return w;
}

function Instances({ matrices, colors, children }) {
  const ref = useRef();
  useLayoutEffect(() => {
    matrices.forEach((m, i) => ref.current.setMatrixAt(i, m));
    if (colors && colors.length) colors.forEach((c, i) => ref.current.setColorAt(i, c));
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [matrices, colors]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, matrices.length]} castShadow receiveShadow frustumCulled={false}>
      {children}
    </instancedMesh>
  );
}

function Brazier({ x, z }) {
  const y = terrainHeight(x, z);
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 1.1, 6]} />
        <meshStandardMaterial color="#3b3430" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.3, 0.18, 0.22, 8]} />
        <meshStandardMaterial color="#4a403a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.45, 0]}>
        <coneGeometry args={[0.2, 0.5, 7]} />
        <meshBasicMaterial color="#ff9a2e" toneMapped={false} />
      </mesh>
    </group>
  );
}

function World({ mapId }) {
  const w = getWorld(mapId);
  const desert = mapId === "desert";
  const snow = mapId === "snow";
  const stone = desert ? "#cdb98c" : snow ? "#a9b8c4" : "#8d8b85";
  const green = "#5f9448";
  return (
    <group>
      <Instances matrices={w.trunk}>
        {desert ? <cylinderGeometry args={[0.3, 0.34, 2.6, 8]} /> : <cylinderGeometry args={[0.18, 0.26, 2, 6]} />}
        <meshStandardMaterial color={desert ? green : "#4f3a28"} roughness={0.9} />
      </Instances>
      <Instances matrices={w.leaf1} colors={w.leafColors}>
        {desert ? <cylinderGeometry args={[0.14, 0.14, 1, 6]} /> : snow ? <coneGeometry args={[1.35, 2.4, 7]} /> : <icosahedronGeometry args={[1.45, 1]} />}
        <meshStandardMaterial color={desert ? green : "#ffffff"} roughness={0.9} />
      </Instances>
      <Instances matrices={w.leaf2} colors={w.leafColors}>
        {desert ? <cylinderGeometry args={[0.14, 0.14, 0.8, 6]} /> : snow ? <coneGeometry args={[1.05, 2, 7]} /> : <icosahedronGeometry args={[1.2, 1]} />}
        <meshStandardMaterial color={desert ? green : "#ffffff"} roughness={0.9} />
      </Instances>
      <Instances matrices={w.rocks}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={desert ? "#b79d6e" : snow ? "#9fb0bd" : "#7a7872"} roughness={1} flatShading />
      </Instances>
      <Instances matrices={w.tufts}>
        <coneGeometry args={[0.14, 0.7, 4]} />
        <meshStandardMaterial color={desert ? "#a58a4f" : snow ? "#dbe8f2" : "#5b7d33"} roughness={1} />
      </Instances>
      {w.flowers.length > 0 && (
        <Instances matrices={w.flowers} colors={w.flowerColors}>
          <sphereGeometry args={[0.09, 6, 4]} />
          <meshStandardMaterial color="#ffffff" roughness={0.8} />
        </Instances>
      )}

      <mesh position={[PLATFORM.x, PLATFORM.h + 0.03, PLATFORM.z]} receiveShadow>
        <cylinderGeometry args={[PLATFORM.r, PLATFORM.r + 0.1, 0.08, 28]} />
        <meshStandardMaterial color={stone} roughness={1} />
      </mesh>
      {w.stones.map((s, i) => (
        <mesh key={i} position={[s.x, terrainHeight(s.x, s.z) + 1.4, s.z]} rotation={[0, i, 0.04 * (i % 3)]} castShadow>
          <boxGeometry args={[1.1, 3.2, 0.9]} />
          <meshStandardMaterial color={stone} roughness={1} />
        </mesh>
      ))}

      {[-3, 3].flatMap((x) => [[x, -30], [x, 9]]).map(([x, z]) => (
        <Brazier key={`${x}${z}`} x={x} z={z} />
      ))}

      {/* Qizil qal'a (raqiblar bazasi) */}
      {[-10.5, 10.5].map((x) => (
        <mesh key={x} position={[x, 2.5, -46]} castShadow>
          <boxGeometry args={[13, 7, 3]} />
          <meshStandardMaterial color={stone} roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 2, -48.4]}>
        <boxGeometry args={[7.4, 6, 0.3]} />
        <meshStandardMaterial color="#1a1410" roughness={1} />
      </mesh>
      {[-18, -4.6, 4.6, 18].map((x, i) => {
        const big = i === 0 || i === 3;
        return (
          <group key={x} position={[x, 0, -46]}>
            <mesh position={[0, big ? 4.5 : 3.5, 0]} castShadow>
              <cylinderGeometry args={big ? [2.5, 2.7, 11, 10] : [1.8, 2, 9, 10]} />
              <meshStandardMaterial color={stone} roughness={1} />
            </mesh>
            <mesh position={[0, big ? 11.8 : 9.8, 0]} castShadow>
              <coneGeometry args={big ? [3.2, 3.8, 10] : [2.4, 3.2, 10]} />
              <meshStandardMaterial color="#b3263a" roughness={0.8} />
            </mesh>
          </group>
        );
      })}
      {[-9, 9].map((x) => (
        <mesh key={x} position={[x, 4.5, -44.4]}>
          <planeGeometry args={[1.8, 3.2]} />
          <meshStandardMaterial color="#c9283f" roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Ko'k lager (sizning bazangiz) */}
      {[[-9, 16, "#3f6fd0"], [9.5, 17, "#d9d2c0"]].map(([x, z, color]) => (
        <mesh key={x} position={[x, terrainHeight(x, z) + 1.3, z]} castShadow>
          <coneGeometry args={[2.3, 2.8, 6]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Terrain({ mapId }) {
  const desert = mapId === "desert";
  const geometry = useMemo(() => {
    const terrain = new THREE.PlaneGeometry(120, 120, isTouch ? 70 : 120, isTouch ? 70 : 120);
    const positions = terrain.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    const colorsSet = TERRAIN_COLORS[mapId] || TERRAIN_COLORS.meadow;
    const [lo, hi, dirt, edge] = colorsSet.map((hex) => new THREE.Color(hex));
    const c = new THREE.Color();
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const z = -positions.getY(index);
      positions.setZ(index, terrainHeight(x, z));
      const n = (Math.sin(x * 0.31) + Math.cos(z * 0.27) + Math.sin((x + z) * 0.17)) / 6 + 0.5;
      c.copy(lo).lerp(hi, THREE.MathUtils.clamp(n, 0, 1));
      const pathD = Math.abs(x - Math.sin(z * 0.08) * 2);
      const onPath = z > -36 && z < 14 ? THREE.MathUtils.smoothstep(3.4 - pathD, 0, 1.6) : 0;
      c.lerp(dirt, onPath * 0.85);
      c.lerp(edge, THREE.MathUtils.smoothstep(Math.max(Math.abs(x), Math.abs(z)), 34, 50));
      c.multiplyScalar(0.92 + 0.14 * (Math.abs(Math.sin(index * 12.9898) * 43758.5453) % 1));
      colors.set([c.r, c.g, c.b], index * 3);
    }
    terrain.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    positions.needsUpdate = true;
    terrain.computeVertexNormals();
    return terrain;
  }, [mapId]);

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial vertexColors roughness={1} />
    </mesh>
  );
}

function SpawnFlag({ x, z, color }) {
  const y = terrainHeight(x, z);
  const geometry = useMemo(() => new THREE.PlaneGeometry(1.7, 1.05, 14, 1), []);

  useFrame((state) => {
    const pos = geometry.attributes.position;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < pos.count; i += 1) {
      const u = (pos.getX(i) + 0.85) / 1.7;
      pos.setZ(i, Math.sin(u * 5 - t * 4) * 0.16 * u);
    }
    pos.needsUpdate = true;
  });

  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[1.1, 1.5, 0.5, 8]} />
        <meshStandardMaterial color="#7b7468" roughness={1} />
      </mesh>
      <mesh position={[0, 3.2, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 5.8, 8]} />
        <meshStandardMaterial color="#5a3d26" roughness={0.8} />
      </mesh>
      <mesh position={[0, 6.2, 0]}>
        <sphereGeometry args={[0.14, 10, 8]} />
        <meshStandardMaterial color="#d8a73f" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh geometry={geometry} position={[0.93, 5.35, 0]} castShadow>
        <meshStandardMaterial color={color} roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function SkyDome({ mapId }) {
  const sky = SKY[mapId] || SKY.meadow;
  const geometry = useMemo(() => {
    const g = new THREE.SphereGeometry(250, 48, 32);
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const top = new THREE.Color(sky.top);
    const horizon = new THREE.Color(sky.fog);
    const sun = new THREE.Color(sky.sun);
    const c = new THREE.Color();
    const d = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 1) {
      d.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
      c.copy(horizon).lerp(top, Math.pow(Math.max(d.y, 0), 0.5));
      const s = Math.max(d.dot(SUN_DIR), 0);
      const glow = Math.pow(s, 8) * 0.2 + Math.pow(s, 60) * 0.25;
      c.r += sun.r * glow;
      c.g += sun.g * glow;
      c.b += sun.b * glow;
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, [sky]);
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function SunGlow({ mapId }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(255,252,240,1)");
    g.addColorStop(0.07, "rgba(255,248,225,1)");
    g.addColorStop(0.16, "rgba(255,232,180,0.55)");
    g.addColorStop(0.4, "rgba(255,214,150,0.14)");
    g.addColorStop(1, "rgba(255,200,120,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <sprite position={SUN_DIR.clone().multiplyScalar(230).toArray()} scale={[110, 110, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} fog={false} toneMapped={false} blending={THREE.AdditiveBlending} opacity={mapId === "snow" ? 0.35 : 1} />
    </sprite>
  );
}

function Clouds({ mapId }) {
  const group = useRef();
  const sky = SKY[mapId] || SKY.meadow;
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    const rand = seeded(99);
    for (let i = 0; i < 46; i += 1) {
      const x = 90 + rand() * 332;
      const y = 100 + (rand() - 0.5) * 70;
      const r = 30 + rand() * 46;
      const shade = y > 120 ? 222 : 255;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${shade},${shade},${shade + 4},0.5)`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const items = useMemo(() => {
    const rand = seeded(5);
    return Array.from({ length: 14 }, () => {
      const angle = rand() * Math.PI * 2;
      const dist = 130 + rand() * 90;
      return { x: Math.cos(angle) * dist, z: Math.sin(angle) * dist, y: 55 + rand() * 60, w: 90 + rand() * 110, flip: rand() > 0.5 };
    });
  }, []);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.004;
  });
  return (
    <group ref={group}>
      {items.map((it, i) => (
        <sprite key={i} position={[it.x, it.y, it.z]} scale={[it.flip ? -it.w : it.w, it.w * 0.45, 1]}>
          <spriteMaterial map={texture} transparent depthWrite={false} fog={false} color={sky.cloud} opacity={mapId === "snow" ? 0.95 : 0.85} />
        </sprite>
      ))}
    </group>
  );
}

function MountainRing({ mapId }) {
  const geometry = useMemo(() => {
    const tint = {
      meadow: ["#3f5632", "#6a675f", "#eef2f6"],
      desert: ["#a98a5a", "#9c7650", "#c9a06c"],
      snow: ["#8c9aa6", "#7b8794", "#f4f8fc"],
    }[mapId] || ["#3f5632", "#6a675f", "#eef2f6"];
    const [low, mid, high] = tint.map((hex) => new THREE.Color(hex));
    const N = 180;
    const R = 6;
    const pos = [];
    const col = [];
    const idx = [];
    const c = new THREE.Color();
    for (let i = 0; i <= N; i += 1) {
      const th = (i / N) * Math.PI * 2;
      const ridge = 0.5 + 0.5 * (Math.sin(th * 3 + 1) * 0.5 + Math.sin(th * 7 + 2) * 0.3 + Math.sin(th * 13) * 0.2);
      for (let j = 0; j <= R; j += 1) {
        const t = j / R;
        const n = Math.sin(th * 17 + j * 2.1) * Math.cos(th * 11 - j * 1.3);
        const H = 16 + ridge * 30 + n * 2;
        const rad = 108 - Math.pow(t, 0.8) * 16 + Math.sin(th * 23 + j * 1.7) * 1.5;
        const y = -4 + t * (H + 4) + (j > 0 && j < R ? n * 0.8 : 0);
        pos.push(Math.cos(th) * rad, y, Math.sin(th) * rad);
        const k = t + n * 0.06;
        c.copy(low).lerp(mid, THREE.MathUtils.smoothstep(k, 0.25, 0.5)).lerp(high, THREE.MathUtils.smoothstep(k, 0.68, 0.85));
        col.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < N; i += 1) {
      for (let j = 0; j < R; j += 1) {
        const a0 = i * (R + 1) + j;
        const b0 = (i + 1) * (R + 1) + j;
        idx.push(a0, b0, a0 + 1, b0, b0 + 1, a0 + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [mapId]);
  const edge = (TERRAIN_COLORS[mapId] || TERRAIN_COLORS.meadow)[3];
  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial vertexColors roughness={1} flatShading side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, 0]} receiveShadow>
        <circleGeometry args={[130, 40]} />
        <meshStandardMaterial color={edge} roughness={1} />
      </mesh>
    </group>
  );
}

const TEAM = {
  ally: { plume: "#3aa0ff", cape: "#1d5d99", trail: "#a9d8ff", accent: "#7cc4ff" },
  enemy: { plume: "#ff4b4b", cape: "#8f2430", trail: "#ffb9a8", accent: "#e8b060" },
};

const SKIN = ["#c89570", "#a8764f", "#e0b48c", "#8a5a3b"];
const HAIR = ["#2b1d14", "#5a3a22", "#8a6a3a", "#1c1c1c"];

function makeLabel(text, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.font = "bold 44px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 8;
  ctx.strokeStyle = "#1a0a0a";
  ctx.strokeText(text, 64, 34);
  ctx.fillStyle = color;
  ctx.fillText(text, 64, 34);
  return new THREE.CanvasTexture(canvas);
}

function HitEffect({ effect, onDone }) {
  const label = useRef();
  const sparkRefs = useRef([]);
  const age = useRef(0);
  const texture = useMemo(() => makeLabel(effect.label || `-${effect.damage}`, effect.coin || effect.damage >= 30 ? "#ffd04a" : "#ffffff"), [effect]);
  const sparks = useMemo(() => Array.from({ length: 8 }, () => new THREE.Vector3(
    (Math.random() - 0.5) * 5, Math.random() * 4 + 1, (Math.random() - 0.5) * 5,
  )), []);

  useFrame((_, delta) => {
    age.current += delta;
    const t = age.current;
    sparkRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      mesh.position.set(sparks[i].x * t, sparks[i].y * t - 6 * t * t, sparks[i].z * t);
      mesh.scale.setScalar(Math.max(0.001, 1 - t / 0.45));
    });
    if (label.current) {
      label.current.position.y = 0.3 + t * 1.4;
      label.current.material.opacity = Math.max(0, Math.min(1, (0.8 - t) * 3));
    }
    if (t > 0.8) onDone(effect.id);
  });

  return (
    <group position={effect.position}>
      {sparks.map((_, i) => (
        <mesh key={i} ref={(mesh) => { sparkRefs.current[i] = mesh; }}>
          <octahedronGeometry args={[0.07, 0]} />
          <meshBasicMaterial color={i % 2 ? "#ffd04a" : "#fff6c8"} toneMapped={false} />
        </mesh>
      ))}
      <sprite ref={label} scale={[1.3, 0.65, 1]} position={[0, 0.3, 0]}>
        <spriteMaterial map={texture} transparent depthTest={false} toneMapped={false} />
      </sprite>
    </group>
  );
}

const ease = (x) => x * x * (3 - 2 * x);

// t: 0..1 zarba vaqti. Ko'tarilish -> tez chopish -> qaytish.
function swingPose(t, wind, strike) {
  if (t <= 0 || t >= 1) return { arm: -0.35, power: 0, active: false };
  if (t < wind) return { arm: THREE.MathUtils.lerp(-0.35, -2.3, ease(t / wind)), power: 0, active: true };
  if (t < strike) {
    const k = (t - wind) / (strike - wind);
    return { arm: THREE.MathUtils.lerp(-2.3, 0.15, 1 - (1 - k) ** 3), power: Math.sin(k * Math.PI), active: true };
  }
  return { arm: THREE.MathUtils.lerp(0.15, -0.35, ease((t - strike) / (1 - strike))), power: 0, active: true };
}

function SwordModel({ scale = 1, accent = "#d8b15a" }) {
  return (
    <group scale={scale}>
      <mesh position={[0, -0.12, 0]} castShadow>
        <cylinderGeometry args={[0.032, 0.036, 0.24, 8]} />
        <meshStandardMaterial color="#4a2f1d" roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.26, 0]}>
        <sphereGeometry args={[0.055, 10, 8]} />
        <meshStandardMaterial color={accent} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.02, 0]} castShadow>
        <boxGeometry args={[0.34, 0.05, 0.08]} />
        <meshStandardMaterial color={accent} metalness={0.75} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.58, 0]} castShadow>
        <boxGeometry args={[0.095, 1.1, 0.02]} />
        <meshStandardMaterial color="#eef4f2" metalness={0.95} roughness={0.14} />
      </mesh>
      <mesh position={[0, 1.23, 0]} scale={[1, 1, 0.22]}>
        <coneGeometry args={[0.0475, 0.2, 4]} />
        <meshStandardMaterial color="#eef4f2" metalness={0.95} roughness={0.14} />
      </mesh>
      <mesh position={[0, 0.55, 0.012]}>
        <boxGeometry args={[0.025, 0.9, 0.012]} />
        <meshStandardMaterial color="#9aa9ad" metalness={0.9} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Fighter({ enemy, targetRef, ally = false, enemiesRef, onDamageEnemy, remote = false, pausedRef }) {
  const fighter = useRef();
  const leftArm = useRef();
  const rightArm = useRef();
  const leftElbow = useRef();
  const rightElbow = useRef();
  const leftLeg = useRef();
  const rightLeg = useRef();
  const cape = useRef();
  const trail = useRef();
  const spark = useRef();
  const hitTimer = useRef(0);
  const swingT = useRef(1);
  const pending = useRef(null);
  const lastHealth = useRef(enemy.health);
  const lastAttack = useRef(enemy.attack);
  const flash = useRef(0);
  const knock = useRef({ x: 0, z: 0 });
  const deathT = useRef(0);
  const [gone, setGone] = useState(false);
  const team = ally ? TEAM.ally : TEAM.enemy;
  const skin = SKIN[enemy.id % 4];
  const hair = HAIR[(enemy.id + (ally ? 2 : 0)) % 4];
  const bearded = (enemy.id + (ally ? 1 : 0)) % 2 === 0;

  useFrame((state, delta) => {
    const body = fighter.current;
    if (!body || gone) return;
    body.rotation.order = "YXZ";
    // Menyu ochiq bo'lsa AI jangi to'xtab turadi
    if (!remote && pausedRef?.current) return;

    if (enemy.health > lastHealth.current) lastHealth.current = enemy.health;
    if (enemy.health < lastHealth.current) {
      lastHealth.current = enemy.health;
      flash.current = 1;
      swingT.current = 1;
      pending.current = null;
      const from = targetRef.current;
      const ox = body.position.x - from.x;
      const oz = body.position.z - from.z;
      const len = Math.max(Math.hypot(ox, oz), 0.001);
      knock.current = { x: (ox / len) * 4, z: (oz / len) * 4 };
    }

    if (enemy.health <= 0) {
      deathT.current += delta;
      body.rotation.x = -Math.min(deathT.current / 0.5, 1) * 1.5;
      body.position.y = terrainHeight(body.position.x, body.position.z) - Math.max(0, deathT.current - 1.2) * 0.7;
      if (trail.current) trail.current.material.opacity = 0;
      if (spark.current) spark.current.visible = false;
      if (deathT.current > 2.2 && !remote) setGone(true);
      return;
    }

    if (remote) {
      // Onlayn o'yinchi: AI yo'q, serverdan kelgan holatni silliq ko'rsatamiz
      deathT.current = 0;
      const t = enemy.target;
      const a = enemy.actor.current;
      const k = 1 - Math.exp(-delta * 14);
      const px = a.x;
      const pz = a.z;
      a.x += (t.x - a.x) * k;
      a.z += (t.z - a.z) * k;
      let dyaw = t.yaw - a.yaw;
      dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
      a.yaw += dyaw * k;
      a.jumpY += (t.jy - a.jumpY) * k;
      const ground = terrainHeight(a.x, a.z);
      body.position.set(a.x, ground + a.jumpY, a.z);
      body.rotation.y = a.yaw + Math.PI;
      enemy.position.set(a.x, ground, a.z);

      if (enemy.attack !== lastAttack.current) {
        lastAttack.current = enemy.attack;
        swingT.current = 0;
      }
      const swinging = swingT.current < 1;
      if (swinging) swingT.current = Math.min(1, swingT.current + delta / 0.62);
      const moved = Math.hypot(a.x - px, a.z - pz) / Math.max(delta, 0.001) > 0.8;
      const stride = moved && !swinging ? Math.sin(state.clock.elapsedTime * 9 + enemy.id) * 0.55 : 0;
      const pose = swingPose(swingT.current, 0.36, 0.52);
      flash.current = Math.max(0, flash.current - delta * 3);
      body.rotation.x = pose.power * 0.2 - flash.current * 0.35;
      leftLeg.current.rotation.x = stride;
      rightLeg.current.rotation.x = -stride;
      leftArm.current.rotation.x = -0.75 + stride * 0.12 - (swinging ? 0.15 : 0);
      leftElbow.current.rotation.x = -0.6;
      rightArm.current.rotation.x = swinging ? pose.arm : -0.4 + stride * 0.35;
      rightArm.current.rotation.z = -0.06;
      rightElbow.current.rotation.x = -0.25;
      if (cape.current) cape.current.rotation.x = 0.1 + Math.abs(stride) * 0.5 + pose.power * 0.4;
      if (trail.current) trail.current.material.opacity = pose.power * 0.85;
      if (spark.current) {
        spark.current.visible = flash.current > 0.15;
        spark.current.scale.setScalar(0.5 + (1 - flash.current) * 1.4);
      }
      return;
    }

    let target = targetRef.current;
    let opponent = null;
    if (ally) {
      let closestDistance = Infinity;
      for (const candidate of enemiesRef.current) {
        if (candidate.health <= 0) continue;
        const distance = Math.hypot(
          candidate.position.x - body.position.x,
          candidate.position.z - body.position.z,
        );
        if (distance < closestDistance) {
          target = candidate.position;
          opponent = candidate;
          closestDistance = distance;
        }
      }
      if (!opponent) return;
    }

    const dx = target.x - body.position.x;
    const dz = target.z - body.position.z;
    const distance = Math.max(Math.hypot(dx, dz), 0.001);
    const reach = 2.2;
    const attacking = swingT.current < 1;

    hitTimer.current = Math.max(0, hitTimer.current - delta);
    if (attacking) {
      swingT.current = Math.min(1, swingT.current + delta / 0.62);
      if (pending.current && swingT.current >= 0.45) {
        const strike = pending.current;
        pending.current = null;
        if (distance <= reach + 0.6) {
          if (ally) onDamageEnemy(strike.opponent, 10);
          else enemy.onAttack(9);
        }
      }
    } else if (distance <= reach && hitTimer.current === 0) {
      swingT.current = 0;
      pending.current = { opponent };
      hitTimer.current = 1.1 + (enemy.id % 3) * 0.15;
    }

    const stepSpeed = attacking
      ? (swingT.current > 0.3 && swingT.current < 0.5 && distance > 1 ? 1.6 : 0)
      : (distance > reach ? (ally ? 2.7 : 2.2) : 0);
    body.position.x += (dx / distance) * stepSpeed * delta + knock.current.x * delta;
    body.position.z += (dz / distance) * stepSpeed * delta + knock.current.z * delta;
    knock.current.x *= 0.9;
    knock.current.z *= 0.9;

    pushOut(body.position, 0.5);
    body.rotation.y = Math.atan2(dx, dz);
    body.position.y = terrainHeight(body.position.x, body.position.z);
    enemy.position.copy(body.position);

    const walking = !attacking && stepSpeed > 0;
    const stride = walking ? Math.sin(state.clock.elapsedTime * 9 + enemy.id) * 0.55 : 0;
    const pose = swingPose(swingT.current, 0.36, 0.52);
    flash.current = Math.max(0, flash.current - delta * 3);
    body.rotation.x = pose.power * 0.2 - flash.current * 0.35;
    leftLeg.current.rotation.x = stride;
    rightLeg.current.rotation.x = -stride;
    leftArm.current.rotation.x = -0.75 + stride * 0.12 - (attacking ? 0.15 : 0);
    leftElbow.current.rotation.x = -0.6;
    rightArm.current.rotation.x = attacking ? pose.arm : -0.4 + stride * 0.35;
    rightArm.current.rotation.z = -0.06;
    rightElbow.current.rotation.x = -0.25;
    if (cape.current) cape.current.rotation.x = 0.1 + Math.abs(stride) * 0.5 + pose.power * 0.4;
    if (trail.current) trail.current.material.opacity = pose.power * 0.85;
    if (spark.current) {
      spark.current.visible = flash.current > 0.15;
      spark.current.scale.setScalar(0.5 + (1 - flash.current) * 1.4);
    }
  });

  if (gone) return null;

  return (
    <group ref={fighter} position={enemy.position}>
      <mesh position={[0, 0.82, 0]} castShadow>
        <boxGeometry args={[0.58, 0.72, 0.43]} />
        <meshStandardMaterial color={ally ? "#245985" : "#aa3338"} roughness={0.8} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0.88, 0.275]} castShadow>
        <boxGeometry args={[0.49, 0.39, 0.075]} />
        <meshStandardMaterial color="#c0c6c3" metalness={0.45} roughness={0.46} />
      </mesh>
      <mesh position={[0, 0.88, 0.321]}>
        <boxGeometry args={[0.42, 0.035, 0.018]} />
        <meshStandardMaterial color="#c79854" metalness={0.55} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.64, 0.32]} castShadow>
        <boxGeometry args={[0.2, 0.24, 0.045]} />
        <meshStandardMaterial color={ally ? "#174a78" : "#832a30"} roughness={0.76} />
      </mesh>
      <mesh position={[0, 0.91, 0.324]}>
        <circleGeometry args={[0.11, 6]} />
        <meshStandardMaterial color={ally ? "#2a77ae" : "#a82f36"} metalness={0.4} roughness={0.44} />
      </mesh>
      <mesh position={[0, 0.91, 0.341]}>
        <boxGeometry args={[0.025, 0.14, 0.012]} />
        <meshStandardMaterial color="#ead29d" metalness={0.52} roughness={0.36} />
      </mesh>
      <mesh position={[0, 0.47, 0.018]} castShadow>
        <boxGeometry args={[0.62, 0.105, 0.47]} />
        <meshStandardMaterial color="#3b3030" roughness={0.76} />
      </mesh>
      <mesh position={[0, 0.47, 0.26]}>
        <boxGeometry args={[0.15, 0.105, 0.035]} />
        <meshStandardMaterial color="#c79854" metalness={0.58} roughness={0.37} />
      </mesh>
      <mesh position={[-0.24, 0.3, 0.12]} castShadow>
        <boxGeometry args={[0.13, 0.19, 0.19]} />
        <meshStandardMaterial color={ally ? "#174a78" : "#762c31"} roughness={0.82} />
      </mesh>
      <mesh position={[-0.31, 1.17, 0]} rotation={[0, 0, -0.12]} castShadow>
        <boxGeometry args={[0.32, 0.23, 0.42]} />
        <meshStandardMaterial color="#969e9d" metalness={0.54} roughness={0.43} />
      </mesh>
      <mesh position={[0.31, 1.17, 0]} rotation={[0, 0, 0.12]} castShadow>
        <boxGeometry args={[0.32, 0.23, 0.42]} />
        <meshStandardMaterial color="#969e9d" metalness={0.54} roughness={0.43} />
      </mesh>
      <mesh position={[0, 1.57, 0]} castShadow>
        <boxGeometry args={[0.47, 0.48, 0.43]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
      <mesh position={[-0.1, 1.64, 0.221]}>
        <boxGeometry args={[0.075, 0.07, 0.028]} />
        <meshStandardMaterial color="#f4eee3" roughness={0.42} />
      </mesh>
      <mesh position={[0.1, 1.64, 0.221]}>
        <boxGeometry args={[0.075, 0.07, 0.028]} />
        <meshStandardMaterial color="#f4eee3" roughness={0.42} />
      </mesh>
      <mesh position={[-0.1, 1.64, 0.24]}>
        <boxGeometry args={[0.032, 0.043, 0.018]} />
        <meshStandardMaterial color="#242629" roughness={0.52} />
      </mesh>
      <mesh position={[0.1, 1.64, 0.24]}>
        <boxGeometry args={[0.032, 0.043, 0.018]} />
        <meshStandardMaterial color="#242629" roughness={0.52} />
      </mesh>
      <mesh position={[0, 1.57, 0.25]} castShadow>
        <boxGeometry args={[0.07, 0.085, 0.065]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.47, 0.227]}>
        <boxGeometry args={[0.13, 0.025, 0.026]} />
        <meshStandardMaterial color="#533631" roughness={0.84} />
      </mesh>
      <mesh position={[0, 1.84, 0]} castShadow>
        <boxGeometry args={[0.52, 0.15, 0.48]} />
        <meshStandardMaterial color={ally ? "#315d7e" : "#6e2429"} roughness={0.67} />
      </mesh>
      <mesh position={[0, 1.77, -0.02]} castShadow>
        <boxGeometry args={[0.54, 0.12, 0.5]} />
        <meshStandardMaterial color="#292b31" metalness={0.18} roughness={0.66} />
      </mesh>
      <mesh position={[-0.255, 1.58, 0]}>
        <boxGeometry args={[0.05, 0.34, 0.4]} />
        <meshStandardMaterial color={hair} roughness={0.95} />
      </mesh>
      <mesh position={[0.255, 1.58, 0]}>
        <boxGeometry args={[0.05, 0.34, 0.4]} />
        <meshStandardMaterial color={hair} roughness={0.95} />
      </mesh>
      {bearded && (
        <mesh position={[0, 1.4, 0.19]}>
          <boxGeometry args={[0.34, 0.2, 0.1]} />
          <meshStandardMaterial color={hair} roughness={0.95} />
        </mesh>
      )}
      <mesh position={[0, 1.62, 0.245]}>
        <boxGeometry args={[0.05, 0.3, 0.04]} />
        <meshStandardMaterial color="#aab4b2" metalness={0.8} roughness={0.3} />
      </mesh>
      {ally ? (
        [-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.31, 1.3, 0]}>
            <boxGeometry args={[0.36, 0.03, 0.44]} />
            <meshStandardMaterial color="#d8a73f" metalness={0.8} roughness={0.3} />
          </mesh>
        ))
      ) : (
        [-1, 1].map((side) => (
          <group key={side}>
            <mesh position={[side * 0.26, 1.98, 0]} rotation={[0, 0, -side * 0.6]}>
              <coneGeometry args={[0.06, 0.28, 6]} />
              <meshStandardMaterial color="#e9dfc5" roughness={0.6} />
            </mesh>
            <mesh position={[side * 0.34, 1.4, 0]}>
              <coneGeometry args={[0.05, 0.22, 6]} />
              <meshStandardMaterial color="#c4ccca" metalness={0.7} roughness={0.35} />
            </mesh>
          </group>
        ))
      )}
      <mesh position={[0, 2.0, -0.02]} castShadow>
        <boxGeometry args={[0.1, 0.2, 0.4]} />
        <meshStandardMaterial color={team.plume} roughness={0.55} />
      </mesh>
      <mesh position={[-0.1, 1.695, 0.236]} rotation={[0, 0, ally ? 0.05 : -0.4]}>
        <boxGeometry args={[0.11, 0.025, 0.02]} />
        <meshStandardMaterial color="#2c1d18" roughness={0.9} />
      </mesh>
      <mesh position={[0.1, 1.695, 0.236]} rotation={[0, 0, ally ? -0.05 : 0.4]}>
        <boxGeometry args={[0.11, 0.025, 0.02]} />
        <meshStandardMaterial color="#2c1d18" roughness={0.9} />
      </mesh>
      <group ref={cape} position={[0, 1.22, -0.24]}>
        <mesh position={[0, -0.42, -0.03]} castShadow>
          <boxGeometry args={[0.56, 0.84, 0.035]} />
          <meshStandardMaterial color={team.cape} roughness={0.9} />
        </mesh>
      </group>
      <mesh ref={trail} position={[0.37, 1.1, 0]} rotation={[0, Math.PI / 2, 0]}>
        <ringGeometry args={[0.8, 1.55, 28, 1, 0.55, 2.5]} />
        <meshBasicMaterial color={team.trail} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={spark} position={[0, 1.1, 0.35]} visible={false}>
        {[[0.15, 0.1, 0], [-0.2, -0.05, 0.05], [0.02, 0.25, 0.02]].map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]}>
            <octahedronGeometry args={[0.07, 0]} />
            <meshBasicMaterial color="#fff2a8" toneMapped={false} />
          </mesh>
        ))}
      </group>
      <group ref={leftArm} position={[-0.37, 1.1, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <boxGeometry args={[0.23, 0.39, 0.23]} />
          <meshStandardMaterial color={ally ? "#245985" : "#9b3036"} roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.22, 0.012]} castShadow>
          <boxGeometry args={[0.29, 0.25, 0.31]} />
          <meshStandardMaterial color="#909999" metalness={0.5} roughness={0.43} />
        </mesh>
        <group ref={leftElbow} position={[0, -0.43, 0]}>
          <mesh position={[0, -0.19, 0]} castShadow>
            <boxGeometry args={[0.18, 0.34, 0.19]} />
            <meshStandardMaterial color={ally ? "#245985" : "#98413a"} roughness={0.82} />
          </mesh>
          <mesh position={[0, -0.13, 0.018]} castShadow>
            <boxGeometry args={[0.25, 0.22, 0.26]} />
            <meshStandardMaterial color="#828d8e" metalness={0.5} roughness={0.44} />
          </mesh>
<group position={[0, -0.38, 0.05]} scale={1}>
  <mesh castShadow><cylinderGeometry args={[0.33, 0.33, 0.06, 20]} /><meshStandardMaterial color="#4a3426" roughness={0.8} /></mesh>
  <mesh position={[0, -0.034, 0]}><cylinderGeometry args={[0.27, 0.27, 0.02, 20]} /><meshStandardMaterial color={team.cape} roughness={0.6} /></mesh>
  <mesh position={[0, -0.06, 0]}><sphereGeometry args={[0.09, 12, 8]} /><meshStandardMaterial color="#d5b46a" metalness={0.8} roughness={0.3} /></mesh>
</group>
        </group>
      </group>
      <group ref={rightArm} position={[0.37, 1.1, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <boxGeometry args={[0.23, 0.39, 0.23]} />
          <meshStandardMaterial color={ally ? "#245985" : "#9b3036"} roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.22, 0.012]} castShadow>
          <boxGeometry args={[0.29, 0.25, 0.31]} />
          <meshStandardMaterial color="#909999" metalness={0.5} roughness={0.43} />
        </mesh>
        <group ref={rightElbow} position={[0, -0.43, 0]}>
          <mesh position={[0, -0.18, 0]} castShadow>
            <boxGeometry args={[0.18, 0.32, 0.19]} />
            <meshStandardMaterial color={ally ? "#245985" : "#98413a"} roughness={0.82} />
          </mesh>
          <mesh position={[0, -0.12, 0.02]} castShadow>
            <boxGeometry args={[0.25, 0.22, 0.26]} />
            <meshStandardMaterial color="#828d8e" metalness={0.5} roughness={0.44} />
          </mesh>
          <mesh position={[0, -0.3, 0.035]} castShadow>
            <boxGeometry args={[0.18, 0.12, 0.2]} />
            <meshStandardMaterial color={skin} roughness={0.8} />
          </mesh>
          <group position={[0, -0.36, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
            <SwordModel scale={0.78} accent={team.accent} />
          </group>
        </group>
      </group>
      <group ref={leftLeg} position={[-0.16, 0.47, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <boxGeometry args={[0.27, 0.43, 0.28]} />
          <meshStandardMaterial color={ally ? "#174a78" : "#70272c"} roughness={0.87} />
        </mesh>
        <mesh position={[0, -0.43, 0.06]} castShadow>
          <boxGeometry args={[0.3, 0.16, 0.4]} />
          <meshStandardMaterial color="#41332d" roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.51, 0.24]} castShadow>
          <boxGeometry args={[0.31, 0.11, 0.12]} />
          <meshStandardMaterial color="#24292c" roughness={0.72} />
        </mesh>
        <mesh position={[0, -0.31, 0.11]} castShadow>
          <boxGeometry args={[0.29, 0.26, 0.3]} />
          <meshStandardMaterial color="#888f90" metalness={0.35} roughness={0.53} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.16, 0.47, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <boxGeometry args={[0.27, 0.43, 0.28]} />
          <meshStandardMaterial color={ally ? "#174a78" : "#70272c"} roughness={0.87} />
        </mesh>
        <mesh position={[0, -0.43, 0.06]} castShadow>
          <boxGeometry args={[0.3, 0.16, 0.4]} />
          <meshStandardMaterial color="#41332d" roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.51, 0.24]} castShadow>
          <boxGeometry args={[0.31, 0.11, 0.12]} />
          <meshStandardMaterial color="#24292c" roughness={0.72} />
        </mesh>
        <mesh position={[0, -0.31, 0.11]} castShadow>
          <boxGeometry args={[0.29, 0.26, 0.3]} />
          <meshStandardMaterial color="#888f90" metalness={0.35} roughness={0.53} />
        </mesh>
      </group>
    </group>
  );
}

function Projectile({ projectile, playerRef, enemiesRef, onDamagePlayer, onDamageEnemy, onDone }) {
  const arrow = useRef();
  const velocity = useRef(projectile.direction.clone().multiplyScalar(projectile.speed || 19));
  const age = useRef(0);
  const removed = useRef(false);
  const orientation = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      projectile.direction.clone().normalize(),
    ),
    [projectile.direction],
  );

  useFrame((_, delta) => {
    if (!arrow.current || removed.current) return;
    age.current += delta;
    velocity.current.y -= 2.8 * delta;
    arrow.current.position.addScaledVector(velocity.current, delta);

    if (projectile.visual) {
      // boshqa o'yinchining o'qi: faqat ko'rinish, zarbani server hisoblaydi
    } else if (projectile.team === "enemy") {
      const player = playerRef.current;
      const playerCenter = new THREE.Vector3(
        player.x,
        terrainHeight(player.x, player.z) + 1 + (player.jumpY || 0),
        player.z,
      );
      if (arrow.current.position.distanceTo(playerCenter) < 0.78) {
        removed.current = true;
        onDamagePlayer(13);
        onDone(projectile.id);
        return;
      }
    } else {
      for (const enemy of enemiesRef.current) {
        if (enemy.health <= 0) continue;
        const enemyCenter = enemy.position.clone();
        enemyCenter.y += 1.05;
        if (arrow.current.position.distanceTo(enemyCenter) < 0.82) {
          removed.current = true;
          onDamageEnemy(enemy, projectile.damage, projectile.w);
          onDone(projectile.id);
          return;
        }
      }
    }

    if (age.current > 3 || arrow.current.position.y < -2) {
      removed.current = true;
      onDone(projectile.id);
    }
  });

  return (
    <group ref={arrow} position={projectile.origin} quaternion={orientation}>
      <mesh position={[0, 0.48, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.024, 0.95, 6]} />
        <meshStandardMaterial color="#795433" roughness={0.78} />
      </mesh>
      <mesh position={[0, 1, 0]}>
        <coneGeometry args={[0.065, 0.2, 6]} />
        <meshStandardMaterial color="#c4ccca" metalness={0.62} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.12, 0.035, 0.035]} />
        <meshStandardMaterial color="#e8e4dc" roughness={0.7} />
      </mesh>
    </group>
  );
}

function StickModel({ scale = 1 }) {
  return (
    <group scale={scale}>
      <mesh castShadow>
        <cylinderGeometry args={[0.042, 0.046, 0.5, 8]} />
        <meshStandardMaterial color="#4a2f1d" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.048, 0.95, 8]} />
        <meshStandardMaterial color="#8a6238" roughness={0.95} />
      </mesh>
      {[[0.06, 0.55], [-0.06, 0.92], [0.05, 1.12]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0]}>
          <sphereGeometry args={[0.04, 8, 6]} />
          <meshStandardMaterial color="#6f4c2a" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function CrossbowModel({ scale = 1, boltRef }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0, 0.2]} castShadow>
        <boxGeometry args={[0.07, 0.09, 0.78]} />
        <meshStandardMaterial color="#6b4a2d" roughness={0.85} />
      </mesh>
      <mesh position={[0, -0.1, -0.02]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.05, 0.16, 0.07]} />
        <meshStandardMaterial color="#4a2f1d" roughness={0.9} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.2, 0.02, 0.52]} rotation={[0, side * 0.35, 0]} castShadow>
            <boxGeometry args={[0.44, 0.04, 0.05]} />
            <meshStandardMaterial color="#3d352c" metalness={0.5} roughness={0.5} />
          </mesh>
          <mesh position={[side * 0.2035, 0.035, 0.4075]} rotation={[0, -side * 2.3269, 0]}>
            <boxGeometry args={[0.01, 0.01, 0.553]} />
            <meshStandardMaterial color="#efe6d0" roughness={0.8} />
          </mesh>
        </group>
      ))}
      <group ref={boltRef}>
        <mesh position={[0, 0.07, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.7, 6]} />
          <meshStandardMaterial color="#d8c49a" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.07, 0.75]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.03, 0.1, 6]} />
          <meshStandardMaterial color="#c4ccca" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

function Crossbow({ visible, attacking }) {
  const root = useRef();
  const bolt = useRef();
  const attackStart = useRef(-10);
  const previousAttack = useRef(attacking);
  const { camera } = useThree();

  useEffect(() => {
    if (!root.current) return undefined;
    camera.add(root.current);
    return () => camera.remove(root.current);
  }, [camera]);

  useFrame((state) => {
    if (!root.current) return;
    if (attacking !== previousAttack.current) {
      previousAttack.current = attacking;
      attackStart.current = state.clock.elapsedTime;
    }
    const t = state.clock.elapsedTime - attackStart.current;
    root.current.position.z = -0.55 + Math.max(0, 0.15 - t) * 1.2;
    root.current.rotation.x = Math.max(0, 0.15 - t) * 1.4;
    if (bolt.current) bolt.current.visible = t > 0.5;
  });

  return (
    <group ref={root} visible={visible} position={[0.22, -0.3, -0.55]}>
      <group rotation={[0, Math.PI, 0]}>
        <CrossbowModel boltRef={bolt} />
        <mesh position={[0, -0.1, 0]}>
          <boxGeometry args={[0.12, 0.13, 0.13]} />
          <meshStandardMaterial color="#c89570" roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.06, 0.38]}>
          <boxGeometry args={[0.12, 0.1, 0.14]} />
          <meshStandardMaterial color="#c89570" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

function WeaponIcon({ id }) {
  return (
    <svg className="weapon-icon" viewBox="0 0 64 64" aria-hidden="true">
      {id === "stick" && (
        <g transform="rotate(35 32 32)">
          <rect x="28" y="4" width="8" height="48" rx="4" fill="#8a6238" />
          <rect x="29" y="40" width="6" height="16" rx="2" fill="#4a2f1d" />
          <circle cx="37" cy="18" r="3" fill="#6f4c2a" />
        </g>
      )}
      {id === "sword" && (
        <g transform="rotate(35 32 32)">
          <rect x="29" y="6" width="6" height="34" fill="#e6eef2" />
          <polygon points="29,6 35,6 32,0" fill="#e6eef2" />
          <rect x="22" y="40" width="20" height="4" rx="1" fill="#d8a73f" />
          <rect x="30" y="44" width="4" height="12" fill="#5a3a22" />
          <circle cx="32" cy="58" r="3" fill="#d8a73f" />
        </g>
      )}
      {id === "bow" && (
        <g fill="none" strokeLinecap="round">
          <path d="M20 6 Q60 32 20 58" stroke="#8a5a2f" strokeWidth="4" />
          <line x1="20" y1="6" x2="20" y2="58" stroke="#f2e8cf" strokeWidth="1.5" />
          <line x1="14" y1="32" x2="54" y2="32" stroke="#d8c49a" strokeWidth="2" />
          <polygon points="54,32 46,28 46,36" fill="#c4ccca" stroke="none" />
        </g>
      )}
      {id === "crossbow" && (
        <g strokeLinecap="round">
          <rect x="29" y="12" width="6" height="46" rx="2" fill="#7a5530" />
          <path d="M8 24 Q32 8 56 24" stroke="#4a3a2a" strokeWidth="4" fill="none" />
          <line x1="8" y1="24" x2="32" y2="52" stroke="#f2e8cf" strokeWidth="1.5" />
          <line x1="56" y1="24" x2="32" y2="52" stroke="#f2e8cf" strokeWidth="1.5" />
          <rect x="31" y="8" width="2" height="38" fill="#d8c49a" />
        </g>
      )}
    </svg>
  );
}

function Bow({ visible, attacking }) {
  const bow = useRef();
  const arrow = useRef();
  const attackStart = useRef(-10);
  const previousAttack = useRef(attacking);
  const { camera } = useThree();
  const stringLine = useMemo(() => {
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: "#f2e8cf" }),
    );
    line.frustumCulled = false;
    return line;
  }, []);

  useEffect(() => {
    if (!bow.current) return undefined;
    camera.add(bow.current);
    return () => camera.remove(bow.current);
  }, [camera]);

  useFrame((state) => {
    if (!bow.current) return;
    if (attacking !== previousAttack.current) {
      previousAttack.current = attacking;
      attackStart.current = state.clock.elapsedTime;
    }
    const t = state.clock.elapsedTime - attackStart.current;
    const draw = t < 0.08 ? 0 : Math.min((t - 0.08) / 0.32, 1);
    const nockZ = -0.13 + draw * 0.34;
    const pos = stringLine.geometry.attributes.position;
    pos.setXYZ(0, 0, 0.4, -0.13);
    pos.setXYZ(1, 0, 0, nockZ);
    pos.setXYZ(2, 0, -0.4, -0.13);
    pos.needsUpdate = true;
    arrow.current.position.z = nockZ;
    arrow.current.visible = t >= 0.08;
    bow.current.position.z = -0.85 + Math.max(0, 0.12 - t) * 0.8;
  });

  return (
    <group ref={bow} visible={visible} position={[0.42, -0.4, -0.85]} rotation={[0, 0, -0.1]}>
      <group rotation={[0, Math.PI / 2, 0]}>
        <mesh rotation={[0, 0, -Math.PI * 0.4]}>
          <torusGeometry args={[0.42, 0.025, 8, 24, Math.PI * 0.8]} />
          <meshStandardMaterial color="#805a37" roughness={0.7} />
        </mesh>
      </group>
      <mesh position={[0, 0, -0.42]}>
        <boxGeometry args={[0.07, 0.16, 0.07]} />
        <meshStandardMaterial color="#4a2f1d" roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.06, -0.36]}>
        <boxGeometry args={[0.12, 0.14, 0.12]} />
        <meshStandardMaterial color="#c89570" roughness={0.8} />
      </mesh>
      <primitive object={stringLine} />
      <group ref={arrow}>
        <mesh position={[0, 0, -0.45]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.9, 6]} />
          <meshStandardMaterial color="#d8c49a" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, -0.95]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.032, 0.11, 6]} />
          <meshStandardMaterial color="#c4ccca" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, -0.06]}>
          <boxGeometry args={[0.1, 0.008, 0.1]} />
          <meshStandardMaterial color="#e05060" roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.01, 0.05]}>
          <boxGeometry args={[0.1, 0.1, 0.12]} />
          <meshStandardMaterial color="#c89570" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

function PlayerAvatar({ actor, visible, attacking, weapon }) {
  const fighter = useRef();
  const leftArm = useRef();
  const rightArm = useRef();
  const leftElbow = useRef();
  const rightElbow = useRef();
  const leftLeg = useRef();
  const rightLeg = useRef();
  const cape = useRef();
  const trail = useRef();
  const previousAttack = useRef(attacking);
  const attackStart = useRef(-10);
  const previousPosition = useRef(new THREE.Vector2(actor.current.x, actor.current.z));

  useFrame((state) => {
    if (!fighter.current) return;
    const player = actor.current;
    fighter.current.rotation.order = "YXZ";
    fighter.current.position.set(
      player.x,
      terrainHeight(player.x, player.z) + player.jumpY,
      player.z,
    );
    fighter.current.rotation.y = player.yaw + Math.PI;
    const moving = previousPosition.current.distanceTo(new THREE.Vector2(player.x, player.z)) > 0.001;
    previousPosition.current.set(player.x, player.z);
    const walk = moving ? Math.sin(state.clock.elapsedTime * 10) * 0.5 : 0;
    if (attacking !== previousAttack.current) {
      previousAttack.current = attacking;
      attackStart.current = state.clock.elapsedTime;
    }
    const sword = weapon === "sword" || weapon === "stick";
    const pose = swingPose((state.clock.elapsedTime - attackStart.current) / 0.46, 0.22, 0.45);
    const swinging = sword && pose.active;
    leftLeg.current.rotation.x = walk;
    rightLeg.current.rotation.x = -walk;
    leftArm.current.rotation.x = sword ? -0.8 : -walk * 0.45;
    leftElbow.current.rotation.x = sword ? -0.6 : -0.25 + Math.max(0, -walk) * 0.35;
    rightArm.current.rotation.x = sword ? (swinging ? pose.arm : -0.4 + walk * 0.35) : -1.3;
    rightArm.current.rotation.z = -0.1;
    rightElbow.current.rotation.x = sword ? -0.3 : -0.2;
    fighter.current.rotation.x = swinging ? pose.power * 0.15 : 0;
    cape.current.rotation.x = 0.1 + Math.abs(walk) * 0.5 + (swinging ? pose.power * 0.4 : 0);
    trail.current.material.opacity = swinging ? pose.power * 0.85 : 0;
  });

  return (
    <group ref={fighter} visible={visible}>
      <mesh position={[0, 1.03, 0]} castShadow>
        <boxGeometry args={[0.64, 0.82, 0.48]} />
        <meshStandardMaterial color="#174e83" roughness={0.72} metalness={0.12} />
      </mesh>
      <mesh position={[0, 1.13, 0.28]} castShadow>
        <boxGeometry args={[0.53, 0.48, 0.09]} />
        <meshStandardMaterial color="#9aa5a7" roughness={0.36} metalness={0.62} />
      </mesh>
      <mesh position={[0, 1.13, 0.33]}>
        <boxGeometry args={[0.44, 0.035, 0.018]} />
        <meshStandardMaterial color="#e2bb79" metalness={0.62} roughness={0.34} />
      </mesh>
      <mesh position={[0, 1.08, 0.337]} castShadow>
        <boxGeometry args={[0.19, 0.3, 0.035]} />
        <meshStandardMaterial color="#27639a" roughness={0.69} />
      </mesh>
      <mesh position={[0, 1.13, 0.36]}>
        <circleGeometry args={[0.105, 6]} />
        <meshStandardMaterial color="#2a77ae" metalness={0.45} roughness={0.42} />
      </mesh>
      <mesh position={[0, 1.13, 0.378]}>
        <boxGeometry args={[0.025, 0.14, 0.012]} />
        <meshStandardMaterial color="#f0d293" metalness={0.57} roughness={0.32} />
      </mesh>
      <mesh position={[0, 1.42, 0.29]} castShadow>
        <boxGeometry args={[0.39, 0.07, 0.065]} />
        <meshStandardMaterial color="#b4bdba" metalness={0.72} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.62, 0.02]} castShadow>
        <boxGeometry args={[0.66, 0.1, 0.51]} />
        <meshStandardMaterial color="#202b35" roughness={0.74} />
      </mesh>
      <mesh position={[0, 0.62, 0.28]}>
        <boxGeometry args={[0.14, 0.1, 0.035]} />
        <meshStandardMaterial color="#e2bb79" metalness={0.58} roughness={0.37} />
      </mesh>
      <mesh position={[-0.24, 0.4, 0.12]} castShadow>
        <boxGeometry args={[0.14, 0.21, 0.21]} />
        <meshStandardMaterial color="#174a78" roughness={0.76} />
      </mesh>
      <mesh position={[-0.34, 1.39, 0]} rotation={[0, 0, -0.1]} castShadow>
        <boxGeometry args={[0.34, 0.3, 0.42]} />
        <meshStandardMaterial color="#a6b0af" metalness={0.67} roughness={0.38} />
      </mesh>
      <mesh position={[0.34, 1.39, 0]} rotation={[0, 0, 0.1]} castShadow>
        <boxGeometry args={[0.34, 0.3, 0.42]} />
        <meshStandardMaterial color="#a6b0af" metalness={0.67} roughness={0.38} />
      </mesh>
      <mesh position={[0, 1.84, 0]} castShadow>
        <boxGeometry args={[0.52, 0.52, 0.46]} />
        <meshStandardMaterial color="#c9a184" roughness={0.82} />
      </mesh>
      <mesh position={[-0.115, 1.93, 0.239]}>
        <boxGeometry args={[0.08, 0.07, 0.027]} />
        <meshStandardMaterial color="#f5eee4" roughness={0.44} />
      </mesh>
      <mesh position={[0.115, 1.93, 0.239]}>
        <boxGeometry args={[0.08, 0.07, 0.027]} />
        <meshStandardMaterial color="#f5eee4" roughness={0.44} />
      </mesh>
      <mesh position={[0, 2.12, 0]} castShadow>
        <boxGeometry args={[0.58, 0.16, 0.51]} />
        <meshStandardMaterial color="#315d7e" metalness={0.5} roughness={0.38} />
      </mesh>
      <mesh position={[-0.115, 1.91, 0.239]}>
        <boxGeometry args={[0.036, 0.048, 0.022]} />
        <meshStandardMaterial color="#24292c" roughness={0.72} />
      </mesh>
      <mesh position={[0.115, 1.91, 0.239]}>
        <boxGeometry args={[0.036, 0.048, 0.022]} />
        <meshStandardMaterial color="#24292c" roughness={0.72} />
      </mesh>
      <mesh position={[0, 1.85, 0.272]} castShadow>
        <boxGeometry args={[0.075, 0.085, 0.062]} />
        <meshStandardMaterial color="#c9a184" roughness={0.82} />
      </mesh>
      <mesh position={[0, 1.75, 0.242]}>
        <boxGeometry args={[0.15, 0.026, 0.025]} />
        <meshStandardMaterial color="#644139" roughness={0.82} />
      </mesh>
      <mesh position={[0, 1.72, 0.24]}>
        <boxGeometry args={[0.19, 0.025, 0.035]} />
        <meshStandardMaterial color="#594139" roughness={0.83} />
      </mesh>
      <mesh position={[0, 0.56, 0]} castShadow>
        <boxGeometry args={[0.68, 0.18, 0.52]} />
        <meshStandardMaterial color="#513f35" roughness={0.72} />
      </mesh>
      <mesh position={[-0.275, 1.86, 0]}>
        <boxGeometry args={[0.05, 0.36, 0.44]} />
        <meshStandardMaterial color="#3b2a1d" roughness={0.95} />
      </mesh>
      <mesh position={[0.275, 1.86, 0]}>
        <boxGeometry args={[0.05, 0.36, 0.44]} />
        <meshStandardMaterial color="#3b2a1d" roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.68, 0.2]}>
        <boxGeometry args={[0.38, 0.22, 0.1]} />
        <meshStandardMaterial color="#3b2a1d" roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.9, 0.255]}>
        <boxGeometry args={[0.055, 0.32, 0.04]} />
        <meshStandardMaterial color="#aab4b2" metalness={0.8} roughness={0.3} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.34, 1.55, 0]}>
          <boxGeometry args={[0.38, 0.035, 0.46]} />
          <meshStandardMaterial color="#d8a73f" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 2.3, -0.02]} castShadow>
        <boxGeometry args={[0.11, 0.24, 0.46]} />
        <meshStandardMaterial color="#3aa0ff" roughness={0.55} />
      </mesh>
      <group ref={cape} position={[0, 1.62, -0.27]}>
        <mesh position={[0, -0.5, -0.03]} castShadow>
          <boxGeometry args={[0.62, 1.0, 0.04]} />
          <meshStandardMaterial color="#1d5d99" roughness={0.9} />
        </mesh>
      </group>
      <mesh ref={trail} position={[0.4, 1.45, 0]} rotation={[0, Math.PI / 2, 0]}>
        <ringGeometry args={[1.1, 2.1, 28, 1, 0.55, 2.5]} />
        <meshBasicMaterial color="#bfe6ff" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={leftArm} position={[-0.4, 1.45, 0]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[0.27, 0.44, 0.29]} />
          <meshStandardMaterial color="#245985" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.27, 0.02]} castShadow>
          <boxGeometry args={[0.31, 0.25, 0.31]} />
          <meshStandardMaterial color="#98a4a4" metalness={0.65} roughness={0.4} />
        </mesh>
        <group ref={leftElbow} position={[0, -0.46, 0]}>
          <mesh position={[0, -0.18, 0]} castShadow>
            <boxGeometry args={[0.22, 0.34, 0.24]} />
            <meshStandardMaterial color="#245985" roughness={0.72} />
          </mesh>
          <mesh position={[0, -0.12, 0.02]} castShadow>
            <boxGeometry args={[0.28, 0.23, 0.29]} />
            <meshStandardMaterial color="#929e9f" metalness={0.57} roughness={0.41} />
          </mesh>
          <mesh position={[0, -0.34, 0.03]} castShadow>
            <boxGeometry args={[0.17, 0.12, 0.2]} />
            <meshStandardMaterial color="#c9a184" roughness={0.82} />
          </mesh>
<group position={[0, -0.38, 0.05]} scale={1.15} visible={weapon === "sword" || weapon === "stick"}>
  <mesh castShadow><cylinderGeometry args={[0.33, 0.33, 0.06, 20]} /><meshStandardMaterial color="#4a3426" roughness={0.8} /></mesh>
  <mesh position={[0, -0.034, 0]}><cylinderGeometry args={[0.27, 0.27, 0.02, 20]} /><meshStandardMaterial color="#245985" roughness={0.6} /></mesh>
  <mesh position={[0, -0.06, 0]}><sphereGeometry args={[0.09, 12, 8]} /><meshStandardMaterial color="#d5b46a" metalness={0.8} roughness={0.3} /></mesh>
</group>
        </group>
      </group>
      <group ref={rightArm} position={[0.4, 1.45, 0]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[0.27, 0.44, 0.29]} />
          <meshStandardMaterial color="#245985" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.27, 0.02]} castShadow>
          <boxGeometry args={[0.31, 0.25, 0.31]} />
          <meshStandardMaterial color="#98a4a4" metalness={0.65} roughness={0.4} />
        </mesh>
        <group ref={rightElbow} position={[0, -0.46, 0]}>
          <mesh position={[0, -0.18, 0]} castShadow>
            <boxGeometry args={[0.22, 0.34, 0.24]} />
            <meshStandardMaterial color="#245985" roughness={0.72} />
          </mesh>
          <mesh position={[0, -0.12, 0.02]} castShadow>
            <boxGeometry args={[0.28, 0.23, 0.29]} />
            <meshStandardMaterial color="#929e9f" metalness={0.57} roughness={0.41} />
          </mesh>
          <mesh position={[0, -0.34, 0.03]} castShadow>
            <boxGeometry args={[0.17, 0.12, 0.2]} />
            <meshStandardMaterial color="#c9a184" roughness={0.82} />
          </mesh>
        {weapon === "sword" || weapon === "stick" ? (
          <group position={[0, -0.34, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
            {weapon === "stick" ? <StickModel scale={1.15} /> : <SwordModel scale={1.15} accent="#7cc4ff" />}
          </group>
        ) : weapon === "crossbow" ? (
          <group position={[0, -0.3, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <CrossbowModel scale={0.9} />
          </group>
        ) : (
          <group position={[0, -0.36, 0.16]} rotation={[0, 0, Math.PI / 2]}>
            <mesh><torusGeometry args={[0.34, 0.035, 8, 24, Math.PI * 1.5]} /><meshStandardMaterial color="#805a37" roughness={0.7} /></mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.012, 0.012, 0.65, 6]} /><meshStandardMaterial color="#e7ddca" roughness={0.68} /></mesh>
          </group>
        )}
        </group>
      </group>
      <group ref={leftLeg} position={[-0.17, 0.61, 0]}>
        <mesh position={[0, -0.27, 0]} castShadow>
          <boxGeometry args={[0.29, 0.54, 0.31]} />
          <meshStandardMaterial color="#194c7b" roughness={0.79} />
        </mesh>
        <mesh position={[0, -0.37, 0.1]} castShadow>
          <boxGeometry args={[0.32, 0.29, 0.34]} />
          <meshStandardMaterial color="#8f9a9b" metalness={0.48} roughness={0.47} />
        </mesh>
        <mesh position={[0, -0.58, 0.08]} castShadow>
          <boxGeometry args={[0.28, 0.16, 0.42]} />
          <meshStandardMaterial color="#343839" roughness={0.73} />
        </mesh>
        <mesh position={[0, -0.58, 0.26]}>
          <boxGeometry args={[0.29, 0.075, 0.025]} />
          <meshStandardMaterial color="#687274" metalness={0.45} roughness={0.42} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.17, 0.61, 0]}>
        <mesh position={[0, -0.27, 0]} castShadow>
          <boxGeometry args={[0.29, 0.54, 0.31]} />
          <meshStandardMaterial color="#194c7b" roughness={0.79} />
        </mesh>
        <mesh position={[0, -0.37, 0.1]} castShadow>
          <boxGeometry args={[0.32, 0.29, 0.34]} />
          <meshStandardMaterial color="#8f9a9b" metalness={0.48} roughness={0.47} />
        </mesh>
        <mesh position={[0, -0.58, 0.08]} castShadow>
          <boxGeometry args={[0.28, 0.16, 0.42]} />
          <meshStandardMaterial color="#343839" roughness={0.73} />
        </mesh>
        <mesh position={[0, -0.58, 0.26]}>
          <boxGeometry args={[0.29, 0.075, 0.025]} />
          <meshStandardMaterial color="#687274" metalness={0.45} roughness={0.42} />
        </mesh>
      </group>
    </group>
  );
}

function Sword({ attacking, visible, kind }) {
  const sword = useRef();
  const trail = useRef();
  const attackStart = useRef(-10);
  const attackProgress = useRef(0);
  const previousAttack = useRef(attacking);
  const { camera } = useThree();
  const blade = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.09, 0);
    shape.lineTo(0.09, 0);
    shape.lineTo(0.057, 1.28);
    shape.lineTo(0, 1.52);
    shape.lineTo(-0.057, 1.28);
    shape.closePath();
    return new THREE.ShapeGeometry(shape, 8);
  }, []);

  useEffect(() => {
    if (!sword.current) return undefined;
    camera.add(sword.current);
    return () => camera.remove(sword.current);
  }, [camera]);

  useFrame((state) => {
    if (!sword.current) return;
    if (attacking !== previousAttack.current) {
      previousAttack.current = attacking;
      attackStart.current = state.clock.elapsedTime;
    }
    const t = (state.clock.elapsedTime - attackStart.current) / 0.46;
    const { smoothstep, clamp } = THREE.MathUtils;
    const k = clamp((t - 0.22) / 0.23, 0, 1);
    const strike = 1 - (1 - k) ** 3;
    const wi = smoothstep(t, 0, 0.22) * (1 - strike);
    const st = strike * (1 - smoothstep(t, 0.45, 1));
    sword.current.rotation.set(-0.15 - wi * 0.5 + st * 1.0, -0.25, -0.18 - wi * 0.75 + st * 0.95);
    sword.current.position.set(0.48 + wi * 0.12 - st * 0.55, -0.45 + wi * 0.18 - st * 0.18, -0.82 - st * 0.3);
    if (trail.current) trail.current.material.opacity = Math.sin(k * Math.PI) * 0.8;
  });

  return (
    <group ref={sword} visible={visible}>
      <group position={[0, -0.4, 0]} rotation={[0.18, 0, -0.16]}>
        {kind === "stick" ? <StickModel scale={1.1} /> : <SwordModel scale={1.12} accent="#7cc4ff" />}
      </group>
      <mesh position={[0, -0.53, 0]} rotation={[0, 0, -0.14]} castShadow>
        <capsuleGeometry args={[0.12, 0.37, 5, 10]} />
        <meshStandardMaterial color="#c89570" roughness={0.82} />
      </mesh>
      <mesh position={[0.16, -0.5, 0.02]} rotation={[0, 0, -0.72]} castShadow>
        <capsuleGeometry args={[0.14, 0.55, 6, 10]} />
        <meshStandardMaterial color="#28548a" roughness={0.64} />
      </mesh>
      <mesh position={[0.08, -0.36, 0.01]} rotation={[0, 0, -0.72]} castShadow>
        <capsuleGeometry args={[0.16, 0.2, 5, 10]} />
        <meshStandardMaterial color="#99a6a8" metalness={0.65} roughness={0.32} />
      </mesh>
      <mesh ref={trail} position={[0, 0.02, 0.05]}>
        <ringGeometry args={[0.7, 1.5, 20, 1, 0.45, 1.0]} />
        <meshBasicMaterial color="#cfeaff" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function GameScene({
  setPlayerHealth,
  setEnemyHealth,
  setEnemyCount,
  setStarted,
  setMenuOpen,
  viewMode,
  setViewMode,
  enemyLimit,
  allyLimit,
  mapId,
  weapon,
  setWeapon,
  owned,
  addCoins,
  touchControls,
  net = null,
  remotes = [],
  paused = false,
}) {
  const { camera, gl } = useThree();
  const player = useRef({
    x: 0,
    z: 7,
    yaw: 0,
    pitch: 0,
    health: 100,
    jumpY: 0,
    jumpVelocity: 0,
  });
  const cameraOrbit = useRef({ yaw: 0, pitch: 0 });
  const keys = useRef(new Set());
  const enemies = useRef([]);
  // Onlaynda dushmanlar — boshqa jamoadagi tirik o'yinchilar, yakkaxonda — AI
  const foesRef = useMemo(
    () => ({ get current() { return net ? net.getEnemies() : enemies.current; } }),
    [net],
  );
  const stateTimer = useRef(0);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const allies = useMemo(
    () => Array.from({ length: net ? 0 : Math.max(0, allyLimit - 1) }, (_, index) => ({
      id: index + 1,
      position: new THREE.Vector3(-2.2 + (index % 3) * 2.2, 0, 7 + Math.floor(index / 3) * 1.8),
      health: 100,
    })),
    [allyLimit, net],
  );
  const projectilesId = useRef(0);
  const [projectiles, setProjectiles] = useState([]);
  activeObstacles = getWorld(mapId).obstacles;
  const sky = SKY[mapId] || SKY.meadow;
  const spec = WEAPONS[weapon] || WEAPONS.stick;
  const melee = spec.kind === "melee";
  const [effects, setEffects] = useState([]);
  const effectId = useRef(0);
  const attackTime = useRef(0);
  const nextAttackTime = useRef(0);
  const activeSwing = useRef({ elapsed: 0, hit: false });
  const shake = useRef(0);
  const touchLook = useRef(null);
  const [attackId, setAttackId] = useState(0);

  const damageEnemy = useCallback((target, damage, byPlayer = false, weaponId) => {
    if (target.health <= 0) return;
    if (net) {
      // Onlayn: zarbani server hisoblaydi, biz faqat xabar yuboramiz
      const w = weaponId || weapon;
      net.sendHit(target.id, w);
      setEffects((current) => [...current.slice(-12), { id: ++effectId.current, damage: WEAPONS[w]?.damage ?? damage, position: [target.position.x, target.position.y + 1.3, target.position.z] }]);
      return;
    }
    target.health = Math.max(0, target.health - damage);
    setEffects((current) => [...current.slice(-12), { id: ++effectId.current, damage, position: [target.position.x, target.position.y + 1.3, target.position.z] }]);
    setEnemyHealth((current) =>
      current.map((enemy) =>
        enemy.id === target.id ? { ...enemy, health: target.health } : enemy,
      ),
    );
    if (target.health === 0) {
      setEnemyCount((count) => count - 1);
      if (byPlayer) {
        addCoins(KILL_COINS);
        setEffects((current) => [...current.slice(-12), { id: ++effectId.current, coin: true, label: `+${KILL_COINS} 🪙`, damage: 0, position: [target.position.x, target.position.y + 2.2, target.position.z] }]);
      }
    }
  }, [setEnemyCount, setEnemyHealth, addCoins, net, weapon]);

  const launchPlayerArrow = useCallback(() => {
    const actor = player.current;
    const yaw = viewMode === "third" ? cameraOrbit.current.yaw : actor.yaw;
    const pitch = viewMode === "third" ? cameraOrbit.current.pitch : actor.pitch;
    const direction = new THREE.Vector3(
      -Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch),
    ).normalize();
    const origin = new THREE.Vector3(
      actor.x + Math.cos(yaw) * 0.35,
      terrainHeight(actor.x, actor.z) + 1.48 + actor.jumpY,
      actor.z - Math.sin(yaw) * 0.35,
    );
    setProjectiles((current) => [
      ...current,
      {
        id: ++projectilesId.current,
        team: "player",
        origin,
        direction,
        damage: spec.damage,
        speed: spec.speed,
        w: weapon,
      },
    ]);
    net?.sendShot(origin, direction, weapon);
  }, [viewMode, weapon, net]);

  const doAttack = useCallback(() => {
    if (player.current.health <= 0) return;
    if (performance.now() < nextAttackTime.current) return;
    nextAttackTime.current = performance.now() + spec.cooldown;
    if (isTouch) {
      const me = player.current;
      let best = null;
      let bestDist = 7;
      for (const foe of foesRef.current) {
        if (foe.health <= 0) continue;
        const d = Math.hypot(foe.position.x - me.x, foe.position.z - me.z);
        if (d < bestDist) { best = foe; bestDist = d; }
      }
      if (best) {
        me.yaw = Math.atan2(-(best.position.x - me.x), -(best.position.z - me.z));
        me.pitch = !melee ? Math.atan2(-0.43 + 0.0039 * bestDist * bestDist, bestDist) : 0;
        if (melee && bestDist > 1.8) {
          const step = Math.min(0.9, bestDist - 1.8);
          me.x += ((best.position.x - me.x) / bestDist) * step;
          me.z += ((best.position.z - me.z) / bestDist) * step;
        }
        cameraOrbit.current.yaw = me.yaw;
        if (!melee) cameraOrbit.current.pitch = THREE.MathUtils.clamp(me.pitch, -0.28, 0.55);
      }
    }
    if (viewMode === "third" && melee) {
      player.current.yaw = cameraOrbit.current.yaw;
    }
    if (!melee) {
      attackTime.current += 1;
      setAttackId(attackTime.current);
      launchPlayerArrow();
      return;
    }
    attackTime.current += 1;
    activeSwing.current = { elapsed: 0, hit: false };
    setAttackId(attackTime.current);
  }, [launchPlayerArrow, viewMode, weapon]);

  useEffect(() => {
    const applyLook = (deltaX, deltaY) => {
      if (viewMode === "third") {
        cameraOrbit.current.yaw -= deltaX * 0.004;
        cameraOrbit.current.pitch = THREE.MathUtils.clamp(
          cameraOrbit.current.pitch - deltaY * 0.003,
          -0.28,
          0.55,
        );
      } else {
        player.current.yaw -= deltaX * 0.004;
        player.current.pitch = THREE.MathUtils.clamp(
          player.current.pitch - deltaY * 0.003,
          -0.58,
          0.58,
        );
      }
    };
    const onTouchStart = (event) => {
      if (event.pointerType !== "touch" || event.target.closest?.(".mobile-controls")) return;
      event.preventDefault();
      touchLook.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      gl.domElement.setPointerCapture?.(event.pointerId);
    };
    const onTouchMove = (event) => {
      const previous = touchLook.current;
      if (event.pointerType !== "touch" || !previous || previous.id !== event.pointerId) return;
      event.preventDefault();
      applyLook(event.clientX - previous.x, event.clientY - previous.y);
      previous.x = event.clientX;
      previous.y = event.clientY;
    };
    const onTouchEnd = (event) => {
      if (touchLook.current?.id === event.pointerId) touchLook.current = null;
    };
    const onKeyDown = (event) => {
      if (event.target.closest?.(".menu-overlay")) return;
      const key = event.key.toLowerCase();
      if (key === "escape") {
        event.preventDefault();
        setMenuOpen(true);
        document.exitPointerLock?.();
      }
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
        event.preventDefault();
      }
      if (key === "v") {
        setViewMode((mode) => mode === "first" ? "third" : "first");
      }
      const slot = Number(key) - 1;
      if (slot >= 0 && slot < WEAPON_ORDER.length && owned.includes(WEAPON_ORDER[slot])) setWeapon(WEAPON_ORDER[slot]);
      if (key === "b" && owned.includes("bow")) setWeapon("bow");
      keys.current.add(key);
      if (key === " " && !event.repeat && player.current.jumpY === 0) {
        player.current.jumpVelocity = 7.5;
      }
    };
    const onKeyUp = (event) => keys.current.delete(event.key.toLowerCase());
    const onMouseMove = (event) => {
      if (document.pointerLockElement !== gl.domElement) return;
      if (viewMode === "third") {
        cameraOrbit.current.yaw -= event.movementX * 0.0025;
        cameraOrbit.current.pitch = THREE.MathUtils.clamp(
          cameraOrbit.current.pitch - event.movementY * 0.0018,
          -0.28,
          0.55,
        );
      } else {
        player.current.yaw -= event.movementX * 0.0022;
        player.current.pitch = THREE.MathUtils.clamp(
          player.current.pitch - event.movementY * 0.0018,
          -0.58,
          0.58,
        );
      }
    };
    const onMouseDown = (event) => {
      if (event.button !== 0) return;
      if (performance.now() - lastTouch.current < 800) return;
      if (
        event.target.closest?.(".view-toggle, .enemy-picker, .weapon-toggle, .end-overlay, .menu-overlay") ||
        (event.target !== gl.domElement && !event.target.closest?.(".start-overlay"))
      ) {
        return;
      }
      if (document.pointerLockElement !== gl.domElement) {
        gl.domElement.requestPointerLock?.();
      }
      doAttack();
    };
    const onPointerLockChange = () => {
      setStarted(document.pointerLockElement === gl.domElement);
    };
    const onBlur = () => keys.current.clear();
    const lastTouch = { current: 0 };
    const rememberTouch = () => { lastTouch.current = performance.now(); };
    const onPointerDown = (event) => {
      if (event.pointerType === "touch") rememberTouch();
      onTouchStart(event);
    };
    const onPointerMove = (event) => {
      if (event.pointerType === "touch") rememberTouch();
      onTouchMove(event);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("pointerlockchange", onPointerLockChange);
    gl.domElement.addEventListener("pointerdown", onPointerDown, { passive: false });
    gl.domElement.addEventListener("pointermove", onPointerMove, { passive: false });
    gl.domElement.addEventListener("pointerup", onTouchEnd);
    gl.domElement.addEventListener("pointercancel", onTouchEnd);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      gl.domElement.removeEventListener("pointerdown", onPointerDown);
      gl.domElement.removeEventListener("pointermove", onPointerMove);
      gl.domElement.removeEventListener("pointerup", onTouchEnd);
      gl.domElement.removeEventListener("pointercancel", onTouchEnd);
    };
  }, [doAttack, gl, owned, setMenuOpen, setStarted, setViewMode, setWeapon, viewMode]);

  if (!net && enemies.current.length === 0) {
    enemies.current = STARTING_ENEMIES.slice(0, enemyLimit).map((enemy) => ({
      ...enemy,
      position: new THREE.Vector3(...enemy.position),
      onAttack: (damage) => {
        if (pausedRef.current) return; // menyu ochiq: zarar yo'q
        player.current.health = Math.max(0, player.current.health - damage);
        setPlayerHealth(player.current.health);
        shake.current = Math.max(shake.current, 0.09);
      },
      onShoot: (origin, direction) => {
        setProjectiles((current) => [
          ...current,
          {
            id: ++projectilesId.current,
            team: "enemy",
            origin,
            direction,
          },
        ]);
      },
    }));
  }

  // Boshqa o'yinchilarning o'qlarini ko'rsatish
  useEffect(() => {
    if (!net) return undefined;
    net.onShot.current = (m) => {
      setProjectiles((current) => [
        ...current.slice(-20),
        {
          id: ++projectilesId.current,
          team: "remote",
          visual: true,
          origin: new THREE.Vector3(...m.o),
          direction: new THREE.Vector3(...m.d).normalize(),
          speed: WEAPONS[m.w]?.speed,
        },
      ]);
    };
    return () => {
      net.onShot.current = null;
    };
  }, [net]);

  useFrame((_, delta) => {
    const actor = player.current;
    const alive = !net || net.me.current.hp > 0;
    if (net) {
      const mine = net.me.current;
      if (mine.pendingSpawn) {
        const s = mine.pendingSpawn;
        mine.pendingSpawn = null;
        Object.assign(actor, { x: s.x, z: s.z, yaw: s.yaw, pitch: 0, jumpY: 0, jumpVelocity: 0 });
        cameraOrbit.current.yaw = s.yaw;
        cameraOrbit.current.pitch = 0;
      }
      actor.health = mine.hp;
    }
    if (touchControls.current.attack || touchControls.current.attackHeld) {
      touchControls.current.attack = false;
      doAttack();
    }
    if (touchControls.current.jump) {
      touchControls.current.jump = false;
      if (actor.jumpY === 0) actor.jumpVelocity = 7.5;
    }
    const swing = activeSwing.current;
    if (melee && !swing.hit && swing.elapsed < 0.4) {
      swing.elapsed += delta;
      if (swing.elapsed >= 0.14) {
        swing.hit = true;
        const forwardX = -Math.sin(actor.yaw);
        const forwardZ = -Math.cos(actor.yaw);
        let target = null;
        let closestDistance = spec.reach;
        for (const enemy of foesRef.current) {
          if (enemy.health <= 0) continue;
          const dx = enemy.position.x - actor.x;
          const dz = enemy.position.z - actor.z;
          const distance = Math.hypot(dx, dz);
          const alignment =
            (dx * forwardX + dz * forwardZ) / Math.max(distance, 0.001);
          if (alignment > 0.42 && distance < closestDistance) {
            target = enemy;
            closestDistance = distance;
          }
        }
        if (target) {
          damageEnemy(target, spec.damage, true);
          shake.current = 0.14;
        }
      }
    }

    const pressed = keys.current;
    const forward = Number(pressed.has("w") || pressed.has("arrowup")) -
      Number(pressed.has("s") || pressed.has("arrowdown")) - touchControls.current.moveY;
    const sideways = Number(pressed.has("d") || pressed.has("arrowright")) -
      Number(pressed.has("a") || pressed.has("arrowleft")) + touchControls.current.moveX;
    const length = Math.hypot(forward, sideways);
    if (length > 0 && alive) {
      const speed = 5 * delta * Math.min(length, 1) / length;
      const moveYaw = viewMode === "third" ? cameraOrbit.current.yaw : actor.yaw;
      const moveX = -Math.sin(moveYaw) * forward + Math.cos(moveYaw) * sideways;
      const moveZ = -Math.cos(moveYaw) * forward - Math.sin(moveYaw) * sideways;
      actor.x += moveX * speed;
      actor.z += moveZ * speed;
      if (viewMode === "third") {
        actor.yaw = Math.atan2(-moveX, -moveZ);
      }
      actor.x = THREE.MathUtils.clamp(actor.x, -38, 38);
      actor.z = THREE.MathUtils.clamp(actor.z, -38, 38);
      pushOut(actor, 0.45);
    }

    if (actor.jumpY > 0 || actor.jumpVelocity > 0) {
      actor.jumpVelocity -= 18 * delta;
      actor.jumpY = Math.max(0, actor.jumpY + actor.jumpVelocity * delta);
      if (actor.jumpY === 0) actor.jumpVelocity = 0;
    }

    const ground = terrainHeight(actor.x, actor.z);
    if (viewMode === "first") {
      camera.position.set(actor.x, ground + 1.68 + actor.jumpY, actor.z);
      camera.rotation.order = "YXZ";
      camera.rotation.y = actor.yaw;
      camera.rotation.x = actor.pitch;
    } else {
      camera.position.set(
        actor.x + Math.sin(cameraOrbit.current.yaw) * 4.2,
        ground + 3.1 + cameraOrbit.current.pitch * 2 + actor.jumpY,
        actor.z + Math.cos(cameraOrbit.current.yaw) * 4.2,
      );
      camera.lookAt(
        actor.x,
        ground + 1.15 + cameraOrbit.current.pitch * 2.5 + actor.jumpY,
        actor.z,
      );
    }
    if (shake.current > 0) {
      camera.position.x += (Math.random() - 0.5) * shake.current;
      camera.position.y += (Math.random() - 0.5) * shake.current;
      shake.current = Math.max(0, shake.current - delta * 0.7);
    }

    for (const enemy of enemies.current) {
      if (enemy.health <= 0) continue;
      const distance = Math.hypot(enemy.position.x - actor.x, enemy.position.z - actor.z);
      enemy.position.y = terrainHeight(enemy.position.x, enemy.position.z);
      if (distance < 1.45) {
        const safeDistance = Math.max(distance, 0.001);
        enemy.position.x += ((enemy.position.x - actor.x) / safeDistance) * delta * 1.3;
        enemy.position.z += ((enemy.position.z - actor.z) / safeDistance) * delta * 1.3;
      }
    }

    if (net) {
      // Holatni serverga ~20 marta/soniya yuborish
      stateTimer.current += delta;
      if (stateTimer.current >= 0.05) {
        stateTimer.current = 0;
        net.sendState({ x: actor.x, z: actor.z, yaw: actor.yaw, jy: actor.jumpY, w: weapon, a: attackTime.current });
      }
    }
  });

  return (
    <>
      <color attach="background" args={[sky.fog]} />
      <fogExp2 attach="fog" args={[sky.fog, sky.density]} />
      <hemisphereLight args={[sky.hemiSky, sky.hemiGround, 1.1]} />
      <directionalLight
        castShadow
        position={SUN_POS}
        color={sky.light}
        intensity={sky.sunI}
        shadow-mapSize-width={isTouch ? 1024 : 2048}
        shadow-mapSize-height={isTouch ? 1024 : 2048}
        shadow-camera-left={-38}
        shadow-camera-right={38}
        shadow-camera-top={38}
        shadow-camera-bottom={-38}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      <SkyDome mapId={mapId} />
      <SunGlow mapId={mapId} />
      <Clouds mapId={mapId} />
      <MountainRing mapId={mapId} />
      <Terrain mapId={mapId} />
      <World mapId={mapId} />
      <SpawnFlag x={0} z={-32} color="#d8283f" />
      <SpawnFlag x={0} z={11} color="#2f6fe0" />
      {enemies.current.map((enemy) => (
        <Fighter key={enemy.id} enemy={enemy} targetRef={player} pausedRef={pausedRef} />
      ))}
      {net && remotes.map((r) => (
        <Fighter key={r.id} enemy={r} targetRef={player} ally={r.team === "blue"} remote />
      ))}
      {allies.map((ally) => (
        <Fighter
          key={ally.id}
          enemy={ally}
          ally
          targetRef={player}
          enemiesRef={enemies}
          onDamageEnemy={damageEnemy}
          pausedRef={pausedRef}
        />
      ))}
      <PlayerAvatar
        actor={player}
        visible={viewMode === "third"}
        attacking={attackId}
        weapon={weapon}
      />
      <Sword attacking={attackId} kind={weapon} visible={viewMode === "first" && melee} />
      <Bow attacking={attackId} visible={viewMode === "first" && weapon === "bow"} />
      <Crossbow attacking={attackId} visible={viewMode === "first" && weapon === "crossbow"} />
      {effects.map((effect) => (
        <HitEffect
          key={effect.id}
          effect={effect}
          onDone={(id) => setEffects((current) => current.filter((item) => item.id !== id))}
        />
      ))}
      {projectiles.map((projectile) => (
        <Projectile
          key={projectile.id}
          projectile={projectile}
          playerRef={player}
          enemiesRef={foesRef}
          onDamagePlayer={(damage) => {
            if (pausedRef.current) return;
            player.current.health = Math.max(0, player.current.health - damage);
            setPlayerHealth(player.current.health);
          }}
          onDamageEnemy={(enemy, dmg, w) => damageEnemy(enemy, dmg || 40, true, w)}
          onDone={(id) => setProjectiles((current) => current.filter((arrow) => arrow.id !== id))}
        />
      ))}
    </>
  );
}

export default function App() {
  const [playerHealth, setPlayerHealth] = useState(100);
  const [enemyLimit, setEnemyLimit] = useState(4);
  const [allyLimit, setAllyLimit] = useState(2);
  const [language, setLanguage] = useState("uz");
  const [mapId, setMapId] = useState("meadow");
  const [enemyHealth, setEnemyHealth] = useState(
    STARTING_ENEMIES.slice(0, 4).map(({ id, health }) => ({ id, health })),
  );
  const [enemyCount, setEnemyCount] = useState(4);
  const [started, setStarted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(true);
  const [hasEntered, setHasEntered] = useState(false);
  const [menuPage, setMenuPage] = useState("main");
  const [resetKey, setResetKey] = useState(0);
  const [viewMode, setViewMode] = useState("first");
  const [weapon, setWeapon] = useState(() => loadSave().weapon);
  const [coins, setCoins] = useState(() => loadSave().coins);
  const [owned, setOwned] = useState(() => loadSave().owned);
  const [runCoins, setRunCoins] = useState(0);
  const winPaid = useRef(false);
  const addCoins = useCallback((amount) => {
    setCoins((current) => current + amount);
    setRunCoins((current) => current + amount);
  }, []);
  useEffect(() => {
    saveGame({ coins, owned, weapon });
  }, [coins, owned, weapon]);
  const buyWeapon = (id) => {
    if (owned.includes(id) || coins < WEAPONS[id].price) return;
    setCoins((current) => current - WEAPONS[id].price);
    setOwned((current) => [...current, id]);
    setWeapon(id);
  };
  const touchControls = useRef({ moveX: 0, moveY: 0, jump: false, attack: false, attackHeld: false });
  const touchStick = useRef({ pointerId: null });
  const text = UI_TEXT[language];

  const online = useOnline({
    onStart: (map) => {
      setMapId(map);
      setResetKey((key) => key + 1);
      setHasEntered(true);
      setMenuOpen(false);
      try {
        Promise.resolve(document.querySelector(".game canvas")?.requestPointerLock?.()).catch(() => {});
      } catch {
        // sichqoncha qulfi uchun bosish kerak
      }
    },
    onKill: () => addCoins(KILL_COINS),
    onEnd: (won) => {
      if (won) addCoins(WIN_COINS);
      document.exitPointerLock?.();
    },
  });
  const onlineMode = online.inRoom;
  const ot = ONLINE_TEXT[language];
  const showHealth = onlineMode ? online.myHp : playerHealth;
  const inOnlineMenu = menuOpen && (menuPage === "online" || menuPage === "lobby");
  const finished = !onlineMode && !inOnlineMenu && (playerHealth <= 0 || enemyCount === 0);

  // Xonaga kirganda / chiqqanda sahnani yangidan boshlash
  const wasOnline = useRef(false);
  useEffect(() => {
    if (wasOnline.current === onlineMode) return;
    const left = wasOnline.current && !onlineMode;
    wasOnline.current = onlineMode;
    setPlayerHealth(100);
    setEnemyHealth(STARTING_ENEMIES.slice(0, enemyLimit).map(({ id, health }) => ({ id, health })));
    setEnemyCount(enemyLimit);
    setResetKey((key) => key + 1);
    if (left) {
      setMenuOpen(true);
      setMenuPage("online");
      document.exitPointerLock?.();
    }
  }, [onlineMode, enemyLimit]);

  useEffect(() => {
    winPaid.current = false;
    setRunCoins(0);
  }, [resetKey]);

  useEffect(() => {
    if (enemyCount === 0 && playerHealth > 0 && !winPaid.current) {
      winPaid.current = true;
      addCoins(WIN_COINS);
    }
  }, [enemyCount, playerHealth, addCoins]);

  const stickEl = useRef(null);
  const STICK_MAX = 44;

  const placeStick = (x, y) => {
    const stick = stickEl.current;
    if (!stick) return;
    stick.classList.add("active");
    stick.style.left = `${x}px`;
    stick.style.top = `${y}px`;
  };

  const startTouchStick = (event) => {
    event.preventDefault();
    const area = event.currentTarget.parentElement.getBoundingClientRect();
    touchStick.current = { pointerId: event.pointerId, baseX: event.clientX, baseY: event.clientY, area };
    placeStick(event.clientX - area.left, event.clientY - area.top);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const moveTouchStick = (event) => {
    const s = touchStick.current;
    if (s.pointerId !== event.pointerId) return;
    event.preventDefault();
    let dx = event.clientX - s.baseX;
    let dy = event.clientY - s.baseY;
    const dist = Math.hypot(dx, dy);
    if (dist > STICK_MAX) {
      dx = (dx / dist) * STICK_MAX;
      dy = (dy / dist) * STICK_MAX;
      s.baseX = event.clientX - dx;
      s.baseY = event.clientY - dy;
      placeStick(s.baseX - s.area.left, s.baseY - s.area.top);
    }
    const nx = dx / STICK_MAX;
    const ny = dy / STICK_MAX;
    touchControls.current.moveX = Math.abs(nx) < 0.1 ? 0 : nx;
    touchControls.current.moveY = Math.abs(ny) < 0.1 ? 0 : ny;
    stickEl.current?.style.setProperty("--stick-x", `${dx}px`);
    stickEl.current?.style.setProperty("--stick-y", `${dy}px`);
  };

  const endTouchStick = (event) => {
    if (touchStick.current.pointerId !== event.pointerId) return;
    touchStick.current = { pointerId: null };
    touchControls.current.moveX = 0;
    touchControls.current.moveY = 0;
    const stick = stickEl.current;
    if (stick) {
      stick.classList.remove("active");
      stick.style.left = "";
      stick.style.top = "";
      stick.style.setProperty("--stick-x", "0px");
      stick.style.setProperty("--stick-y", "0px");
    }
  };

  const releaseAttack = () => {
    touchControls.current.attackHeld = false;
  };

  const pressTouchAction = (event, action) => {
    event.preventDefault();
    touchControls.current[action] = true;
  };

  useEffect(() => {
    if (finished) document.exitPointerLock?.();
  }, [finished]);

  const restart = () => {
    setPlayerHealth(100);
    setEnemyHealth(STARTING_ENEMIES.slice(0, enemyLimit).map(({ id, health }) => ({ id, health })));
    setEnemyCount(enemyLimit);
    setStarted(false);
    setMenuOpen(true);
    setMenuPage("main");
    setResetKey((key) => key + 1);
  };

  const changeEnemyLimit = (event) => {
    const count = Number(event.target.value);
    setEnemyLimit(count);
    setPlayerHealth(100);
    setEnemyHealth(STARTING_ENEMIES.slice(0, count).map(({ id, health }) => ({ id, health })));
    setEnemyCount(count);
    setStarted(false);
    document.exitPointerLock?.();
    setResetKey((key) => key + 1);
  };

  const changeAllyLimit = (event) => {
    setAllyLimit(Number(event.target.value));
    setPlayerHealth(100);
    setStarted(false);
    document.exitPointerLock?.();
    setResetKey((key) => key + 1);
  };

  const enterGame = () => {
    setHasEntered(true);
    setMenuOpen(false);
    document.querySelector(".game canvas")?.requestPointerLock?.();
  };

  return (
    <main className="game">
      <Canvas
        key={resetKey}
        shadows
        dpr={isTouch ? [1, 1.25] : [1, 1.5]}
        camera={{ position: [0, 1.68, 7], fov: 76, near: 0.1, far: 320 }}
        gl={{ antialias: !isTouch, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.95 }}
      >
        <GameScene
          setPlayerHealth={setPlayerHealth}
          setEnemyHealth={setEnemyHealth}
          setEnemyCount={setEnemyCount}
          setStarted={setStarted}
          setMenuOpen={setMenuOpen}
          viewMode={viewMode}
          setViewMode={setViewMode}
          enemyLimit={enemyLimit}
          allyLimit={allyLimit}
          mapId={mapId}
          weapon={weapon}
          setWeapon={setWeapon}
          owned={owned}
          addCoins={addCoins}
          touchControls={touchControls}
          net={onlineMode ? online.net : null}
          remotes={online.remoteList}
          paused={menuOpen}
        />
      </Canvas>

      <header className={`hud${onlineMode ? " hud-online" : ""}`}>
        <section className={`health-card player-card${onlineMode ? " online-card" : ""}`}>
          <div className="health-label"><span>{onlineMode && online.team === "red" ? ot.redYou : text.bluePlayer}</span><strong>{showHealth}%</strong></div>
          <div className="health-track"><div className={`health-fill ${onlineMode && online.team === "red" ? "red-fill" : "blue-fill"}`} style={{ width: `${showHealth}%` }} /></div>
        </section>
        {onlineMode ? (
          <div className="score-card score-online"><span>{ot.score}</span><strong>{online.score.blue}:{online.score.red}</strong></div>
        ) : (
          <div className="score-card"><span>{text.redEnemies}</span><strong>{enemyCount}</strong></div>
        )}
        {onlineMode ? (
          <section className="health-card online-card">
            <div className="health-label"><span>{ot.room} · {ot.firstTo} {online.killLimit}</span><strong>{online.room.code}</strong></div>
          </section>
        ) : (
          <section className="health-card enemy-card">
            <div className="health-label"><span>{text.enemyHealth}</span><strong>{enemyHealth.find((enemy) => enemy.health > 0)?.health ?? 0}%</strong></div>
            <div className="health-track"><div className="health-fill red-fill" style={{ width: `${enemyHealth.find((enemy) => enemy.health > 0)?.health ?? 0}%` }} /></div>
          </section>
        )}
      </header>

      {!menuOpen && !finished && (
        <button
          className="open-menu-button"
          type="button"
          onClick={() => {
            setMenuPage("main");
            setMenuOpen(true);
            document.exitPointerLock?.();
          }}
        >
          ☰ <span>{text.menu}</span>
        </button>
      )}

      {!menuOpen && !finished && <div className="coin-chip">🪙 {coins}</div>}

      <div className="view-toggle" aria-label="Kamera ko‘rinishini tanlash">
        <button
          type="button"
          className={viewMode === "first" ? "selected" : ""}
          onClick={() => {
            document.exitPointerLock?.();
            setViewMode("first");
          }}
        >
          {text.firstPerson}
        </button>
        <button
          type="button"
          className={viewMode === "third" ? "selected" : ""}
          onClick={() => {
            document.exitPointerLock?.();
            setViewMode("third");
          }}
        >
          {text.thirdPerson}
        </button>
      </div>
      <div className="weapon-toggle" aria-label="Qurolni tanlash">
        {WEAPON_ORDER.map((id, index) => owned.includes(id) && (
          <button key={id} type="button" className={weapon === id ? "selected" : ""} onClick={() => setWeapon(id)}>
            {text[id]} <kbd>{index + 1}</kbd>
          </button>
        ))}
      </div>
      <div className="crosshair" aria-hidden="true"><span /></div>
      {showHealth > 0 && showHealth < 100 && <div key={showHealth} className="hurt-flash" aria-hidden="true" />}
      {onlineMode && online.phase === "play" && online.myHp <= 0 && !online.ended && <div className="respawn-banner">{ot.respawning}</div>}
      {onlineMode && online.feed.length > 0 && (
        <div className="kill-feed">{online.feed.map((item) => <div key={item.id}>{item.text}</div>)}</div>
      )}
      <div className="bottom-hint">{text.move} <i /> {text.jump} <i /> {text.look} <i /> {text.attack} <i /> {text.weaponKeys} <i /> {text.cameraKey}</div>

      {!menuOpen && !finished && (
        <div className="mobile-controls" aria-label="Touch controls">
          <div
            className="touch-zone"
            onPointerDown={startTouchStick}
            onPointerMove={moveTouchStick}
            onPointerUp={endTouchStick}
            onPointerCancel={endTouchStick}
          />
          <div className="touch-stick" ref={stickEl}>
            <span className="touch-stick-knob" />
          </div>
          <div className="touch-actions">
            <button type="button" className="touch-action attack-action" onPointerDown={(event) => { pressTouchAction(event, "attack"); touchControls.current.attackHeld = true; }} onPointerUp={releaseAttack} onPointerCancel={releaseAttack}>
              {text[weapon]}
            </button>
            <button type="button" className="touch-action jump-action" onPointerDown={(event) => pressTouchAction(event, "jump")}>
              ↑
            </button>
            <button
              type="button"
              className="touch-action swap-action"
              style={owned.length < 2 ? { display: "none" } : undefined}
              onPointerDown={(event) => {
                event.preventDefault();
                const list = WEAPON_ORDER.filter((id) => owned.includes(id));
                setWeapon((current) => list[(list.indexOf(current) + 1) % list.length]);
              }}
            >
              {WEAPON_ICONS[weapon]}
            </button>
          </div>
        </div>
      )}

      {menuOpen && !finished && (
        <section className="menu-overlay" aria-label={text.title}>
          {menuPage === "main" && (
            <div className="main-menu-card">
              <header className="main-menu-heading">
                <span className="menu-mark">3D</span>
                <h1>{text.title}</h1>
              </header>
              <button className="menu-nav-button primary" type="button" onClick={hasEntered ? enterGame : () => setMenuPage("maps")}>
                {hasEntered ? text.resume : text.play}
              </button>
              <button className="menu-nav-button" type="button" onClick={() => setMenuPage("online")}>
                🌐 {ot.title}
              </button>
              <button className="menu-nav-button" type="button" onClick={() => setMenuPage("shop")}>
                🪙 {text.shop} · {coins}
              </button>
              <button
                className="menu-nav-button"
                type="button"
                onClick={() => setMenuPage("controls")}
              >
                {text.controlsMenu}
              </button>
              <button
                className="menu-nav-button"
                type="button"
                onClick={() => setMenuPage("settings")}
              >
                {text.settingsMenu}
              </button>
              <label className="main-language">
                <span>{text.language}</span>
                <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                  <option value="uz">O‘zbekcha</option>
                  <option value="ru">Русский</option>
                  <option value="en">English</option>
                </select>
              </label>
            </div>
          )}

          {menuPage === "shop" && (
            <div className="menu-card shop-card">
              <div className="settings-ribbon">{text.shop}</div>
              <div className="shop-coins">🪙 {coins}</div>
              <p className="shop-hint">{text.shopHint}</p>
              <div className="shop-grid">
                {WEAPON_ORDER.map((id) => {
                  const w = WEAPONS[id];
                  const has = owned.includes(id);
                  const selected = weapon === id;
                  return (
                    <div key={id} className={`shop-item${selected ? " selected" : ""}`}>
                      <WeaponIcon id={id} />
                      <div className="shop-name">{text[id]}</div>
                      <div className="shop-stats">{w.kind === "melee" ? text.melee : text.ranged}</div>
                      <div className="shop-stats">{text.damageLabel}: {w.damage}</div>
                      <div className="shop-stats">{text.rateLabel}: {(1000 / w.cooldown).toFixed(1)}/s</div>
                      {has ? (
                        <button className="shop-btn" type="button" disabled={selected} onClick={() => setWeapon(id)}>
                          {selected ? text.equipped : text.equip}
                        </button>
                      ) : (
                        <button className="shop-btn buy" type="button" disabled={coins < w.price} onClick={() => buyWeapon(id)}>
                          🪙 {w.price} · {text.buy}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <button className="menu-back-button" type="button" onClick={() => setMenuPage("main")}>
                {text.back}
              </button>
            </div>
          )}

          {menuPage === "maps" && (
            <div className="menu-card maps-card">
              <div className="settings-ribbon">{text.settingsTitle}</div>
              <div className="section-label">{text.map}</div>
              <div className="map-cards">
                {["meadow", "desert", "snow"].map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={`map-card${mapId === id ? " selected" : ""}`}
                    onClick={() => setMapId(id)}
                  >
                    <span className={`map-preview preview-${id}`} />
                    <span className="map-info">
                      <span className="map-name">{text[id]}</span>
                      <span className="map-desc">{text[`${id}Desc`]}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="section-label">{text.chooseCount}</div>
              <div className="count-row blue">
                <div className="count-label">◆ {text.blueTeam}</div>
                <div className="count-chips">
                  {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => (
                    <button
                      key={count}
                      type="button"
                      className={`count-chip${allyLimit === count ? " selected" : ""}`}
                      onClick={() => changeAllyLimit({ target: { value: count } })}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
              <div className="count-row red">
                <div className="count-label">◆ {text.redTeam}</div>
                <div className="count-chips">
                  {STARTING_ENEMIES.map(({ id }) => (
                    <button
                      key={id}
                      type="button"
                      className={`count-chip${enemyLimit === id ? " selected" : ""}`}
                      onClick={() => changeEnemyLimit({ target: { value: id } })}
                    >
                      {id}
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-actions">
                <button className="menu-back-button" type="button" onClick={() => setMenuPage("main")}>
                  {text.back}
                </button>
                <button className="menu-start" type="button" onClick={enterGame}>
                  {text.start}
                </button>
              </div>
            </div>
          )}

          {menuPage === "settings" && (
            <div className="menu-card settings-card">
              <div className="settings-ribbon">{text.settingsTitle}</div>
              <div className="factions-label">{text.blueTeam} / {text.redTeam}</div>
              <div className="team-settings">
                <label className="team-count blue-team">
                  <span className="team-emblem">◆</span>
                  <span>{text.blueTeam}</span>
                  <select value={allyLimit} onChange={changeAllyLimit}>
                    {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => (
                      <option key={count} value={count}>{count}</option>
                    ))}
                  </select>
                </label>
                <div className="versus-mark">VS</div>
                <label className="team-count red-team">
                  <span className="team-emblem">◆</span>
                  <span>{text.redTeam}</span>
                  <select value={enemyLimit} onChange={changeEnemyLimit}>
                    {STARTING_ENEMIES.map(({ id }) => (
                      <option key={id} value={id}>{id}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="settings-grid">
                <label className="setting-row">
                  <span>{text.map}</span>
                  <select value={mapId} onChange={(event) => setMapId(event.target.value)}>
                    <option value="meadow">{text.meadow}</option>
                    <option value="desert">{text.desert}</option>
                    <option value="snow">{text.snow}</option>
                  </select>
                </label>
                <label className="setting-row">
                  <span>{text.language}</span>
                  <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                    <option value="uz">O‘zbekcha</option>
                    <option value="ru">Русский</option>
                    <option value="en">English</option>
                  </select>
                </label>
              </div>
              <div className="settings-actions">
                <button className="menu-back-button" type="button" onClick={() => setMenuPage("main")}>
                  {text.back}
                </button>
                <button className="menu-start" type="button" onClick={enterGame}>
                  {text.start}
                </button>
              </div>
            </div>
          )}

          {menuPage === "controls" && (
            <div className="menu-card controls-card">
              <div className="settings-ribbon">{text.controlsTitle}</div>
              <p>{text.controls}</p>
              <p>{text.move} · {text.jump}</p>
              <p>{text.attack} · {text.weaponKeys} · {text.cameraKey}</p>
              <button
                className="menu-back-button"
                type="button"
                onClick={() => setMenuPage("main")}
              >
                {text.back}
              </button>
            </div>
          )}
          {(menuPage === "online" || menuPage === "lobby") && (
            <OnlineMenus
              online={online}
              language={language}
              text={text}
              menuPage={menuPage}
              setMenuPage={setMenuPage}
              onResume={enterGame}
            />
          )}
        </section>
      )}
      {finished && (
        <div className="end-overlay">
          <div className={`end-card ${playerHealth <= 0 ? "defeat" : "victory"}`}>
            <strong>{playerHealth <= 0 ? text.defeat : text.victory}</strong>
            <span>{playerHealth <= 0 ? text.lost : text.won}</span>
            <span className="end-coins">🪙 +{runCoins}</span>
            <button onClick={restart}>{text.playAgain}</button>
          </div>
        </div>
      )}
      {onlineMode && online.ended && (
        <div className="end-overlay">
          <div className={`end-card ${online.winner === online.team ? "victory" : "defeat"}`}>
            <strong>{online.winner === online.team ? text.victory : text.defeat}</strong>
            <span>{online.winner === online.team ? ot.teamWon : ot.teamLost}</span>
            <span className="end-coins">{online.score.blue} : {online.score.red}</span>
            <button
              onClick={() => {
                online.backToLobby();
                setMenuPage("lobby");
                setMenuOpen(true);
                document.exitPointerLock?.();
              }}
            >
              {ot.backLobby}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}