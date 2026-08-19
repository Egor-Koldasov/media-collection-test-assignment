import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import "./styles.css";

const COLORS = {
  ink: 0x030807,
  fog: 0x07110f,
  stone: 0x111b18,
  stoneLight: 0x21342e,
  mint: 0x72ffc0,
  brass: 0xd4aa60,
  danger: 0xff735f,
  blue: 0x78caff,
};

const UNIT_COLORS = [0x72ffc0, 0x74bfff, 0xffc76b, 0xff806f, 0xc78bff, 0x9ae66e];
const UNIT_NAMES = ["Aster", "Vellum", "Orison", "Morrow", "Calix", "Sable", "Threnody", "Ilex", "Vesper", "Quill"];
const UNIT_TITLES = ["Warden", "Cantor", "Seer", "Vessel", "Herald", "Anchor", "Penitent"];
const CHASSIS_NAMES = ["CROWN", "RELIQUARY", "BASTION"];

const ABILITIES = {
  bolt: {
    name: "Lumen Bolt",
    shortName: "BOLT",
    icon: "✦",
    cost: 21,
    kind: "attack",
    power: 20,
    color: 0x72ffc0,
    description: "Strike the nearest hostile.",
  },
  lance: {
    name: "Brass Lance",
    shortName: "LANCE",
    icon: "↟",
    cost: 33,
    kind: "attack",
    power: 34,
    color: 0xffc96f,
    description: "A costly, concentrated strike.",
  },
  nova: {
    name: "Sunless Nova",
    shortName: "NOVA",
    icon: "☼",
    cost: 48,
    kind: "aoe",
    power: 17,
    color: 0xff9b61,
    description: "Damage every hostile in a wide radius.",
  },
  mend: {
    name: "Mend",
    shortName: "MEND",
    icon: "◇",
    cost: 36,
    kind: "heal",
    power: 24,
    color: 0x8dffc9,
    description: "Restore the most wounded construct.",
  },
  ward: {
    name: "Verdant Ward",
    shortName: "WARD",
    icon: "⬡",
    cost: 41,
    kind: "shield",
    power: 15,
    color: 0x78caff,
    description: "Give every living construct a shield.",
  },
  siphon: {
    name: "Siphon",
    shortName: "SIPHON",
    icon: "◉",
    cost: 29,
    kind: "drain",
    power: 18,
    color: 0xc58cff,
    description: "Damage a hostile and recover health.",
  },
  volley: {
    name: "Star Volley",
    shortName: "VOLLEY",
    icon: "⋰",
    cost: 39,
    kind: "volley",
    power: 13,
    color: 0xffef9c,
    description: "Strike up to three hostiles.",
  },
};

const dom = {
  app: document.querySelector("#app"),
  canvas: document.querySelector("#world"),
  timer: document.querySelector("#timer"),
  timeFill: document.querySelector("#time-fill"),
  eventMarker: document.querySelector("#event-marker"),
  nextEvent: document.querySelector("#next-event"),
  phaseLabel: document.querySelector("#phase-label"),
  threatLevel: document.querySelector("#threat-level"),
  threatArc: document.querySelector("#threat-arc"),
  enemyCount: document.querySelector("#enemy-count"),
  waveLabel: document.querySelector("#wave-label"),
  aliveCount: document.querySelector("#alive-count"),
  squadList: document.querySelector("#squad-list"),
  abilityDock: document.querySelector("#ability-dock"),
  combatFeed: document.querySelector("#combat-feed"),
  intro: document.querySelector("#intro"),
  begin: document.querySelector("#begin"),
  pause: document.querySelector("#pause"),
  help: document.querySelector("#help"),
  toggleUi: document.querySelector("#toggle-ui"),
  upgradeModal: document.querySelector("#upgrade-modal"),
  upgradeUnits: document.querySelector("#upgrade-units"),
  upgradeGrid: document.querySelector("#upgrade-grid"),
  reorderModal: document.querySelector("#reorder-modal"),
  reorderList: document.querySelector("#reorder-list"),
  saveOrder: document.querySelector("#save-order"),
  endModal: document.querySelector("#end-modal"),
  endKicker: document.querySelector("#end-kicker"),
  endTitle: document.querySelector("#end-title"),
  endCopy: document.querySelector("#end-copy"),
  endStats: document.querySelector("#end-stats"),
  restart: document.querySelector("#restart"),
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.ink);
scene.fog = new THREE.FogExp2(COLORS.fog, 0.024);

const camera = new THREE.PerspectiveCamera(41, window.innerWidth / window.innerHeight, 0.1, 130);
camera.position.set(0, 20.5, 18.5);
camera.lookAt(0, 0.3, 0);

