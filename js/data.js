// 게임 밸런스와 웨이브 구성을 한 곳에서 관리합니다.
export const TOWERS = {
  sentry: {
    id: "sentry",
    name: "가디언 센트리",
    description: "균형 잡힌 단일 공격",
    cost: 4,
    damage: 18,
    range: 165,
    fireRate: 0.8,
    projectileSpeed: 360,
    color: "#64f3c1",
  },
  arc: {
    id: "arc",
    name: "아크 캐스터",
    description: "빠른 연속 공격",
    cost: 5,
    damage: 10,
    range: 145,
    fireRate: 0.38,
    projectileSpeed: 440,
    color: "#6ac9ff",
  },
  cannon: {
    id: "cannon",
    name: "볼트 캐논",
    description: "느리지만 강력한 공격",
    cost: 6,
    damage: 42,
    range: 190,
    fireRate: 1.6,
    projectileSpeed: 300,
    color: "#ffb45c",
  },
};

export const SPELLS = {
  flare: {
    id: "flare",
    name: "플레어",
    description: "모든 적에게 30 피해",
    cost: 3,
    effect: "damage",
    value: 30,
    color: "#ff826e",
  },
  repair: {
    id: "repair",
    name: "코어 수리",
    description: "코어 HP 20 회복",
    cost: 3,
    effect: "heal",
    value: 20,
    color: "#8df2c0",
  },
  surge: {
    id: "surge",
    name: "에너지 파동",
    description: "에너지 4 획득",
    cost: 0,
    effect: "energy",
    value: 4,
    color: "#c5a1ff",
  },
};

export const MONSTERS = {
  slime: {
    id: "slime",
    name: "슬라임",
    hp: 60,
    speed: 42,
    damage: 10,
    radius: 15,
    color: "#78dc82",
    reward: 1,
  },
  crawler: {
    id: "crawler",
    name: "크롤러",
    hp: 45,
    speed: 66,
    damage: 8,
    radius: 12,
    color: "#efbd64",
    reward: 1,
  },
  brute: {
    id: "brute",
    name: "브루트",
    hp: 180,
    speed: 25,
    damage: 22,
    radius: 21,
    color: "#e87866",
    reward: 2,
  },
  wisp: {
    id: "wisp",
    name: "위스프",
    hp: 85,
    speed: 84,
    damage: 12,
    radius: 13,
    color: "#9b8cff",
    reward: 2,
  },
};

// 각 웨이브는 적 조합, 생성 간격, 클리어 보상을 정의합니다.
export const WAVES = [
  { groups: [{ monster: "slime", count: 5 }], spawnInterval: 1.1, reward: 3 },
  { groups: [{ monster: "slime", count: 7 }], spawnInterval: 0.95, reward: 3 },
  { groups: [{ monster: "slime", count: 5 }, { monster: "crawler", count: 4 }], spawnInterval: 0.9, reward: 4 },
  { groups: [{ monster: "crawler", count: 8 }], spawnInterval: 0.8, reward: 4 },
  { groups: [{ monster: "slime", count: 6 }, { monster: "brute", count: 2 }], spawnInterval: 1, reward: 5 },
  { groups: [{ monster: "crawler", count: 8 }, { monster: "wisp", count: 3 }], spawnInterval: 0.75, reward: 5 },
  { groups: [{ monster: "brute", count: 4 }, { monster: "slime", count: 5 }], spawnInterval: 0.9, reward: 6 },
  { groups: [{ monster: "wisp", count: 7 }, { monster: "crawler", count: 5 }], spawnInterval: 0.65, reward: 6 },
  { groups: [{ monster: "brute", count: 5 }, { monster: "wisp", count: 5 }], spawnInterval: 0.72, reward: 7 },
  { groups: [{ monster: "brute", count: 7 }, { monster: "wisp", count: 8 }], spawnInterval: 0.58, reward: 10 },
];

// MVP 손패는 타워 두 장과 즉시 발동 주문 두 장으로 구성합니다.
export const STARTING_HAND = [
  { kind: "tower", id: "sentry" },
  { kind: "tower", id: "arc" },
  { kind: "spell", id: "flare" },
  { kind: "spell", id: "repair" },
];