import {
  DIFFICULTIES,
  getRankedCardData,
  MAX_CARD_RANK,
  MONSTERS,
  TOWERS,
  WAVES,
} from "./data.js";
import { DEFAULT_MAP_ID, GameMap, MAP_HEIGHT, MAP_WIDTH, MAPS } from "./map.js";
import { Monster, Tower } from "./entity.js";
import { initializeUI, updateUI } from "./ui.js";

const CORE_MAX_HP = 100;
const INITIAL_ENERGY = 10;
const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
let gameMap = new GameMap(DEFAULT_MAP_ID);

// BUILD에서는 타워 배치/주문 사용, COMBAT에서는 웨이브 진행, GAMEOVER에서는 종료 결과를 표시합니다.
const game = {
  state: "BUILD",
  coreHp: CORE_MAX_HP,
  energy: INITIAL_ENERGY,
  wave: 1,
  difficultyId: "normal",
  speedMultiplier: 1,
  mapId: DEFAULT_MAP_ID,
  towers: [],
  selectedTower: null,
  selectedCard: null,
  monsters: [],
  projectiles: [],
  selectedCardIndex: null,
  spawnQueue: [],
  spawnTimer: 0,
  effects: [],
  message: "가디언을 배치하고 코어를 방어하세요.",
};

function currentCard() {
  return game.selectedCard;
}

function updateMessage(message) {
  game.message = message;
  renderUI();
}

function renderUI() {
  updateUI({
    coreHp: game.coreHp,
    maxCoreHp: CORE_MAX_HP,
    wave: game.wave,
    maxWaves: WAVES.length,
    energy: game.energy,
    state: game.state,
    difficultyId: game.difficultyId,
    speedMultiplier: game.speedMultiplier,
    mapId: game.mapId,
    selectedTower: game.selectedTower,
    towerFusionTargets: game.selectedCard?.kind === "tower"
      ? game.towers
        .filter((tower) => tower.config.id === game.selectedCard.id && tower.canUpgrade)
        .map((tower) => `${tower.col},${tower.row}`)
      : [],
    selectedCardIndex: game.selectedCardIndex,
    message: game.message,
  });
}

function beginWave() {
  if (game.state !== "BUILD" || game.wave > WAVES.length) return;
  const waveData = WAVES[game.wave - 1];
  const difficulty = DIFFICULTIES[game.difficultyId];
  // 난이도에 따라 웨이브마다 생성되는 적의 수를 조정합니다.
  game.spawnQueue = waveData.groups.flatMap(({ monster, count }) => {
    const scaledCount = count === 0
      ? 0
      : Math.max(1, Math.round(count * difficulty.spawnCountMultiplier));
    return Array.from({ length: scaledCount }, () => monster);
  });
  game.spawnTimer = 0;
  game.state = "COMBAT";
  game.selectedCardIndex = null;
  game.selectedCard = null;
  game.selectedTower = null;
  updateMessage(`웨이브 ${game.wave} 방어 중!`);
}