const renderer = new THREE.WebGLRenderer({
  canvas: dom.canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.72, 0.42, 0.72);
composer.addPass(bloom);
composer.addPass(new OutputPass());

scene.add(new THREE.HemisphereLight(0x78a793, 0x020504, 1.5));

const keyLight = new THREE.DirectionalLight(0xb9ffe3, 3.1);
keyLight.position.set(-7, 18, 8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -20;
keyLight.shadow.camera.right = 20;
keyLight.shadow.camera.top = 20;
keyLight.shadow.camera.bottom = -20;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 50;
keyLight.shadow.bias = -0.0003;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xff805f, 1.5);
rimLight.position.set(12, 6, -10);
scene.add(rimLight);

const world = new THREE.Group();
scene.add(world);

const effects = [];
const animatedWorld = [];
let particleField;
let beaconCore;
let beaconCage;
let beaconHalo;

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function createArena() {
  const stoneMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.stone,
    metalness: 0.12,
    roughness: 0.92,
  });
  const edgeMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.stoneLight,
    metalness: 0.42,
    roughness: 0.58,
  });
  const runeMaterial = new THREE.MeshBasicMaterial({
    color: 0x3fb582,
    transparent: true,
    opacity: 0.46,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const lowerPlatform = new THREE.Mesh(new THREE.CylinderGeometry(15.6, 16.2, 1.05, 72), stoneMaterial);
  lowerPlatform.position.y = -0.9;
  lowerPlatform.receiveShadow = true;
  world.add(lowerPlatform);

  const arenaFloor = new THREE.Mesh(new THREE.CylinderGeometry(14.65, 15.25, 0.42, 72), stoneMaterial);
  arenaFloor.position.y = -0.22;
  arenaFloor.receiveShadow = true;
  world.add(arenaFloor);

  const edge = new THREE.Mesh(new THREE.TorusGeometry(14.92, 0.16, 8, 100), edgeMaterial);
  edge.rotation.x = Math.PI / 2;
  edge.position.y = 0.03;
  edge.castShadow = true;
  world.add(edge);

  for (const radius of [4.15, 8.7, 12.65]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.025, 4, 120), runeMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.015;
    world.add(ring);
  }

  const radialGeometry = new THREE.BoxGeometry(7.4, 0.012, 0.022);
  for (let index = 0; index < 20; index += 1) {
    const angle = (index / 20) * Math.PI * 2;
    const line = new THREE.Mesh(radialGeometry, runeMaterial);
    line.position.set(Math.cos(angle) * 8.35, 0.025, Math.sin(angle) * 8.35);
    line.rotation.y = -angle;
    world.add(line);
  }

  const brokenStoneMaterial = new THREE.MeshStandardMaterial({
    color: 0x17231f,
    metalness: 0.16,
    roughness: 0.95,
    flatShading: true,
  });
  const random = seededRandom(81527);
  for (let index = 0; index < 58; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 16.1 + random() * 11;
    const size = 0.18 + random() * 0.7;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), brokenStoneMaterial);
    rock.position.set(Math.cos(angle) * radius, -0.36 + random() * 0.3, Math.sin(angle) * radius);
    rock.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    rock.scale.y = 0.45 + random() * 1.5;
    rock.castShadow = true;
    rock.receiveShadow = true;
    world.add(rock);
  }

  for (let index = 0; index < 10; index += 1) {
    const angle = (index / 10) * Math.PI * 2 + 0.16;
    const height = 1.9 + random() * 2.2;
    const pillar = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.35, height, 5), brokenStoneMaterial);
    shaft.position.y = height / 2 - 0.22;
    shaft.castShadow = true;
    pillar.add(shaft);
    const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 0), edgeMaterial);
    cap.position.y = height - 0.05;
    pillar.add(cap);
    pillar.position.set(Math.cos(angle) * 15.8, -0.2, Math.sin(angle) * 15.8);
    pillar.rotation.y = -angle + random() * 0.2;
    pillar.rotation.z = (random() - 0.5) * 0.12;
    world.add(pillar);
  }

  createBeacon();
  createParticleField(random);
}

function createBeacon() {
  const pedestalMaterial = new THREE.MeshStandardMaterial({
    color: 0x182923,
    metalness: 0.68,
    roughness: 0.33,
  });
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: COLORS.brass,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  });
  const beacon = new THREE.Group();
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 0.8, 8), pedestalMaterial);
  pedestal.position.y = 0.38;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  beacon.add(pedestal);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.42, 1.5, 6), pedestalMaterial);
  stem.position.y = 1.22;
  stem.castShadow = true;
  beacon.add(stem);

  beaconCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.53, 2), glowMaterial);
  beaconCore.position.y = 2.1;
  beacon.add(beaconCore);

  beaconCage = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.92, 1),
    new THREE.MeshStandardMaterial({
      color: 0xecd09a,
      emissive: 0x593b16,
      emissiveIntensity: 1.4,
      metalness: 0.8,
      roughness: 0.2,
      wireframe: true,
    }),
  );
  beaconCage.position.y = 2.1;
  beacon.add(beaconCage);

  beaconHalo = new THREE.Mesh(new THREE.TorusGeometry(1.13, 0.035, 5, 56), glowMaterial);
  beaconHalo.rotation.x = Math.PI / 2;
  beaconHalo.position.y = 2.1;
  beacon.add(beaconHalo);

  const beaconLight = new THREE.PointLight(COLORS.brass, 22, 13, 2);
  beaconLight.position.y = 2.2;
  beacon.add(beaconLight);
  world.add(beacon);
  animatedWorld.push(beacon);
}

