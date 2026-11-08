import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const STARTING_ENEMIES = [
  { id: 1, position: [-0.55, 0, 4], health: 100 },
  { id: 2, position: [2.4, 0, -9], health: 100 },
  { id: 3, position: [-5, 0, -10], health: 100 },
  { id: 4, position: [5, 0, -14], health: 100 },
  { id: 5, position: [-8, 0, -5], health: 100 },
  { id: 6, position: [8, 0, -7], health: 100 },
  { id: 7, position: [-11, 0, -16], health: 100 },
  { id: 8, position: [11, 0, -19], health: 100 },
  { id: 9, position: [-3, 0, -23], health: 100 },
  { id: 10, position: [4, 0, -27], health: 100 },
];

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
    weaponKeys: "1/2 — qurol",
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
    weaponKeys: "1/2 — оружие",
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
    weaponKeys: "1/2 — weapon",
    cameraKey: "V — camera",
    victory: "VICTORY!",
    defeat: "DEFEAT",
    lost: "You ran out of health.",
    won: "You defeated all opponents!",
    playAgain: "Play again",
  },
};

function terrainHeight(x, z) {
  return Math.sin(x * 0.12 + z * 0.04) * 0.36 +
    Math.cos(z * 0.14 - x * 0.05) * 0.24 +
    Math.sin(x * 0.29 + z * 0.23) * 0.075;
}

function Terrain({ mapId }) {
  const geometry = useMemo(() => {
    const terrain = new THREE.PlaneGeometry(120, 120, 120, 120);
    const positions = terrain.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const z = -positions.getY(index);
      positions.setZ(index, terrainHeight(x, z));
    }
    positions.needsUpdate = true;
    terrain.computeVertexNormals();
    return terrain;
  }, []);

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
    >
      <meshStandardMaterial color={mapId === "desert" ? "#c8ae75" : "#a6bd60"} roughness={1} vertexColors={false} />
    </mesh>
  );
}

function Clouds() {
  const clouds = [
    [-28, 16, -35, 1],
    [-8, 20, -48, 1.15],
    [16, 17, -43, 0.9],
    [38, 21, -28, 1.2],
    [-42, 18, -8, 0.85],
    [45, 16, -4, 0.9],
  ];

  return clouds.map(([x, y, z, scale], index) => (
    <group key={index} position={[x, y, z]} scale={scale}>
      <mesh position={[-1.3, 0, 0]}>
        <sphereGeometry args={[2, 12, 9]} />
        <meshBasicMaterial color="#f0fbff" fog={false} />
      </mesh>
      <mesh position={[0.5, 0.65, 0]}>
        <sphereGeometry args={[2.8, 12, 9]} />
        <meshBasicMaterial color="#f5fcff" fog={false} />
      </mesh>
      <mesh position={[2.6, 0, 0.2]}>
        <sphereGeometry args={[1.8, 12, 9]} />
        <meshBasicMaterial color="#eaf9ff" fog={false} />
      </mesh>
    </group>
  ));
}

const TEAM = {
  ally: { plume: "#3aa0ff", cape: "#1d5d99", trail: "#a9d8ff", accent: "#7cc4ff" },
  enemy: { plume: "#ff4b4b", cape: "#8f2430", trail: "#ffb9a8", accent: "#e8b060" },
};

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