function selectCard(card, index) {
  if (game.state === "GAMEOVER") return;
  const config = getRankedCardData(card);
  if (!config) return;
  if (card.kind === "tower" && game.state !== "BUILD") return;
  if (game.energy < config.cost) {
    updateMessage(`에너지가 부족합니다. (${config.cost} 필요)`);
    return;
  }

  if (card.kind === "tower") {
    game.selectedTower = null;
    game.selectedCardIndex = game.selectedCardIndex === index ? null : index;
    game.selectedCard = game.selectedCardIndex === null ? null : card;
    updateMessage(
      game.selectedCardIndex === null
        ? "가디언을 배치하고 코어를 방어하세요."
        : `${config.name} 선택됨 — 빈 타일을 클릭하세요.`,
    );
    return;
  }

  game.selectedTower = null;
  game.selectedCard = null;
  game.selectedCardIndex = null;
  if (config.effect === "targeted_damage") {
    // 위치 지정 주문을 고르면 진행 중인 타워 배치 선택을 해제하고 UI 선택만 유지합니다.
    updateMessage(`${config.name} 선택됨 — 맵에서 폭격 지점을 클릭하세요.`);
    return;
  }

  // 주문 카드는 선택 즉시 발동해 MVP 조작 단계를 단순하게 유지합니다.
  if (config.effect === "damage" && game.monsters.length === 0) {
    updateMessage("플레어를 사용할 적이 없습니다.");
    return;
  }
  if (config.effect === "freeze" && !game.monsters.some((monster) => monster.alive)) {
    updateMessage("빙결을 사용할 적이 없습니다.");
    return;
  }
  if (config.effect === "heal" && game.coreHp >= CORE_MAX_HP) {
    updateMessage("코어 HP가 가득 차 있어 수리할 필요가 없습니다.");
    return;
  }
  game.energy -= config.cost;
  if (config.effect === "damage") {
    game.monsters.forEach((monster) => {
      if (monster.alive) monster.takeDamage(config.value);
    });
    updateMessage(`${config.name} 발동! 모든 적에게 피해를 줬습니다.`);
  } else if (config.effect === "heal") {
    const restored = Math.min(config.value, CORE_MAX_HP - game.coreHp);
    game.coreHp += restored;
    updateMessage(restored > 0 ? `코어 HP ${restored} 회복!` : "코어 HP가 이미 가득 찼습니다.");
  } else if (config.effect === "energy") {
    game.energy += config.value;
    updateMessage(`에너지 ${config.value} 획득!`);
  } else if (config.effect === "freeze") {
    game.monsters.forEach((monster) => {
      if (monster.alive) monster.applyFreeze(config.duration);
    });
    updateMessage(`${config.name} 발동! 모든 적을 ${config.duration}초간 빙결했습니다.`);
  }
}

function castTargetedSpell(card, x, y) {
  const config = getRankedCardData(card);
  if (
    (game.state !== "BUILD" && game.state !== "COMBAT") ||
    card.kind !== "spell" ||
    !config ||
    config.effect !== "targeted_damage" ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    x < 0 ||
    x > MAP_WIDTH ||
    y < 0 ||
    y > MAP_HEIGHT
  ) {
    return false;
  }
  if (game.energy < config.cost) {
    updateMessage(`에너지가 부족합니다. (${config.cost} 필요)`);
    return false;
  }

  game.energy -= config.cost;
  let hitCount = 0;
  game.monsters.forEach((monster) => {
    if (!monster.alive || Math.hypot(monster.x - x, monster.y - y) > config.radius) return;
    // Monster.takeDamage가 HP와 생존 상태를 갱신해 코어 피해 처리와도 일관되게 연결됩니다.
    monster.takeDamage(config.damage);
    hitCount += 1;
  });
  game.effects.push({
    x,
    y,
    radius: config.radius,
    color: config.color,
    rank: config.rank,
    duration: 0.7,
    remaining: 0.7,
  });
  updateMessage(
    hitCount > 0
      ? `${config.name} 발동! 반경 내 적 ${hitCount}기에게 ${config.damage} 피해.`
      : `${config.name} 발동! 폭격 지점 주변에 적이 없습니다.`,
  );
  return true;
}