function createParticleField(random) {
  const count = 220;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const mint = new THREE.Color(COLORS.mint);
  const brass = new THREE.Color(COLORS.brass);
  for (let index = 0; index < count; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 2 + random() * 26;
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = 0.25 + random() * 10;
    positions[index * 3 + 2] = Math.sin(angle) * radius;
    const color = random() > 0.7 ? brass : mint;
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  particleField = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.055,
      vertexColors: true,
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  scene.add(particleField);
}

createArena();

const state = {
  running: false,
  paused: false,
  ended: false,
  elapsed: 0,
  duration: 20 * 60,
  speed: 1,
  units: [],
  enemies: [],
  selectedUnit: null,
  nextEnemyAt: 5,
  upgradeTimes: [45, 115, 190, 270, 355, 445, 540, 640, 745, 855, 970, 1090],
  reinforcementTimes: [78, 255, 485, 740],
  upgradeIndex: 0,
  reinforcementIndex: 0,
  kills: 0,
  damageDealt: 0,
  blessings: 0,
  selectedUpgradeUnit: null,
  upgradeOptions: [],
  reorderUnit: null,
  uiAccumulator: 0,
  lastSpawnWasElite: false,
};

function pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function shuffle(array) {
  const result = [...array];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function toHex(color) {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function livingUnits() {
  return state.units.filter((unit) => unit.alive);
}

function livingEnemies() {
  return state.enemies.filter((enemy) => enemy.alive);
}

function addFeed(message, danger = false) {
  const entry = document.createElement("div");
  entry.className = `feed-entry${danger ? " danger" : ""}`;
  entry.innerHTML = message;
  dom.combatFeed.prepend(entry);
  while (dom.combatFeed.children.length > 6) {
    dom.combatFeed.lastElementChild.remove();
  }
}

function createUnitVisual(unit, index) {
  const group = new THREE.Group();
  group.userData.baseY = 0;
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x1c2b27,
    metalness: 0.86,
    roughness: 0.28,
  });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: 0x6d725e,
    metalness: 0.92,
    roughness: 0.22,
  });
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: unit.color,
    transparent: true,
    opacity: 0.94,
    blending: THREE.AdditiveBlending,
  });

  let bodyGeometry;
  if (unit.chassis === 0) bodyGeometry = new THREE.CylinderGeometry(0.46, 0.62, 1.18, 6);
  if (unit.chassis === 1) bodyGeometry = new THREE.OctahedronGeometry(0.7, 0);
  if (unit.chassis === 2) bodyGeometry = new THREE.BoxGeometry(0.92, 1.08, 0.76, 1, 1, 1);
  const body = new THREE.Mesh(bodyGeometry, darkMaterial);
  body.position.y = 0.92;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const shoulderGeometry = unit.chassis === 2
    ? new THREE.BoxGeometry(0.34, 0.3, 0.4)
    : new THREE.ConeGeometry(0.26, 0.52, 5);
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(shoulderGeometry, trimMaterial);
    shoulder.position.set(side * 0.68, 1.1, 0);
    shoulder.rotation.z = side * -0.42;
    shoulder.castShadow = true;
    group.add(shoulder);
  }

  const head = new THREE.Mesh(
    unit.chassis === 1 ? new THREE.TetrahedronGeometry(0.37, 0) : new THREE.CylinderGeometry(0.3, 0.38, 0.48, unit.chassis === 2 ? 4 : 6),
    darkMaterial,
  );
  head.position.y = 1.72;
  head.castShadow = true;
  group.add(head);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.07, 0.05), glowMaterial);
  visor.position.set(0, 1.75, 0.34);
  group.add(visor);

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), glowMaterial);
  core.position.set(0, 1.02, 0.51);
  group.add(core);

  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.67, 0.025, 5, 32), glowMaterial);
  halo.position.y = 2.08;
  halo.rotation.x = Math.PI / 2;
  group.add(halo);

  const selectionRing = new THREE.Mesh(
    new THREE.RingGeometry(0.88, 0.94, 42),
    new THREE.MeshBasicMaterial({
      color: unit.color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.36,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.position.y = 0.04;
  selectionRing.visible = false;
  group.add(selectionRing);

  const light = new THREE.PointLight(unit.color, 3.8, 4.4, 2);
  light.position.y = 1.35;
  group.add(light);

  const angle = index * 2.399 + 0.35;
  const radius = 3.2 + Math.floor(index / 5) * 1.45;
  group.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  group.scale.setScalar(1.08);
  group.userData = { halo, core, selectionRing, body, phase: Math.random() * Math.PI * 2 };
  world.add(group);
  return group;
}

function generateUnit() {
  const index = state.units.length;
  const chassis = Math.floor(Math.random() * 3);
  const color = UNIT_COLORS[index % UNIT_COLORS.length];
  const roleAbility = pick(["lance", "nova", "mend", "ward", "siphon", "volley"]);
  const abilities = ["bolt", roleAbility];
  if (Math.random() > 0.57) {
    const third = pick(Object.keys(ABILITIES).filter((ability) => !abilities.includes(ability)));
    abilities.push(third);
  }
  const chassisHealth = [108, 94, 132][chassis];
  const chassisRegen = [14.5, 16.2, 12.7][chassis];
  const unit = {
    id: crypto.randomUUID(),
    name: pick(UNIT_NAMES.filter((name) => !state.units.some((existing) => existing.name === name))),
    title: pick(UNIT_TITLES),
    chassis,
    chassisName: CHASSIS_NAMES[chassis],
    color,
    maxHp: chassisHealth + Math.floor(Math.random() * 31),
    hp: 0,
    maxAp: 92 + Math.floor(Math.random() * 23),
    ap: 27 + Math.random() * 28,
    regen: chassisRegen + Math.random() * 2.8,
    damageMultiplier: 0.92 + Math.random() * 0.19,
    armor: chassis === 2 ? 0.08 : 0,
    shield: 0,
    abilities,
    currentAbility: 0,
    cooldown: 0.4 + Math.random() * 0.35,
    alive: true,
    level: 1,
    blessings: [],
    group: null,
  };
  unit.hp = unit.maxHp;
  unit.group = createUnitVisual(unit, index);
  state.units.push(unit);
  if (!state.selectedUnit || !state.selectedUnit.alive) state.selectedUnit = unit;
  addFeed(`<strong>${unit.name}</strong> · ${unit.title} joins the vigil`);
  renderSquad();
  renderAbilityDock();
  return unit;
}

function createEnemyVisual(elite, color) {
  const group = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: elite ? 0x3b1721 : 0x17211e,
    emissive: elite ? 0x4e0715 : 0x180806,
    emissiveIntensity: elite ? 2 : 0.8,
    metalness: 0.48,
    roughness: 0.6,
    flatShading: true,
  });
  const glowMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
  });

  const cloak = new THREE.Mesh(
    elite ? new THREE.DodecahedronGeometry(0.76, 0) : new THREE.ConeGeometry(0.58, 1.45, 5),
    bodyMaterial,
  );
  cloak.position.y = elite ? 0.93 : 0.72;
  cloak.castShadow = true;
  group.add(cloak);

  const head = new THREE.Mesh(new THREE.OctahedronGeometry(elite ? 0.37 : 0.27, 0), bodyMaterial);
  head.position.y = elite ? 1.78 : 1.5;
  group.add(head);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 5), glowMaterial);
    eye.position.set(side * 0.09, elite ? 1.82 : 1.53, 0.26);
    group.add(eye);
  }

  const aura = new THREE.Mesh(new THREE.TorusGeometry(elite ? 0.75 : 0.47, 0.025, 5, 28), glowMaterial);
  aura.rotation.x = Math.PI / 2;
  aura.position.y = 0.08;
  group.add(aura);

  if (elite) {
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.035, 5, 6), glowMaterial);
    crown.position.y = 2.15;
    crown.rotation.x = Math.PI / 2;
    group.add(crown);
    group.userData.crown = crown;
  }

  const light = new THREE.PointLight(color, elite ? 4.5 : 1.6, elite ? 4.5 : 3.1, 2);
  light.position.y = 1.1;
  group.add(light);
  group.userData.aura = aura;
  group.userData.cloak = cloak;
  group.userData.phase = Math.random() * Math.PI * 2;
  return group;
}