function Fighter({ enemy, targetRef, ally = false, enemiesRef, onDamageEnemy }) {
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
  const flash = useRef(0);
  const knock = useRef({ x: 0, z: 0 });
  const deathT = useRef(0);
  const [gone, setGone] = useState(false);
  const team = ally ? TEAM.ally : TEAM.enemy;

  useFrame((state, delta) => {
    const body = fighter.current;
    if (!body || gone) return;
    body.rotation.order = "YXZ";

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
      if (deathT.current > 2.2) setGone(true);
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
        <meshStandardMaterial color="#c89570" roughness={0.8} />
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
        <meshStandardMaterial color="#c89570" roughness={0.8} />
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
            <meshStandardMaterial color="#c89570" roughness={0.8} />
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
  const velocity = useRef(projectile.direction.clone().multiplyScalar(19));
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

    if (projectile.team === "enemy") {
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
          onDamageEnemy(enemy);
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

function Bow({ visible, attacking }) {
  const bow = useRef();
  const attackStart = useRef(0);
  const drawAmount = useRef(0);
  const previousAttack = useRef(attacking);
  const { camera } = useThree();

  useEffect(() => {
    if (!bow.current) return undefined;
    camera.add(bow.current);
    return () => camera.remove(bow.current);
  }, [camera]);

  useFrame((state, delta) => {
    if (!bow.current) return;
    if (attacking !== previousAttack.current) {
      previousAttack.current = attacking;
      attackStart.current = state.clock.elapsedTime;
    }
    const elapsed = state.clock.elapsedTime - attackStart.current;
    const phase = Math.min(elapsed / 0.3, 1);
    drawAmount.current = THREE.MathUtils.damp(
      drawAmount.current,
      phase < 0.65 ? Math.sin((phase / 0.65) * Math.PI * 0.5) : 0,
      18,
      delta,
    );
    bow.current.position.x = 0.48 - drawAmount.current * 0.04;
    bow.current.rotation.z = -0.14 + drawAmount.current * 0.06;
  });

  return (
    <group
      ref={bow}
      visible={visible}
      position={[0.48, -0.46, -0.78]}
      rotation={[0, 0, -0.14]}
    >
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.38, 0.035, 8, 28, Math.PI * 1.5]} />
        <meshStandardMaterial color="#805a37" roughness={0.7} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.72, 6]} />
        <meshStandardMaterial color="#e7ddca" roughness={0.68} />
      </mesh>
      <mesh position={[0, 0, 0.17]} castShadow>
        <boxGeometry args={[0.12, 0.14, 0.35]} />
        <meshStandardMaterial color="#c89570" roughness={0.8} />
      </mesh>
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
    const sword = weapon === "sword";
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
<group position={[0, -0.38, 0.05]} scale={1.15} visible={weapon === "sword"}>
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
        {weapon === "sword" ? (
          <group position={[0, -0.34, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
            <SwordModel scale={1.15} accent="#7cc4ff" />
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

function Sword({ attacking, visible }) {
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
      <mesh position={[0, -0.28, 0]} rotation={[0.18, 0, -0.16]} castShadow>
        <capsuleGeometry args={[0.075, 0.43, 4, 8]} />
        <meshStandardMaterial color="#c59357" roughness={0.63} />
      </mesh>
      <mesh position={[0, -0.04, 0]} rotation={[0.18, 0, -0.16]}>
        <boxGeometry args={[0.38, 0.055, 0.07]} />
        <meshStandardMaterial color="#9b713e" metalness={0.6} roughness={0.38} />
      </mesh>
      <mesh geometry={blade} position={[0, 0.02, 0.035]} rotation={[0.18, 0, -0.16]} castShadow>
        <meshStandardMaterial
          color="#e4edeb"
          metalness={0.9}
          roughness={0.16}
          envMapIntensity={1.4}
        />
      </mesh>
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
  touchControls,
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
  const allies = useMemo(
    () => Array.from({ length: Math.max(0, allyLimit - 1) }, (_, index) => ({
      id: index + 1,
      position: new THREE.Vector3(-2.2 + (index % 3) * 2.2, 0, 7 + Math.floor(index / 3) * 1.8),
      health: 100,
    })),
    [allyLimit],
  );
  const projectilesId = useRef(0);
  const [projectiles, setProjectiles] = useState([]);
  const attackTime = useRef(0);
  const nextAttackTime = useRef(0);
  const activeSwing = useRef({ elapsed: 0, hit: false });
  const shake = useRef(0);
  const touchLook = useRef(null);
  const [attackId, setAttackId] = useState(0);

  const damageEnemy = useCallback((target, damage) => {
    if (target.health <= 0) return;
    target.health = Math.max(0, target.health - damage);
    setEnemyHealth((current) =>
      current.map((enemy) =>
        enemy.id === target.id ? { ...enemy, health: target.health } : enemy,
      ),
    );
    if (target.health === 0) {
      setEnemyCount((count) => count - 1);
    }
  }, [setEnemyCount, setEnemyHealth]);

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
      },
    ]);
  }, [viewMode]);

  const doAttack = useCallback(() => {
    if (player.current.health <= 0) return;
    if (performance.now() < nextAttackTime.current) return;
    nextAttackTime.current = performance.now() + 430;
    if (viewMode === "third" && weapon === "sword") {
      player.current.yaw = cameraOrbit.current.yaw;
    }
    if (weapon === "bow") {
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
      if (key === "1") setWeapon("sword");
      if (key === "2" || key === "b") setWeapon("bow");
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
  }, [doAttack, gl, setMenuOpen, setStarted, setViewMode, setWeapon, viewMode]);

  if (enemies.current.length === 0) {
    enemies.current = STARTING_ENEMIES.slice(0, enemyLimit).map((enemy) => ({
      ...enemy,
      position: new THREE.Vector3(...enemy.position),
      onAttack: (damage) => {
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

  useFrame((_, delta) => {
    const actor = player.current;
    if (touchControls.current.attack) {
      touchControls.current.attack = false;
      doAttack();
    }
    if (touchControls.current.jump) {
      touchControls.current.jump = false;
      if (actor.jumpY === 0) actor.jumpVelocity = 7.5;
    }
    const swing = activeSwing.current;
    if (weapon === "sword" && !swing.hit && swing.elapsed < 0.4) {
      swing.elapsed += delta;
      if (swing.elapsed >= 0.14) {
        swing.hit = true;
        const forwardX = -Math.sin(actor.yaw);
        const forwardZ = -Math.cos(actor.yaw);
        let target = null;
        let closestDistance = 3.6;
        for (const enemy of enemies.current) {
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
          damageEnemy(target, 35);
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
    if (length > 0) {
      const speed = 5 * delta / length;
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
  });

  return (
    <>
      <color attach="background" args={[mapId === "desert" ? "#e4c69c" : "#8bd5f1"]} />
      <fog attach="fog" args={[mapId === "desert" ? "#ddc59f" : "#a5e0ec", 35, 100]} />
      <hemisphereLight args={["#e9f8ff", "#668247", 2.1]} />
      <directionalLight
        castShadow
        position={[-12, 24, 8]}
        intensity={2.2}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-38}
        shadow-camera-right={38}
        shadow-camera-top={38}
        shadow-camera-bottom={-38}
      />
      <Terrain mapId={mapId} />
      <Clouds />
      <mesh position={[-28, 5, -42]} castShadow>
        <coneGeometry args={[12, 12, 7]} />
        <meshStandardMaterial color={mapId === "desert" ? "#a98b5e" : "#8c9c60"} roughness={1} />
      </mesh>
      <mesh position={[30, 7, -47]} castShadow>
        <coneGeometry args={[15, 17, 8]} />
        <meshStandardMaterial color={mapId === "desert" ? "#b69a69" : "#879658"} roughness={1} />
      </mesh>
      <mesh position={[0, 1, -60]}>
        <sphereGeometry args={[28, 24, 12]} />
        <meshBasicMaterial color="#a8d7e4" />
      </mesh>
      {enemies.current.map((enemy) => (
        <Fighter key={enemy.id} enemy={enemy} targetRef={player} />
      ))}
      {allies.map((ally) => (
        <Fighter
          key={ally.id}
          enemy={ally}
          ally
          targetRef={player}
          enemiesRef={enemies}
          onDamageEnemy={damageEnemy}
        />
      ))}
      <PlayerAvatar
        actor={player}
        visible={viewMode === "third"}
        attacking={attackId}
        weapon={weapon}
      />
      <Sword attacking={attackId} visible={viewMode === "first" && weapon === "sword"} />
      <Bow attacking={attackId} visible={viewMode === "first" && weapon === "bow"} />
      {projectiles.map((projectile) => (
        <Projectile
          key={projectile.id}
          projectile={projectile}
          playerRef={player}
          enemiesRef={enemies}
          onDamagePlayer={(damage) => {
            player.current.health = Math.max(0, player.current.health - damage);
            setPlayerHealth(player.current.health);
          }}
          onDamageEnemy={(enemy) => damageEnemy(enemy, 40)}
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
  const [weapon, setWeapon] = useState("sword");
  const touchControls = useRef({ moveX: 0, moveY: 0, jump: false, attack: false });
  const touchStick = useRef({ pointerId: null });
  const text = UI_TEXT[language];
  const finished = playerHealth <= 0 || enemyCount === 0;

  const updateTouchStick = (event) => {
    if (touchStick.current.pointerId !== event.pointerId) return;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const maxDistance = bounds.width * 0.32;
    const offsetX = event.clientX - (bounds.left + bounds.width / 2);
    const offsetY = event.clientY - (bounds.top + bounds.height / 2);
    const distance = Math.hypot(offsetX, offsetY);
    const scale = distance > maxDistance ? maxDistance / distance : 1;
    const x = offsetX * scale;
    const y = offsetY * scale;
    touchControls.current.moveX = x / maxDistance;
    touchControls.current.moveY = y / maxDistance;
    event.currentTarget.style.setProperty("--stick-x", `${x}px`);
    event.currentTarget.style.setProperty("--stick-y", `${y}px`);
  };

  const releaseTouchStick = (event) => {
    if (touchStick.current.pointerId !== event.pointerId) return;
    touchStick.current.pointerId = null;
    touchControls.current.moveX = 0;
    touchControls.current.moveY = 0;
    event.currentTarget.style.setProperty("--stick-x", "0px");
    event.currentTarget.style.setProperty("--stick-y", "0px");
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
        dpr={[1, 1.5]}
        camera={{ position: [0, 1.68, 7], fov: 76, near: 0.1, far: 150 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
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
          touchControls={touchControls}
        />
      </Canvas>

      <header className="hud">
        <section className="health-card player-card">
          <div className="health-label"><span>{text.bluePlayer}</span><strong>{playerHealth}%</strong></div>
          <div className="health-track"><div className="health-fill blue-fill" style={{ width: `${playerHealth}%` }} /></div>
        </section>
        <div className="score-card"><span>{text.redEnemies}</span><strong>{enemyCount}</strong></div>
        <section className="health-card enemy-card">
          <div className="health-label"><span>{text.enemyHealth}</span><strong>{enemyHealth.find((enemy) => enemy.health > 0)?.health ?? 0}%</strong></div>
          <div className="health-track"><div className="health-fill red-fill" style={{ width: `${enemyHealth.find((enemy) => enemy.health > 0)?.health ?? 0}%` }} /></div>
        </section>
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
        <button
          type="button"
          className={weapon === "sword" ? "selected" : ""}
          onClick={() => setWeapon("sword")}
        >
          {text.sword} <kbd>1</kbd>
        </button>
        <button
          type="button"
          className={weapon === "bow" ? "selected" : ""}
          onClick={() => setWeapon("bow")}
        >
          {text.bow} <kbd>2</kbd>
        </button>
      </div>
      <div className="crosshair" aria-hidden="true"><span /></div>
      <div className="bottom-hint">{text.move} <i /> {text.jump} <i /> {text.look} <i /> {text.attack} <i /> {text.weaponKeys} <i /> {text.cameraKey}</div>

      {!menuOpen && !finished && (
        <div className="mobile-controls" aria-label="Touch controls">
          <div
            className="touch-stick"
            onPointerDown={(event) => {
              event.preventDefault();
              touchStick.current.pointerId = event.pointerId;
              event.currentTarget.setPointerCapture(event.pointerId);
              updateTouchStick(event);
            }}
            onPointerMove={updateTouchStick}
            onPointerUp={releaseTouchStick}
            onPointerCancel={releaseTouchStick}
          >
            <span className="touch-stick-knob" />
          </div>
          <div className="touch-actions">
            <button type="button" className="touch-action attack-action" onPointerDown={(event) => pressTouchAction(event, "attack")}>
              {weapon === "sword" ? text.sword : text.bow}
            </button>
            <button type="button" className="touch-action jump-action" onPointerDown={(event) => pressTouchAction(event, "jump")}>
              {text.jump}
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
              <button className="menu-nav-button primary" type="button" onClick={enterGame}>
                {hasEntered ? text.resume : text.play}
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
        </section>
      )}
      {finished && (
        <div className="end-overlay">
          <div className="end-card">
            <strong>{playerHealth <= 0 ? text.defeat : text.victory}</strong>
            <span>{playerHealth <= 0 ? text.lost : text.won}</span>
            <button onClick={restart}>{text.playAgain}</button>
          </div>
        </div>
      )}
    </main>
  );
}