function placeTowerAtPointer(event) {
  if (game.state !== "BUILD") return;

  const bounds = canvas.getBoundingClientRect();
  const x = ((event.clientX - bounds.left) / bounds.width) * MAP_WIDTH;
  const y = ((event.clientY - bounds.top) / bounds.height) * MAP_HEIGHT;
  const { col, row } = gameMap.getTileAt(x, y);
  const towerAtTile = game.towers.find((tower) => tower.col === col && tower.row === row);
  const card = currentCard();
  if (towerAtTile) {
    if (card?.kind === "tower") {
      if (card.id !== towerAtTile.config.id) {
        updateMessage("같은 종류의 타워 카드만 해당 타워의 강화 재료로 사용할 수 있습니다.");
        return;
      }
      if (!towerAtTile.canUpgrade || towerAtTile.level >= MAX_CARD_RANK) {
        updateMessage(`${towerAtTile.config.name}은(는) 이미 최대 레벨입니다.`);
        return;
      }
      if (!towerAtTile.upgrade()) {
        updateMessage(`${towerAtTile.config.name}을(를) 더 강화할 수 없습니다.`);
        return;
      }

      // 강화 재료 카드만 소비하고 에너지는 건드리지 않은 채 타워 선택을 유지합니다.
      game.selectedTower = towerAtTile;
      game.selectedCardIndex = null;
      game.selectedCard = null;
      updateMessage(`${towerAtTile.config.name} 동일 카드 합성 완료! Lv.${towerAtTile.level}`);
      return;
    }

    game.selectedTower = towerAtTile;
    game.selectedCardIndex = null;
    game.selectedCard = null;
    updateMessage(`${towerAtTile.config.name} Lv.${towerAtTile.level} 선택됨.`);
    return;
  }

  if (!card || card.kind !== "tower") {
    if (game.selectedTower) {
      game.selectedTower = null;
      renderUI();
    }
    return;
  }
  game.selectedTower = null;

  if (!gameMap.isBuildable(col, row)) {
    updateMessage("경로와 코어 타일에는 배치할 수 없습니다.");
    return;
  }
  if (game.towers.some((tower) => tower.col === col && tower.row === row)) {
    updateMessage("이미 가디언이 배치된 타일입니다.");
    return;
  }

  const config = TOWERS[card.id];
  if (game.energy < config.cost) {
    game.selectedCardIndex = null;
    game.selectedCard = null;
    updateMessage("에너지가 부족합니다.");
    return;
  }
  const center = gameMap.getTileCenter(col, row);
  game.towers.push(new Tower(config, col, row, center.x, center.y, card.rank));
  game.energy -= config.cost;
  game.selectedCardIndex = null;
  game.selectedCard = null;
  updateMessage(`${config.name} 배치 완료!`);
  renderUI();
}

function upgradeSelectedTower() {
  const tower = game.selectedTower;
  if (game.state !== "BUILD" || !tower) return;

  if (!tower.canUpgrade) {
    updateMessage(`${tower.config.name}은(는) 이미 최대 레벨입니다.`);
    return;
  }
  updateMessage("손패에서 같은 종류의 타워 카드를 선택한 뒤 타워를 클릭해 강화하세요. 에너지는 소모되지 않습니다.");
}

function changeMap(mapId) {
  if (
    game.state !== "BUILD" ||
    game.wave !== 1 ||
    game.towers.length > 0 ||
    !MAPS[mapId]
  ) {
    return false;
  }

  game.mapId = mapId;
  gameMap = new GameMap(mapId);
  game.selectedCardIndex = null;
  game.selectedCard = null;
  game.selectedTower = null;
  renderUI();
  return true;
}

function spawnMonster() {
  const monsterId = game.spawnQueue.shift();
  if (!monsterId) return;
  const baseConfig = MONSTERS[monsterId];
  const difficulty = DIFFICULTIES[game.difficultyId];
  // 난이도별 능력치는 원본 몬스터 데이터 대신 인스턴스 복사본에 적용합니다.
  const config = {
    ...baseConfig,
    hp: Math.max(1, Math.round(baseConfig.hp * difficulty.monsterHpMultiplier)),
    speed: baseConfig.speed * difficulty.monsterSpeedMultiplier,
  };
  game.monsters.push(new Monster(config, gameMap.waypoints));
}

function finishWave() {
  const completedWave = WAVES[game.wave - 1];
  game.energy += completedWave.reward;
  game.wave += 1;
  game.state = game.wave > WAVES.length ? "GAMEOVER" : "BUILD";
  game.message =
    game.state === "GAMEOVER"
      ? "모든 웨이브 방어 성공! 코어를 지켜냈습니다."
      : `웨이브 방어 성공! 에너지 ${completedWave.reward} 획득.`;
  renderUI();
}