function spawnEnemy(forceElite = false) {
  const progress = state.elapsed / state.duration;
  const eliteChance = 0.04 + progress * 0.22;
  const elite = forceElite || Math.random() < eliteChance;
  const color = elite ? 0xff4f68 : 0xff7b5f;
  const angle = Math.random() * Math.PI * 2;
  const radius = 14.1 + Math.random() * 0.55;
  const strength = 1 + Math.pow(progress, 1.22) * 2.8;
  const maxHp = (elite ? 63 : 25) * strength * (0.88 + Math.random() * 0.24);
  const group = createEnemyVisual(elite, color);
  group.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  group.rotation.y = -angle - Math.PI / 2;
  group.scale.setScalar(elite ? 1.2 : 1.02 + Math.random() * 0.12);
  world.add(group);
  state.enemies.push({
    id: crypto.randomUUID(),
    elite,
    maxHp,
    hp: maxHp,
    damage: (elite ? 6.6 : 3.15) * (1 + Math.pow(progress, 1.18) * 1.9),
    speed: (elite ? 0.62 : 0.83) + Math.random() * 0.18 + progress * 0.08,
    cooldown: 0.4 + Math.random() * 0.7,
    alive: true,
    group,
  });
  if (elite && !state.lastSpawnWasElite) addFeed("A <strong>VEILBORN ELITE</strong> crosses the outer ring", true);
  state.lastSpawnWasElite = elite;
}

function nearestEntity(position, entities) {
  let nearest = null;
  let nearestDistance = Infinity;
  for (const entity of entities) {
    if (!entity.alive) continue;
    const distance = position.distanceToSquared(entity.group.position);
    if (distance < nearestDistance) {
      nearest = entity;
      nearestDistance = distance;
    }
  }
  return nearest;
}

function createRing(position, color, size = 2.5, life = 0.55) {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(0.38, 0.45, 40),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  mesh.position.copy(position);
  mesh.position.y = 0.07;
  mesh.rotation.x = -Math.PI / 2;
  world.add(mesh);
  effects.push({ mesh, life, maxLife: life, kind: "ring", size });
}

function createBeam(from, to, color, width = 0.042) {
  const direction = to.clone().sub(from);
  const length = direction.length();
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(width, width * 1.7, length, 6),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  world.add(mesh);
  effects.push({ mesh, life: 0.19, maxLife: 0.19, kind: "beam", size: 1 });
}

function createBurst(position, color, amount = 8) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
  });
  const shards = [];
  for (let index = 0; index < amount; index += 1) {
    const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.055 + Math.random() * 0.05, 0), material.clone());
    shard.position.copy(position);
    const velocity = new THREE.Vector3(Math.random() - 0.5, 0.25 + Math.random() * 0.75, Math.random() - 0.5)
      .normalize()
      .multiplyScalar(1.6 + Math.random() * 2.5);
    shard.userData.velocity = velocity;
    group.add(shard);
    shards.push(shard);
  }
  world.add(group);
  effects.push({ mesh: group, life: 0.5, maxLife: 0.5, kind: "burst", size: 1, shards });
}

function applyDamage(enemy, amount, color) {
  if (!enemy?.alive) return;
  enemy.hp -= amount;
  state.damageDealt += amount;
  createBurst(enemy.group.position.clone().add(new THREE.Vector3(0, 0.8, 0)), color, enemy.elite ? 11 : 6);
}

function executeAbility(unit) {
  const abilityId = unit.abilities[unit.currentAbility];
  const ability = ABILITIES[abilityId];
  if (!ability || unit.ap < ability.cost) return false;

  const enemies = livingEnemies();
  const allies = livingUnits();
  if ((ability.kind === "attack" || ability.kind === "drain" || ability.kind === "volley") && enemies.length === 0) return false;

  unit.ap -= ability.cost;
  unit.cooldown = 0.52;
  unit.currentAbility = (unit.currentAbility + 1) % unit.abilities.length;
  const origin = unit.group.position.clone().add(new THREE.Vector3(0, 1.15, 0));

  if (ability.kind === "attack" || ability.kind === "drain") {
    const target = nearestEntity(unit.group.position, enemies);
    if (target) {
      const damage = ability.power * unit.damageMultiplier;
      applyDamage(target, damage, ability.color);
      createBeam(origin, target.group.position.clone().add(new THREE.Vector3(0, 0.85, 0)), ability.color, abilityId === "lance" ? 0.075 : 0.045);
      if (ability.kind === "drain") unit.hp = Math.min(unit.maxHp, unit.hp + damage * 0.42);
    }
  } else if (ability.kind === "aoe") {
    createRing(unit.group.position, ability.color, 7.2, 0.7);
    for (const enemy of enemies) {
      if (enemy.group.position.distanceTo(unit.group.position) < 7.5) {
        applyDamage(enemy, ability.power * unit.damageMultiplier, ability.color);
      }
    }
  } else if (ability.kind === "heal") {
    const target = [...allies].sort((left, right) => left.hp / left.maxHp - right.hp / right.maxHp)[0];
    if (target) {
      target.hp = Math.min(target.maxHp, target.hp + ability.power * (0.92 + unit.damageMultiplier * 0.08));
      createRing(target.group.position, ability.color, 1.8, 0.5);
      createBeam(origin, target.group.position.clone().add(new THREE.Vector3(0, 1, 0)), ability.color, 0.025);
    }
  } else if (ability.kind === "shield") {
    for (const ally of allies) {
      ally.shield = Math.min(ally.maxHp * 0.7, ally.shield + ability.power);
      createRing(ally.group.position, ability.color, 1.25, 0.45);
    }
  } else if (ability.kind === "volley") {
    const targets = [...enemies]
      .sort((left, right) => unit.group.position.distanceToSquared(left.group.position) - unit.group.position.distanceToSquared(right.group.position))
      .slice(0, 3);
    targets.forEach((target, index) => {
      const damage = ability.power * unit.damageMultiplier;
      applyDamage(target, damage, ability.color);
      createBeam(origin.clone().add(new THREE.Vector3((index - 1) * 0.1, 0, 0)), target.group.position.clone().add(new THREE.Vector3(0, 0.8, 0)), ability.color, 0.033);
    });
  }

  unit.group.userData.core.scale.setScalar(1.8);
  renderAbilityDock();
  return true;
}

