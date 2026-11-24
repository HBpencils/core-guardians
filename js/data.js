// 게임 밸런스와 웨이브 구성을 한 곳에서 관리합니다.
export const TOWERS = {
  machine_gun: {
    id: "machine_gun",
    name: "기관포",
    description: "빠른 연사로 단일 적을 공격합니다.",
    cost: 2,
    damage: 9,
    range: 165,
    fireRate: 0.38,
    projectileSpeed: 440,
    color: "#64f3c1",
  },
  mortar: {
    id: "mortar",
    name: "박격포",
    description: "긴 사거리에서 착탄 지점에 범위 피해를 줍니다.",
    cost: 3,
    damage: 42,
    range: 285,
    fireRate: 1.8,
    projectileSpeed: 270,
    splashRadius: 76,
    color: "#ffb45c",
  },
  frost_tower: {
    id: "frost_tower",
    name: "빙결탑",
    description: "적의 이동속도를 2초간 40% 감소시킵니다.",
    cost: 2,
    damage: 7,
    range: 155,
    fireRate: 0.9,
    projectileSpeed: 350,
    slowDuration: 2,
    slowFactor: 0.6,
    color: "#75cfff",
  },
};

export const SPELLS = {
  energy_boost: {
    id: "energy_boost",
    name: "에너지 충전",
    description: "에너지를 2 즉시 회복합니다.",
    cost: 0,
    effect: "energy",
    value: 2,
    color: "#c5a1ff",
  },
  global_freeze: {
    id: "global_freeze",
    name: "전체 빙결",
    description: "맵 위의 모든 적을 3초간 빙결합니다.",
    cost: 3,
    effect: "freeze",
    duration: 3,
    color: "#75cfff",
  },
  orbital_strike: {
    id: "orbital_strike",
    name: "궤도 폭격",
    description: "지정한 위치 주변에 강력한 광역 피해를 줍니다.",
    cost: 4,
    effect: "targeted_damage",
    damage: 120,
    radius: 115,
    color: "#ff826e",
  },
};

export const MONSTERS = {
  slime: {
    id: "slime",
    name: "일반 슬라임",
    hp: 60,
    speed: 42,
    damage: 10,
    radius: 15,
    color: "#78dc82",
    reward: 1,
  },
  goblin: {
    id: "goblin",
    name: "빠른 고블린",
    hp: 48,
    speed: 76,
    damage: 9,
    radius: 12,
    color: "#efbd64",
    reward: 1,
  },
  golem: {
    id: "golem",
    name: "고체력 골렘",
    hp: 230,
    speed: 24,
    damage: 24,
    radius: 21,
    color: "#e87866",
    reward: 2,
  },
  dragon: {
    id: "dragon",
    name: "보스 드래곤",
    hp: 1100,
    speed: 31,
    damage: 55,
    radius: 30,
    color: "#bd70ed",
    reward: 10,
  },
};

// 각 웨이브는 적 조합, 생성 간격, 클리어 보상을 정의합니다.
export const WAVES = [
  { groups: [{ monster: "slime", count: 5 }], spawnInterval: 1.1, reward: 3 },
  { groups: [{ monster: "slime", count: 6 }, { monster: "goblin", count: 2 }], spawnInterval: 1, reward: 3 },
  { groups: [{ monster: "slime", count: 5 }, { monster: "goblin", count: 4 }], spawnInterval: 0.9, reward: 4 },
  { groups: [{ monster: "goblin", count: 8 }], spawnInterval: 0.82, reward: 4 },
  { groups: [{ monster: "slime", count: 6 }, { monster: "golem", count: 2 }], spawnInterval: 0.95, reward: 5 },
  { groups: [{ monster: "goblin", count: 8 }, { monster: "slime", count: 5 }], spawnInterval: 0.78, reward: 5 },
  { groups: [{ monster: "golem", count: 3 }, { monster: "goblin", count: 6 }], spawnInterval: 0.86, reward: 6 },
  { groups: [{ monster: "goblin", count: 9 }, { monster: "golem", count: 3 }], spawnInterval: 0.7, reward: 6 },
  { groups: [{ monster: "golem", count: 5 }, { monster: "goblin", count: 7 }], spawnInterval: 0.68, reward: 7 },
  { groups: [{ monster: "golem", count: 4 }, { monster: "goblin", count: 8 }, { monster: "dragon", count: 1 }], spawnInterval: 0.62, reward: 10 },
];

// 시작 손패에 세 타워와 세 주문을 모두 제공합니다.
export const STARTING_HAND = [
  { kind: "tower", id: "machine_gun" },
  { kind: "tower", id: "mortar" },
  { kind: "tower", id: "frost_tower" },
  { kind: "spell", id: "energy_boost" },
  { kind: "spell", id: "global_freeze" },
  { kind: "spell", id: "orbital_strike" },
];