function update(deltaTime) {
  // 폭격 이펙트는 건설 단계에서도 사라지도록 전투 상태와 별도로 시간을 갱신합니다.
  game.effects.forEach((effect) => {
    effect.remaining = Math.max(0, effect.remaining - deltaTime);
  });
  game.effects = game.effects.filter((effect) => effect.remaining > 0);
  if (game.state !== "COMBAT") return;
  const waveData = WAVES[game.wave - 1];
  game.spawnTimer -= deltaTime;
  if (game.spawnQueue.length > 0 && game.spawnTimer <= 0) {
    spawnMonster();
    game.spawnTimer = waveData.spawnInterval;
  }

  let coreTookDamage = false;
  for (const monster of game.monsters) {
    if (monster.alive && monster.update(deltaTime)) {
      monster.alive = false;
      game.coreHp = Math.max(0, game.coreHp - monster.config.damage);
      coreTookDamage = true;
    }
  }

  game.towers.forEach((tower) => tower.update(deltaTime, game.monsters, game.projectiles));
  game.projectiles.forEach((projectile) => projectile.update(deltaTime));
  game.projectiles = game.projectiles.filter((projectile) => projectile.alive);
  game.monsters = game.monsters.filter((monster) => monster.alive);
  if (coreTookDamage) renderUI();

  if (game.coreHp <= 0) {
    game.state = "GAMEOVER";
    game.message = "코어가 파괴되었습니다. 방어에 실패했습니다.";
    game.selectedCardIndex = null;
    game.selectedCard = null;
    renderUI();
  } else if (game.spawnQueue.length === 0 && game.monsters.length === 0) {
    finishWave();
  }
}

function draw() {
  gameMap.draw(ctx, game.coreHp, CORE_MAX_HP);
  game.towers.forEach((tower) => tower.draw(ctx));
  game.projectiles.forEach((projectile) => projectile.draw(ctx));
  game.monsters.forEach((monster) => monster.draw(ctx));

  game.effects.forEach((effect) => {
    const progress = 1 - effect.remaining / effect.duration;
    ctx.save();
    ctx.globalAlpha = 1 - progress;
    ctx.strokeStyle = effect.color;
    ctx.fillStyle = effect.color;
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = 18;
    ctx.lineWidth = 5 * (1 - progress) + 1;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius * (0.2 + progress * 0.8), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = (1 - progress) * 0.22;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius * (0.2 + progress * 0.8), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = (1 - progress) * 0.7;
    ctx.fillRect(effect.x - 3, 0, 6, effect.y);
    ctx.restore();
  });

  // 선택된 타워의 배치 가능 영역을 미리 표시합니다.
  const card = currentCard();
  if (game.state === "BUILD" && card && card.kind === "tower") {
    ctx.save();
    ctx.fillStyle = "rgb(100 243 193 / 5%)";
    for (let row = 0; row < 6; row += 1) {
      for (let col = 0; col < 10; col += 1) {
        if (gameMap.isBuildable(col, row) && !game.towers.some((tower) => tower.col === col && tower.row === row)) {
          ctx.fillRect(col * 100 + 2, row * 100 + 2, 96, 96);
        }
      }
    }
    // 선택한 카드와 같은 종류이며 최대 레벨이 아닌 설치 타워를 금색으로 강조합니다.
    game.towers
      .filter((tower) => tower.config.id === card.id && tower.canUpgrade)
      .forEach((tower) => {
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, 43, 0, Math.PI * 2);
        ctx.strokeStyle = "#ffd166";
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 4]);
        ctx.stroke();
      });
    ctx.restore();
  }

  if (game.selectedTower) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(game.selectedTower.x, game.selectedTower.y, game.selectedTower.range, 0, Math.PI * 2);
    ctx.strokeStyle = "rgb(100 243 193 / 72%)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.restore();
  }
}

let previousTime = 0;
function gameLoop(timestamp) {
  const frameDelta = Math.min((timestamp - previousTime) / 1000 || 0, 0.05);
  previousTime = timestamp;
  // 모든 시뮬레이션 타이머가 같은 배속을 적용받도록 업데이트 deltaTime을 조정합니다.
  update(frameDelta * game.speedMultiplier);
  draw();
  requestAnimationFrame(gameLoop);
}

initializeUI({
  onStartWave: beginWave,
  onSelectCard: selectCard,
  onCastTargetedSpell: castTargetedSpell,
  onUpgradeTower: upgradeSelectedTower,
  onMapChange: changeMap,
  onDifficultyChange(difficultyId) {
    if (game.state !== "BUILD" || game.wave !== 1 || !DIFFICULTIES[difficultyId]) return;
    game.difficultyId = difficultyId;
    renderUI();
  },
  onSpeedChange(speedMultiplier) {
    if (speedMultiplier !== 1 && speedMultiplier !== 2) return;
    game.speedMultiplier = speedMultiplier;
    renderUI();
  },
});
canvas.addEventListener("pointerdown", placeTowerAtPointer);
renderUI();
requestAnimationFrame(gameLoop);