function killEnemy(enemy) {
  if (!enemy.alive) return;
  enemy.alive = false;
  state.kills += 1;
  createRing(enemy.group.position, enemy.elite ? 0xff4f68 : 0xff8b62, enemy.elite ? 3.4 : 1.7, 0.72);
  createBurst(enemy.group.position.clone().add(new THREE.Vector3(0, 0.9, 0)), enemy.elite ? 0xff4f68 : 0xff8b62, enemy.elite ? 18 : 9);
  world.remove(enemy.group);
  if (enemy.elite) addFeed("A <strong>VEILBORN ELITE</strong> is unmade");
}

function killUnit(unit) {
  if (!unit.alive) return;
  unit.alive = false;
  unit.hp = 0;
  unit.group.visible = false;
  createRing(unit.group.position, unit.color, 3, 1.2);
  addFeed(`<strong>${unit.name}</strong> has fallen`, true);
  if (state.selectedUnit === unit) state.selectedUnit = livingUnits()[0] ?? unit;
  renderSquad();
  renderAbilityDock();
}

function updateUnit(unit, delta) {
  if (!unit.alive) return;
  unit.ap = Math.min(unit.maxAp, unit.ap + unit.regen * delta);
  unit.cooldown -= delta;
  if (unit.cooldown <= 0 && livingEnemies().length > 0) executeAbility(unit);

  const phase = state.elapsed * 2.2 + unit.group.userData.phase;
  unit.group.position.y = Math.sin(phase) * 0.055;
  unit.group.userData.halo.rotation.z += delta * 0.8;
  unit.group.userData.core.rotation.y += delta * 2.4;
  unit.group.userData.core.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, delta * 7));
  unit.group.userData.selectionRing.visible = state.selectedUnit === unit;

  const target = nearestEntity(unit.group.position, livingEnemies());
  if (target) {
    const direction = target.group.position.clone().sub(unit.group.position);
    unit.group.rotation.y = Math.atan2(direction.x, direction.z);
  } else {
    unit.group.rotation.y += delta * 0.22;
  }
}

function updateEnemy(enemy, delta) {
  if (!enemy.alive) return;
  if (enemy.hp <= 0) {
    killEnemy(enemy);
    return;
  }
  const allies = livingUnits();
  const target = nearestEntity(enemy.group.position, allies);
  if (!target) return;
  const direction = target.group.position.clone().sub(enemy.group.position);
  const distance = direction.length();
  enemy.group.rotation.y = Math.atan2(direction.x, direction.z);
  enemy.group.position.y = Math.sin(state.elapsed * 3 + enemy.group.userData.phase) * 0.07;
  enemy.group.userData.aura.rotation.z += delta * (enemy.elite ? 2 : 1.1);
  if (enemy.group.userData.crown) enemy.group.userData.crown.rotation.z -= delta * 1.4;

  if (distance > 1.38) {
    enemy.group.position.addScaledVector(direction.normalize(), enemy.speed * delta);
    enemy.group.userData.cloak.rotation.z = Math.sin(state.elapsed * 5 + enemy.group.userData.phase) * 0.05;
    return;
  }

  enemy.cooldown -= delta;
  if (enemy.cooldown > 0) return;
  let incomingDamage = enemy.damage;
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, incomingDamage);
    target.shield -= absorbed;
    incomingDamage -= absorbed;
    createRing(target.group.position, COLORS.blue, 1.1, 0.26);
  }
  const damage = Math.max(0.8, incomingDamage * (1 - target.armor));
  target.hp -= damage;
  enemy.cooldown = enemy.elite ? 1.45 : 1.3;
  createBeam(
    enemy.group.position.clone().add(new THREE.Vector3(0, 0.8, 0)),
    target.group.position.clone().add(new THREE.Vector3(0, 0.9, 0)),
    enemy.elite ? 0xff3957 : 0xff765e,
    enemy.elite ? 0.065 : 0.035,
  );
  if (target.hp <= 0) killUnit(target);
}

function updateEffects(delta) {
  for (const effect of effects) {
    effect.life -= delta;
    const ratio = Math.max(0, effect.life / effect.maxLife);
    if (effect.kind === "ring") {
      const scale = 1 + (1 - ratio) * effect.size;
      effect.mesh.scale.setScalar(scale);
      effect.mesh.material.opacity = ratio * 0.9;
    } else if (effect.kind === "beam") {
      effect.mesh.material.opacity = ratio;
      effect.mesh.scale.x = effect.mesh.scale.z = 0.8 + ratio * 0.4;
    } else if (effect.kind === "burst") {
      for (const shard of effect.shards) {
        shard.position.addScaledVector(shard.userData.velocity, delta);
        shard.userData.velocity.y -= delta * 2.4;
        shard.material.opacity = ratio;
        shard.rotation.x += delta * 4;
      }
    }
  }
  for (let index = effects.length - 1; index >= 0; index -= 1) {
    if (effects[index].life <= 0) {
      world.remove(effects[index].mesh);
      effects.splice(index, 1);
    }
  }
}

function getThreatLevel() {
  return Math.min(7, 1 + Math.floor(state.elapsed / 180));
}

function spawnWave() {
  const progress = state.elapsed / state.duration;
  const batch = Math.min(3, 1 + Math.floor(state.elapsed / 420));
  const currentEnemies = livingEnemies().length;
  if (currentEnemies < 60) {
    for (let index = 0; index < batch; index += 1) spawnEnemy(false);
  }
  const interval = Math.max(2.8, 7.2 - progress * 4.4);
  state.nextEnemyAt += interval;
}

