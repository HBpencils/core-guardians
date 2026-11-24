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

// 타워 강화 비용은 에너지 0이며, 손패의 동일 타워 카드가 실제 재료가 됩니다.
export const TOWER_UPGRADES = {
  2: { cost: 0, damageMultiplier: 1.5, fireRateMultiplier: 0.85, rangeMultiplier: 1.1 },
  3: { cost: 0, damageMultiplier: 2.2, fireRateMultiplier: 0.72, rangeMultiplier: 1.25 },
};

// 세 장의 같은 등급 카드를 합치며, 카드 등급은 3단계까지 올릴 수 있습니다.
export const CARD_FUSION_REQUIREMENT = 3;
export const MAX_CARD_RANK = 3;
export const SPELL_RANK_MULTIPLIERS = { 1: 1, 2: 1.5, 3: 2 };

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

// 난이도 설정은 기본 몬스터 수치를 변경하지 않고 게임 시작 시 복사본에 적용합니다.
export const DIFFICULTIES = {
  easy: {
    id: "easy",
    name: "Easy",
    monsterHpMultiplier: 0.75,
    monsterSpeedMultiplier: 0.85,
    spawnCountMultiplier: 0.75,
  },
  normal: {
    id: "normal",
    name: "Normal",
    monsterHpMultiplier: 1,
    monsterSpeedMultiplier: 1,
    spawnCountMultiplier: 1,
  },
  hard: {
    id: "hard",
    name: "Hard",
    monsterHpMultiplier: 1.4,
    monsterSpeedMultiplier: 1.2,
    spawnCountMultiplier: 1.35,
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

// UI 설명과 실제 발동에서 같은 등급별 능력치를 사용하도록 계산을 공유합니다.
export function getRankedCardData(card) {
  const baseConfig = card.kind === "tower" ? TOWERS[card.id] : SPELLS[card.id];
  if (!baseConfig) return null;

  const rank = Math.min(MAX_CARD_RANK, Math.max(1, Math.floor(card.rank || 1)));
  if (card.kind === "tower") {
    const upgrade = TOWER_UPGRADES[rank];
    if (!upgrade) return { ...baseConfig, rank };
    const rankedConfig = {
      ...baseConfig,
      rank,
      damage: Math.round(baseConfig.damage * upgrade.damageMultiplier),
      fireRate: baseConfig.fireRate * upgrade.fireRateMultiplier,
      range: Math.round(baseConfig.range * upgrade.rangeMultiplier),
    };
    rankedConfig.description =
      `피해 ${rankedConfig.damage} · 사거리 ${rankedConfig.range} · 초당 공격 ${(1 / rankedConfig.fireRate).toFixed(1)}회`;
    return rankedConfig;
  }

  const multiplier = SPELL_RANK_MULTIPLIERS[rank] ?? 1;
  const rankedConfig = { ...baseConfig, rank };
  ["value", "damage", "duration"].forEach((stat) => {
    if (Number.isFinite(baseConfig[stat])) {
      const precision = stat === "duration" ? 10 : 1;
      rankedConfig[stat] = Math.round(baseConfig[stat] * multiplier * precision) / precision;
    }
  });
  if (rank > 1) {
    if (rankedConfig.effect === "energy") {
      rankedConfig.description = `에너지를 ${rankedConfig.value} 즉시 회복합니다.`;
    } else if (rankedConfig.effect === "freeze") {
      rankedConfig.description = `맵 위의 모든 적을 ${rankedConfig.duration}초간 빙결합니다.`;
    } else if (rankedConfig.effect === "targeted_damage") {
      rankedConfig.description =
        `지정한 위치 반경 ${rankedConfig.radius} 내 적에게 ${rankedConfig.damage} 피해를 줍니다.`;
    }
  }
  return rankedConfig;
}