function nextScheduledEvent() {
  const upgradeAt = state.upgradeTimes[state.upgradeIndex] ?? Infinity;
  const reinforcementAt = state.reinforcementTimes[state.reinforcementIndex] ?? Infinity;
  if (upgradeAt <= reinforcementAt) return { at: upgradeAt, label: "BLESSING" };
  return { at: reinforcementAt, label: "REINFORCEMENT" };
}

function updateSimulation(delta) {
  state.elapsed += delta;
  if (state.elapsed >= state.duration) {
    endGame(true);
    return;
  }
  if (livingUnits().length === 0) {
    endGame(false);
    return;
  }

  while (state.elapsed >= state.nextEnemyAt) spawnWave();

  const nextUpgrade = state.upgradeTimes[state.upgradeIndex];
  if (nextUpgrade !== undefined && state.elapsed >= nextUpgrade) {
    state.upgradeIndex += 1;
    openUpgrade();
    return;
  }

  const nextReinforcement = state.reinforcementTimes[state.reinforcementIndex];
  if (nextReinforcement !== undefined && state.elapsed >= nextReinforcement) {
    state.reinforcementIndex += 1;
    generateUnit();
    addFeed("The lantern has bound a <strong>NEW CONSTRUCT</strong>");
  }

  for (const unit of livingUnits()) updateUnit(unit, delta);
  for (const enemy of [...state.enemies]) updateEnemy(enemy, delta);
  state.enemies = state.enemies.filter((enemy) => enemy.alive);

  state.uiAccumulator += delta;
  if (state.uiAccumulator >= 0.12) {
    state.uiAccumulator = 0;
    renderHud();
  }
}

const UPGRADE_LIBRARY = [
  {
    title: "Deep Reservoir",
    icon: "◒",
    description: "Carve a wider chamber for action power, then fill it immediately.",
    stat: "+35 MAX AP",
    apply: (unit) => { unit.maxAp += 35; unit.ap = unit.maxAp; },
  },
  {
    title: "Quickened Blood",
    icon: "⌁",
    description: "The core cycles faster between every invocation in the ritual.",
    stat: "+28% AP REGEN",
    apply: (unit) => { unit.regen *= 1.28; },
  },
  {
    title: "Adamant Shell",
    icon: "⬡",
    description: "The vessel becomes more difficult for the dark to unmake.",
    stat: "+42 MAX HEALTH",
    apply: (unit) => { unit.maxHp += 42; unit.hp += 42; },
  },
  {
    title: "Etched Violence",
    icon: "†",
    description: "Every damaging invocation is rewritten with a sharper ending.",
    stat: "+24% DAMAGE",
    apply: (unit) => { unit.damageMultiplier *= 1.24; },
  },
  {
    title: "Brazen Skin",
    icon: "▰",
    description: "Layer the chassis in a brass memory of something stronger.",
    stat: "+11% ARMOR",
    apply: (unit) => { unit.armor = Math.min(0.55, unit.armor + 0.11); },
  },
  {
    title: "A New Verse",
    icon: "≋",
    description: "Add a new random ability to the end of this ritual sequence.",
    stat: "+1 ABILITY",
    apply: (unit) => {
      const available = Object.keys(ABILITIES).filter((ability) => !unit.abilities.includes(ability));
      if (available.length) unit.abilities.push(pick(available));
      else unit.damageMultiplier *= 1.18;
    },
  },
  {
    title: "Mercy Engine",
    icon: "◇",
    description: "Repair the vessel now and expand its tolerance for ruin.",
    stat: "FULL HEAL · +18 HP",
    apply: (unit) => { unit.maxHp += 18; unit.hp = unit.maxHp; },
  },
  {
    title: "First Spark",
    icon: "✦",
    description: "Begin each future invocation cycle with power already gathered.",
    stat: "+22 AP NOW · +10 MAX",
    apply: (unit) => { unit.maxAp += 10; unit.ap = Math.min(unit.maxAp, unit.ap + 22); },
  },
];

function openUpgrade() {
  const alive = livingUnits();
  if (!alive.length || state.ended) return;
  state.paused = true;
  state.selectedUpgradeUnit = alive.includes(state.selectedUnit) ? state.selectedUnit : alive[0];
  state.upgradeOptions = shuffle(UPGRADE_LIBRARY).slice(0, 3);
  renderUpgradeModal();
  dom.upgradeModal.classList.add("open");
  addFeed("The lantern offers a <strong>BLESSING</strong>");
}

function renderUpgradeModal() {
  dom.upgradeUnits.innerHTML = livingUnits().map((unit) => `
    <button class="upgrade-unit${unit === state.selectedUpgradeUnit ? " active" : ""}" data-unit-id="${unit.id}">
      ${unit.name.toUpperCase()} · ${unit.title.toUpperCase()}
    </button>
  `).join("");
  dom.upgradeGrid.innerHTML = state.upgradeOptions.map((upgrade, index) => `
    <button class="upgrade-card" data-upgrade-index="${index}" data-roman="${["I", "II", "III"][index]}">
      <span class="upgrade-card__icon">${upgrade.icon}</span>
      <h3>${upgrade.title}</h3>
      <p>${upgrade.description}</p>
      <small>${upgrade.stat}</small>
    </button>
  `).join("");

  dom.upgradeUnits.querySelectorAll("[data-unit-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedUpgradeUnit = state.units.find((unit) => unit.id === button.dataset.unitId);
      renderUpgradeModal();
    });
  });
  dom.upgradeGrid.querySelectorAll("[data-upgrade-index]").forEach((button) => {
    button.addEventListener("click", () => applyUpgrade(Number(button.dataset.upgradeIndex)));
  });
}

function applyUpgrade(index) {
  const upgrade = state.upgradeOptions[index];
  const unit = state.selectedUpgradeUnit;
  if (!upgrade || !unit?.alive) return;
  upgrade.apply(unit);
  unit.level += 1;
  unit.blessings.push(upgrade.title);
  state.blessings += 1;
  state.selectedUnit = unit;
  addFeed(`<strong>${unit.name}</strong> receives ${upgrade.title}`);
  dom.upgradeModal.classList.remove("open");
  renderSquad();
  renderAbilityDock();
  openReorder(unit);
}

function openReorder(unit) {
  if (!unit) return;
  state.paused = true;
  state.reorderUnit = unit;
  renderReorderModal();
  dom.reorderModal.classList.add("open");
}

function moveAbility(fromIndex, toIndex) {
  const abilities = state.reorderUnit.abilities;
  if (toIndex < 0 || toIndex >= abilities.length) return;
  const [ability] = abilities.splice(fromIndex, 1);
  abilities.splice(toIndex, 0, ability);
  state.reorderUnit.currentAbility = Math.min(state.reorderUnit.currentAbility, abilities.length - 1);
  renderReorderModal();
}

function renderReorderModal() {
  if (!state.reorderUnit) return;
  dom.reorderList.innerHTML = state.reorderUnit.abilities.map((abilityId, index) => {
    const ability = ABILITIES[abilityId];
    return `
      <div class="reorder-row">
        <span class="reorder-row__number">${index + 1}</span>
        <span class="reorder-row__icon" style="color:${toHex(ability.color)}">${ability.icon}</span>
        <strong>${ability.name}</strong>
        <small>${ability.cost} AP</small>
        <span class="reorder-row__buttons">
          <button data-move-from="${index}" data-move-to="${index - 1}" ${index === 0 ? "disabled" : ""} aria-label="Move ${ability.name} earlier">↑</button>
          <button data-move-from="${index}" data-move-to="${index + 1}" ${index === state.reorderUnit.abilities.length - 1 ? "disabled" : ""} aria-label="Move ${ability.name} later">↓</button>
        </span>
      </div>
    `;
  }).join("");
  dom.reorderList.querySelectorAll("[data-move-from]").forEach((button) => {
    button.addEventListener("click", () => moveAbility(Number(button.dataset.moveFrom), Number(button.dataset.moveTo)));
  });
}

function closeReorder() {
  dom.reorderModal.classList.remove("open");
  state.reorderUnit = null;
  state.paused = false;
  dom.pause.textContent = "Ⅱ";
  renderAbilityDock();
}

function renderSquad() {
  dom.squadList.innerHTML = state.units.map((unit) => {
    const healthPercent = Math.max(0, unit.hp / unit.maxHp) * 100;
    const apPercent = Math.max(0, unit.ap / unit.maxAp) * 100;
    const health = Math.ceil(Math.max(0, unit.hp));
    const shield = unit.shield > 0 ? `${health}<span class="unit-shield">+${Math.ceil(unit.shield)}</span>` : health;
    return `
      <article class="unit-card${unit === state.selectedUnit ? " selected" : ""}${unit.alive ? "" : " dead"}" data-unit-id="${unit.id}" style="--unit:${toHex(unit.color)}">
        <span class="unit-glyph">${unit.name.slice(0, 2).toUpperCase()}</span>
        <div class="unit-heading"><strong>${unit.name}</strong><small>LV ${unit.level} · ${unit.title}</small></div>
        <div class="unit-bars hp"><span>HP</span><div class="bar"><i style="width:${healthPercent}%"></i></div><b>${shield}</b></div>
        <div class="unit-bars"><span>AP</span><div class="bar"><i style="width:${apPercent}%"></i></div><b>${Math.floor(unit.ap)}</b></div>
      </article>
    `;
  }).join("");
  dom.squadList.querySelectorAll("[data-unit-id]").forEach((card) => {
    card.addEventListener("click", () => {
      const unit = state.units.find((candidate) => candidate.id === card.dataset.unitId);
      if (!unit) return;
      state.selectedUnit = unit;
      renderSquad();
      renderAbilityDock();
    });
  });
  const alive = livingUnits().length;
  dom.aliveCount.textContent = `${alive} SOUL${alive === 1 ? "" : "S"} BOUND`;
}

function renderAbilityDock() {
  const unit = state.selectedUnit;
  if (!unit) {
    dom.abilityDock.innerHTML = "<small>NO CONSTRUCT REMAINS</small>";
    return;
  }
  dom.abilityDock.innerHTML = `
    <div class="ability-owner"><strong>${unit.name.toUpperCase()}</strong><small>${unit.chassisName} · LV ${unit.level}</small></div>
    ${unit.abilities.map((abilityId, index) => {
      const ability = ABILITIES[abilityId];
      const current = index === unit.currentAbility;
      const waiting = current && unit.ap < ability.cost;
      return `
        ${index > 0 ? "<span class=\"ability-step\">›</span>" : ""}
        <article class="ability${current ? " current" : ""}${waiting ? " waiting" : ""}" style="--ability-color:${toHex(ability.color)}" title="${ability.description}">
          <span class="ability__icon">${ability.icon}</span>
          <strong>${ability.shortName}</strong>
          <small>${waiting ? `WAIT ${Math.ceil(ability.cost - unit.ap)}` : `${ability.cost} AP`}</small>
        </article>
      `;
    }).join("")}
    <button class="reorder-trigger" aria-label="Reorder ${unit.name}'s abilities" title="Reorder abilities">↕</button>
  `;
  dom.abilityDock.querySelector(".reorder-trigger")?.addEventListener("click", () => openReorder(unit));
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function romanThreat(level) {
  return ["I", "II", "III", "IV", "V", "VI", "VII"][level - 1] ?? "Ω";
}

function renderHud() {
  const remaining = state.duration - state.elapsed;
  const progress = Math.min(1, state.elapsed / state.duration);
  const threat = getThreatLevel();
  const enemies = livingEnemies().length;
  const event = nextScheduledEvent();
  const eventDelay = event.at - state.elapsed;

  dom.timer.textContent = formatTime(remaining);
  dom.timeFill.style.width = `${progress * 100}%`;
  dom.phaseLabel.textContent = `THREAT ${romanThreat(threat)}`;
  dom.threatLevel.textContent = romanThreat(threat);
  dom.threatArc.style.strokeDashoffset = String(270 - Math.min(252, threat * 34));
  dom.enemyCount.textContent = `${enemies} HOSTILE${enemies === 1 ? "" : "S"}`;
  dom.waveLabel.textContent = enemies > 35
    ? "THE VEIL IS BREAKING"
    : enemies > 12
      ? "PRESSURE AT THE INNER RING"
      : enemies > 0
        ? "CONTACT AT THE OUTER RING"
        : "THE MIST IS STIRRING";

  if (Number.isFinite(event.at)) {
    dom.nextEvent.textContent = `${event.label} · ${formatTime(eventDelay)}`;
    dom.eventMarker.style.display = "block";
    dom.eventMarker.style.left = `${Math.min(100, (event.at / state.duration) * 100)}%`;
  } else {
    dom.nextEvent.textContent = "NO MORE MERCY IS EXPECTED";
    dom.eventMarker.style.display = "none";
  }
  renderSquad();
}

function endGame(victory) {
  if (state.ended) return;
  state.ended = true;
  state.paused = true;
  dom.endKicker.textContent = victory ? "THE DAWN REMEMBERS" : "THE LANTERN IS DARK";
  dom.endTitle.textContent = victory ? "The vigil holds." : "All is quiet.";
  dom.endCopy.textContent = victory
    ? `${livingUnits().length} constructs endured the full twenty minutes. Whatever waited in the dark will have to wait longer.`
    : `The company endured ${Math.floor(state.elapsed / 60)} minutes and ${Math.floor(state.elapsed % 60)} seconds. The dark is patient. It usually is.`;
  dom.endStats.innerHTML = `
    <article><strong>${state.kills}</strong><small>HOSTILES UNMADE</small></article>
    <article><strong>${state.blessings}</strong><small>BLESSINGS BOUND</small></article>
    <article><strong>${livingUnits().length}</strong><small>SOULS REMAINING</small></article>
  `;
  dom.endModal.classList.add("open");
}

function setSpeed(speed) {
  state.speed = speed;
  document.querySelectorAll(".speed").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.speed) === speed);
  });
}

dom.begin.addEventListener("click", () => {
  dom.intro.classList.remove("open");
  if (!state.running) {
    state.running = true;
    addFeed("The first bell is struck");
  }
  state.paused = false;
  dom.pause.textContent = "Ⅱ";
});

dom.pause.addEventListener("click", () => {
  if (!state.running || state.ended) return;
  state.paused = !state.paused;
  dom.pause.textContent = state.paused ? "▶" : "Ⅱ";
});

document.querySelectorAll(".speed").forEach((button) => {
  button.addEventListener("click", () => setSpeed(Number(button.dataset.speed)));
});

dom.help.addEventListener("click", () => {
  state.paused = state.running;
  dom.intro.classList.add("open");
  dom.begin.innerHTML = state.running ? "RETURN TO THE VIGIL <span>→</span>" : "BEGIN THE VIGIL <span>→</span>";
});

dom.toggleUi.addEventListener("click", () => {
  dom.app.classList.toggle("ui-hidden");
  dom.toggleUi.textContent = dom.app.classList.contains("ui-hidden") ? "◉" : "⌁";
  dom.toggleUi.setAttribute("aria-label", dom.app.classList.contains("ui-hidden") ? "Show interface" : "Hide interface");
});

dom.saveOrder.addEventListener("click", closeReorder);
dom.restart.addEventListener("click", () => window.location.reload());

window.addEventListener("keydown", (event) => {
  if (event.code === "Space" && state.running && !state.ended && !dom.upgradeModal.classList.contains("open") && !dom.reorderModal.classList.contains("open")) {
    event.preventDefault();
    state.paused = !state.paused;
    dom.pause.textContent = state.paused ? "▶" : "Ⅱ";
  }
  if (["Digit1", "Digit2", "Digit3"].includes(event.code)) {
    setSpeed({ Digit1: 1, Digit2: 4, Digit3: 12 }[event.code]);
  }
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloom.resolution.set(window.innerWidth, window.innerHeight);
});

generateUnit();
renderHud();
renderAbilityDock();

let previousTime = performance.now();

function animate(time) {
  requestAnimationFrame(animate);
  const realDelta = Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;

  if (state.running && !state.paused && !state.ended) {
    let remainingDelta = realDelta * state.speed;
    while (remainingDelta > 0) {
      const step = Math.min(remainingDelta, 0.055);
      updateSimulation(step);
      remainingDelta -= step;
      if (state.paused || state.ended) break;
    }
  }

  const effectDelta = realDelta * (state.running && !state.paused ? Math.min(state.speed, 4) : 0.35);
  updateEffects(effectDelta);

  const visualTime = time * 0.001;
  beaconCore.rotation.y += realDelta * 1.3;
  beaconCore.rotation.x += realDelta * 0.5;
  beaconCore.scale.setScalar(1 + Math.sin(visualTime * 2.7) * 0.06);
  beaconCage.rotation.y -= realDelta * 0.28;
  beaconCage.rotation.x = Math.sin(visualTime * 0.5) * 0.12;
  beaconHalo.rotation.z += realDelta * 0.35;
  particleField.rotation.y += realDelta * 0.008;
  particleField.position.y = Math.sin(visualTime * 0.17) * 0.2;

  const cameraDrift = state.running ? 1 : 0.35;
  camera.position.x = Math.sin(visualTime * 0.095) * cameraDrift;
  camera.lookAt(0, 0.25, 0);
  composer.render();
}

requestAnimationFrame(animate);

window.__LAST_LANTERN__ = {
  state,
  openUpgrade,
  generateUnit,
  spawnEnemy,
  endGame,
  snapshot: () => ({
    running: state.running,
    paused: state.paused,
    ended: state.ended,
    elapsed: state.elapsed,
    speed: state.speed,
    units: state.units.map((unit) => ({
      name: unit.name,
      alive: unit.alive,
      hp: unit.hp,
      ap: unit.ap,
      abilities: [...unit.abilities],
      currentAbility: unit.currentAbility,
    })),
    enemies: livingEnemies().length,
    kills: state.kills,
    blessings: state.blessings,
  }),
};
