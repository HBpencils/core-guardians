import {
  CARD_FUSION_REQUIREMENT,
  DIFFICULTIES,
  getRankedCardData,
  MAX_CARD_RANK,
  STARTING_HAND,
} from "./data.js";
import { DEFAULT_MAP_ID, GameMap, MAP_HEIGHT, MAP_WIDTH, MAPS, TILE_SIZE } from "./map.js";

const handElement = document.querySelector("#hand");
const startButton = document.querySelector("#start-wave");
const startGameButton = document.querySelector("#start-game");
const gameOverlay = document.querySelector("#game-overlay");
const rewardOverlay = document.querySelector("#reward-overlay");
const rewardOptions = document.querySelector("#reward-options");
const resultOverlay = document.querySelector("#result-overlay");
const resultModal = resultOverlay.querySelector(".result-modal");
const resultTitle = document.querySelector("#result-title");
const resultDifficulty = document.querySelector("#result-difficulty");
const resultMessage = document.querySelector("#result-message");
const replayButton = document.querySelector("#replay-game");
const handCount = document.querySelector("#hand-count");
const coreHpElement = document.querySelector("#core-hp");
const coreHpBar = document.querySelector("#core-hp-bar");
const waveCountElement = document.querySelector("#wave-count");
const energyCountElement = document.querySelector("#energy-count");
const energyMaxElement = document.querySelector("#energy-max");
const energyBar = document.querySelector("#energy-bar");
const difficultySelect = document.querySelector("#difficulty-select");
const difficultyIndicator = document.querySelector("#difficulty-indicator");
const speedToggle = document.querySelector("#speed-toggle");
const mapSelect = document.querySelector("#map-select");
const mapIndicator = document.querySelector("#map-indicator");
const upgradePanel = document.querySelector("#tower-upgrade-panel");
const upgradeTowerName = document.querySelector("#upgrade-tower-name");
const upgradeTowerStats = document.querySelector("#upgrade-tower-stats");
const upgradeButton = document.querySelector("#upgrade-tower-button");
const fusionModeButton = document.querySelector("#fusion-mode-button");
const fuseCardsButton = document.querySelector("#fuse-cards-button");
const fusionStatus = document.querySelector("#fusion-status");
const phaseLabel = document.querySelector("#phase-label");
const gameMessage = document.querySelector("#game-message");
const canvas = document.querySelector("#game-canvas");
const previewCanvas = document.querySelector("#interaction-overlay");
const previewContext = previewCanvas.getContext("2d");

const HAND_LIMIT = 4;
const MAX_ENERGY = 10;

let nextCardUid = 1;
// 같은 카드 정의로 여러 장을 보유해도 선택과 버리기를 구분하도록 고유 ID를 붙입니다.
function createCardInstance(card, rank = 1) {
  return { ...card, rank, uid: nextCardUid++ };
}

let deck = STARTING_HAND.map((card) => createCardInstance(card));
let hand = [];
let discard = [];
let selectedSpellUid = null;
let lastSelectedCardUid = null;
let lastState = null;
let lastWave = null;
let currentState = "BUILD";
let currentEnergy = MAX_ENERGY;
let currentDifficultyId = "normal";
let currentSpeedMultiplier = 1;
let currentMapId = DEFAULT_MAP_ID;
let previewMap = new GameMap(DEFAULT_MAP_ID);
let hasStartedWave = false;
let pointerPosition = null;
let pendingBoardClick = false;
let pendingTile = null;
let fusionMode = false;
let onSelectCardCallback = null;
const selectedFusionUids = new Set();
const placedTiles = new Set();
let compatibleTowerTiles = new Set();

function getCardData(card) {
  return getRankedCardData(card);
}

function shuffle(cards) {
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]];
  }
}

function recycleDiscard() {
  if (deck.length || discard.length === 0) return;
  deck = discard;
  discard = [];
  shuffle(deck);
}

// 덱이 비면 버림 더미를 섞어 채운 뒤 다음 한 장을 뽑습니다.
function drawCard() {
  recycleDiscard();
  return deck.shift() ?? null;
}

function drawHand() {
  while (hand.length < HAND_LIMIT) {
    const card = drawCard();
    if (!card) break;
    hand.push(card);
  }
  renderHand();
}

function discardHand() {
  discard.push(...hand);
  hand = [];
  selectedSpellUid = null;
  selectedFusionUids.clear();
}

function consumeCard(cardUid) {
  const cardIndex = hand.findIndex((card) => card.uid === cardUid);
  if (cardIndex < 0) return;
  discard.push(hand.splice(cardIndex, 1)[0]);
  if (selectedSpellUid === cardUid) selectedSpellUid = null;
  selectedFusionUids.delete(cardUid);
  renderHand();
}

// 보상 카드는 덱에 등록한 뒤 같은 인스턴스를 즉시 손패로 옮깁니다.
function receiveRewardCard(card) {
  const rewardCard = createCardInstance(card);
  deck.push(rewardCard);

  while (hand.length >= HAND_LIMIT) {
    // 손패가 가득 차면 가장 먼저 들어온 카드를 버려 새 보상 카드를 받을 자리를 만듭니다.
    const discardedCard = hand.shift();
    discard.push(discardedCard);
    selectedFusionUids.delete(discardedCard.uid);
    if (selectedSpellUid === discardedCard.uid) selectedSpellUid = null;
    if (lastSelectedCardUid === discardedCard.uid) lastSelectedCardUid = null;
  }

  const rewardIndex = deck.findIndex((deckCard) => deckCard.uid === rewardCard.uid);
  if (rewardIndex < 0) {
    throw new Error("보상 카드가 덱에서 손패로 이동되지 않았습니다.");
  }
  const [drawnReward] = deck.splice(rewardIndex, 1);
  hand.push(drawnReward);
  renderHand();
}

function fusionGroupMatches(first, second) {
  return first.kind === second.kind && first.id === second.id && first.rank === second.rank;
}

function isFusionAvailable(card) {
  return (
    card.rank < MAX_CARD_RANK &&
    hand.filter((candidate) => fusionGroupMatches(card, candidate)).length >= CARD_FUSION_REQUIREMENT
  );
}

function updateFusionControls() {
  const selectedCards = hand.filter((card) => selectedFusionUids.has(card.uid));
  const firstSelected = selectedCards[0];
  const validSelection =
    selectedCards.length === CARD_FUSION_REQUIREMENT &&
    selectedCards.every((card) => fusionGroupMatches(firstSelected, card)) &&
    firstSelected.rank < MAX_CARD_RANK;

  fusionModeButton.disabled = currentState === "GAMEOVER";
  fusionModeButton.textContent = fusionMode ? "합성 취소" : "합성 선택";
  fusionModeButton.setAttribute("aria-pressed", String(fusionMode));
  fuseCardsButton.textContent = `합성 (${selectedCards.length}/${CARD_FUSION_REQUIREMENT})`;
  fuseCardsButton.disabled = currentState === "GAMEOVER" || !validSelection;

  const availableCount = hand.filter(isFusionAvailable).length;
  if (fusionMode) {
    fusionStatus.textContent = `같은 카드 ${CARD_FUSION_REQUIREMENT}장을 선택하세요. (${selectedCards.length}/${CARD_FUSION_REQUIREMENT})`;
  } else if (availableCount > 0) {
    fusionStatus.textContent = "합성 가능 카드가 있습니다. 합성 선택을 눌러 재료를 고르세요.";
  } else {
    fusionStatus.textContent =
      `같은 카드 ${CARD_FUSION_REQUIREMENT}장으로 다음 등급을 만듭니다. 최대 Lv.${MAX_CARD_RANK}.`;
  }
}

function renderHand() {
  handElement.replaceChildren();
  hand.forEach((card) => {
    const config = getCardData(card);
    const button = createCardButton(card, card.uid);
    const isSelected = card.uid === lastSelectedCardUid || card.uid === selectedSpellUid;
    button.classList.toggle("selected", isSelected);
    button.classList.toggle("fusion-available", isFusionAvailable(card));
    button.classList.toggle("fusion-selected", selectedFusionUids.has(card.uid));
    button.disabled =
      currentState === "GAMEOVER" ||
      (!fusionMode &&
        ((card.kind === "tower" && currentState !== "BUILD") || currentEnergy < config.cost));
    button.setAttribute("aria-pressed", String(isSelected || selectedFusionUids.has(card.uid)));
    button.addEventListener("click", () => {
      if (fusionMode) {
        toggleFusionSelection(card);
      } else {
        handleCardClick(card, card.uid, onSelectCardCallback);
      }
    });
    handElement.append(button);
  });
  handCount.textContent = `${hand.length} / ${HAND_LIMIT}`;
  updateFusionControls();
}

function createCardButton(card, index, className = "card") {
  const config = getCardData(card);
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.dataset.kind = card.kind;
  button.dataset.cardId = card.id;
  button.dataset.rank = String(card.rank ?? 1);
  button.dataset.index = String(index);
  button.setAttribute(
    "aria-label",
    `${config.name} Lv.${card.rank ?? 1}, 에너지 ${config.cost}. ${config.description}`,
  );
  button.title = `${config.name} Lv.${card.rank ?? 1} · 에너지 ${config.cost} · ${config.description}`;

  const type = document.createElement("span");
  type.className = "card-type";
  type.textContent = card.kind === "tower" ? "TOWER" : "SPELL";
  const title = document.createElement("span");
  title.className = "card-title";
  title.textContent = config.name;
  const description = document.createElement("span");
  description.className = "card-description";
  description.textContent = config.description;
  const cost = document.createElement("span");
  cost.className = "card-cost";
  cost.textContent = `✦ ${config.cost}`;
  const rank = document.createElement("span");
  rank.className = "card-rank";
  rank.textContent = `Lv.${card.rank ?? 1}`;
  const tooltip = document.createElement("span");
  tooltip.className = "card-tooltip";
  tooltip.textContent = config.description;

  button.append(type, title, description, cost, rank, tooltip);
  return button;
}

function tileAtPointer(event) {
  const bounds = canvas.getBoundingClientRect();
  if (bounds.width === 0 || bounds.height === 0) return null;
  const x = ((event.clientX - bounds.left) / bounds.width) * MAP_WIDTH;
  const y = ((event.clientY - bounds.top) / bounds.height) * MAP_HEIGHT;
  if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return null;
  const col = Math.floor(x / TILE_SIZE);
  const row = Math.floor(y / TILE_SIZE);
  return { x, y, col, row, key: `${col},${row}` };
}

function isBuildable(tile) {
  return (
    previewMap.isBuildable(tile.col, tile.row) &&
    !placedTiles.has(tile.key)
  );
}

function drawPreview() {
  previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  if (!pointerPosition || fusionMode) return;

  const selectedUid = selectedSpellUid ?? lastSelectedCardUid;
  if (selectedUid === null) return;
  const card = hand.find((heldCard) => heldCard.uid === selectedUid);
  if (!card || (card.kind === "tower" && selectedUid !== lastSelectedCardUid)) return;
  const canTargetDuringCombat = currentState === "COMBAT" && card.id === "orbital_strike";
  if (currentState !== "BUILD" && !canTargetDuringCombat) return;

  const config = getCardData(card);
  const tile = tileAtPointer(pointerPosition);
  if (!tile) return;
  const centerX = tile.col * TILE_SIZE + TILE_SIZE / 2;
  const centerY = tile.row * TILE_SIZE + TILE_SIZE / 2;
  const canPlace = card.kind === "spell" || isBuildable(tile);
  const canFuseTower =
    card.kind === "tower" && compatibleTowerTiles.has(tile.key);

  previewContext.save();
  previewContext.fillStyle = canFuseTower
    ? "rgb(255 209 102 / 22%)"
    : canPlace
      ? "rgb(72 235 161 / 24%)"
      : "rgb(255 89 89 / 27%)";
  previewContext.strokeStyle = canFuseTower ? "#ffd166" : canPlace ? "#70f2b5" : "#ff7777";
  previewContext.lineWidth = 2;
  previewContext.fillRect(tile.col * TILE_SIZE + 2, tile.row * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
  previewContext.strokeRect(tile.col * TILE_SIZE + 2, tile.row * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);

  if (card.kind === "tower" && Number.isFinite(config.range)) {
    previewContext.beginPath();
    previewContext.arc(centerX, centerY, config.range, 0, Math.PI * 2);
    previewContext.strokeStyle = "rgb(111 237 192 / 72%)";
    previewContext.lineWidth = 1.5;
    previewContext.setLineDash([7, 6]);
    previewContext.stroke();
  } else if (card.id === "orbital_strike" && Number.isFinite(config.radius)) {
    previewContext.beginPath();
    previewContext.arc(tile.x, tile.y, config.radius, 0, Math.PI * 2);
    previewContext.fillStyle = "rgb(255 130 110 / 12%)";
    previewContext.strokeStyle = "#ff9a84";
    previewContext.setLineDash([6, 5]);
    previewContext.fill();
    previewContext.stroke();
  } else if (card.id === "global_freeze") {
    previewContext.fillStyle = "rgb(117 207 255 / 8%)";
    previewContext.fillRect(0, 0, 1000, 600);
  }

  previewContext.restore();
}

function showMessage(message) {
  gameMessage.textContent = message;
}

function toggleFusionSelection(card) {
  if (card.rank >= MAX_CARD_RANK) {
    showMessage(`Lv.${MAX_CARD_RANK} 카드는 더 이상 합성할 수 없습니다.`);
    return;
  }
  if (selectedFusionUids.has(card.uid)) {
    selectedFusionUids.delete(card.uid);
  } else {
    const firstSelected = hand.find((heldCard) => selectedFusionUids.has(heldCard.uid));
    if (firstSelected && !fusionGroupMatches(firstSelected, card)) {
      showMessage("같은 종류와 등급의 카드만 함께 합성할 수 있습니다.");
      return;
    }
    if (selectedFusionUids.size >= CARD_FUSION_REQUIREMENT) {
      showMessage("합성 재료를 바꾸려면 선택한 카드를 먼저 해제하세요.");
      return;
    }
    selectedFusionUids.add(card.uid);
  }
  renderHand();
}

function fuseSelectedCards() {
  const materials = hand.filter((card) => selectedFusionUids.has(card.uid));
  const firstMaterial = materials[0];
  if (
    materials.length !== CARD_FUSION_REQUIREMENT ||
    !materials.every((card) => fusionGroupMatches(firstMaterial, card)) ||
    firstMaterial.rank >= MAX_CARD_RANK
  ) {
    showMessage("합성하려면 같은 종류와 등급의 카드 3장이 필요합니다.");
    return;
  }

  const materialUids = new Set(materials.map((card) => card.uid));
  hand = hand.filter((card) => !materialUids.has(card.uid));
  const fusedCard = createCardInstance(
    { kind: firstMaterial.kind, id: firstMaterial.id },
    firstMaterial.rank + 1,
  );
  hand.push(fusedCard);
  selectedFusionUids.clear();
  selectedSpellUid = null;
  fusionMode = false;
  renderHand();
  drawPreview();
  showMessage(`${getCardData(fusedCard).name} Lv.${fusedCard.rank} 합성 완료!`);
}

function handleCardClick(card, cardUid, onSelectCard) {
  if (currentState === "GAMEOVER" || !hand.some((heldCard) => heldCard.uid === cardUid)) return;
  const config = getCardData(card);
  if (currentEnergy < config.cost) {
    showMessage(`에너지가 부족합니다. (${config.cost} 필요)`);
    return;
  }

  if (card.kind === "tower") {
    selectedSpellUid = null;
    onSelectCard(card, cardUid);
    drawPreview();
    return;
  }

  if (
    config.effect === "energy" ||
    config.effect === "damage" ||
    config.effect === "heal" ||
    config.effect === "freeze"
  ) {
    const previousEnergy = currentEnergy;
    selectedSpellUid = null;
    onSelectCard(card, cardUid);
    if (config.effect === "energy" || currentEnergy < previousEnergy) consumeCard(cardUid);
    return;
  }

  if (config.effect === "targeted_damage") {
    // 메인 모듈의 기존 선택 콜백으로 타워 선택을 해제하고, 주문은 좌표 클릭까지 보류합니다.
    selectedSpellUid = selectedSpellUid === cardUid ? null : cardUid;
    onSelectCard(card, cardUid);
    renderHand();
    drawPreview();
    showMessage(
      selectedSpellUid === null
        ? "폭격 지점 선택을 취소했습니다."
        : "폭격 지점을 미리 보고 맵을 클릭해 발동하세요.",
    );
    return;
  }

  selectedSpellUid = selectedSpellUid === cardUid ? null : cardUid;
  renderHand();
  drawPreview();
  showMessage("현재 게임 콜백에서 이 주문 효과를 지원하지 않습니다.");
}

function addRewardCards() {
  rewardOptions.replaceChildren();
  const choices = STARTING_HAND.slice();
  shuffle(choices);
  choices.slice(0, 3).forEach((card) => {
    const rewardCard = { ...card, rank: 1 };
    const button = createCardButton(rewardCard, STARTING_HAND.indexOf(card), "card reward-card");
    button.addEventListener("click", () => {
      receiveRewardCard(card);
      rewardOverlay.hidden = true;
      startButton.disabled = currentState !== "BUILD";
      showMessage(`${getCardData(card).name} 카드를 덱에 추가해 손패로 가져왔습니다.`);
      drawPreview();
    });
    rewardOptions.append(button);
  });
}

function showResult(won, message, difficultyId) {
  resultModal.dataset.result = won ? "victory" : "defeat";
  resultTitle.textContent = won ? "코어 방어 성공" : "코어 파괴";
  resultDifficulty.textContent = `난이도: ${DIFFICULTIES[difficultyId]?.name ?? DIFFICULTIES.normal.name}`;
  resultMessage.textContent = message;
  resultOverlay.hidden = false;
}

// 선택한 타워의 능력치와 카드 재료 강화 방법을 표시합니다.
function updateTowerUpgrade(tower, state) {
  upgradePanel.hidden = !tower;
  if (!tower) return;

  upgradeTowerName.textContent = `${tower.config.name} · Lv.${tower.level}`;
  upgradeTowerStats.textContent =
    `공격력 ${tower.config.damage} · 초당 공격 ${Math.round((1 / tower.config.fireRate) * 10) / 10}회 · 사거리 ${tower.range} · 동일 카드로 강화`;
  if (!tower.canUpgrade) {
    upgradeButton.textContent = "MAX";
    upgradeButton.disabled = true;
    return;
  }

  upgradeButton.textContent = "동일 카드로 강화";
  upgradeButton.disabled = state !== "BUILD";
}

function toggleFusionMode() {
  if (currentState === "GAMEOVER") return;
  fusionMode = !fusionMode;
  selectedFusionUids.clear();
  selectedSpellUid = null;
  if (fusionMode) {
    const activeCard = hand.find((card) => card.uid === lastSelectedCardUid);
    if (activeCard?.kind === "tower" && onSelectCardCallback) {
      // 합성 모드 진입 시 타워 배치 선택을 해제해 캔버스 조작과 섞이지 않게 합니다.
      onSelectCardCallback(activeCard, activeCard.uid);
    }
  }
  renderHand();
  drawPreview();
  showMessage(
    fusionMode
      ? `합성 재료 ${CARD_FUSION_REQUIREMENT}장을 선택하세요.`
      : "합성 선택을 취소했습니다.",
  );
}

function startWave(onStartWave) {
  if (currentState !== "BUILD" || !rewardOverlay.hidden) return;
  if (hasStartedWave) {
    discardHand();
    drawHand();
  }
  hasStartedWave = true;
  fusionMode = false;
  selectedSpellUid = null;
  selectedFusionUids.clear();
  lastSelectedCardUid = null;
  onStartWave();
  renderHand();
  drawPreview();
}

// 카드 UI를 만들고 기존 게임 콜백과 덱 상태를 연결합니다.
export function initializeUI({
  onStartWave,
  onSelectCard,
  onDifficultyChange,
  onSpeedChange,
  onMapChange,
  onUpgradeTower,
  onCastTargetedSpell,
}) {
  onSelectCardCallback = onSelectCard;

  // 맵 선택 목록과 타일 프리뷰를 동일한 MAPS 정의에서 구성합니다.
  mapSelect.replaceChildren();
  Object.values(MAPS).forEach((map) => {
    const option = document.createElement("option");
    option.value = map.id;
    option.textContent = map.name;
    mapSelect.append(option);
  });
  mapSelect.value = DEFAULT_MAP_ID;
  mapSelect.addEventListener("change", () => {
    const nextMapId = mapSelect.value;
    if (onMapChange && onMapChange(nextMapId) === false) {
      mapSelect.value = currentMapId;
      return;
    }
    currentMapId = nextMapId;
    previewMap = new GameMap(nextMapId);
    placedTiles.clear();
    drawPreview();
  });
  upgradeButton.addEventListener("click", () => {
    if (onUpgradeTower) onUpgradeTower();
  });
  fusionModeButton.addEventListener("click", toggleFusionMode);
  fuseCardsButton.addEventListener("click", fuseSelectedCards);

  startButton.addEventListener("click", () => startWave(onStartWave));
  // 시작 화면 난이도와 HUD 배속 버튼은 메인 게임 상태 콜백에 반영합니다.
  difficultySelect.addEventListener("change", () => {
    if (onDifficultyChange) onDifficultyChange(difficultySelect.value);
  });
  speedToggle.addEventListener("click", () => {
    const nextSpeed = currentSpeedMultiplier === 1 ? 2 : 1;
    if (onSpeedChange) onSpeedChange(nextSpeed);
  });
  startGameButton.addEventListener("click", () => {
    gameOverlay.hidden = true;
  });
  replayButton.addEventListener("click", () => window.location.reload());

  canvas.addEventListener("pointermove", (event) => {
    pointerPosition = event;
    drawPreview();
  });
  canvas.addEventListener("pointerleave", () => {
    pointerPosition = null;
    drawPreview();
  });
  canvas.addEventListener(
    "pointerdown",
    (event) => {
      pointerPosition = event;
      const selectedUid = selectedSpellUid ?? lastSelectedCardUid;
      const selectedCard = hand.find((card) => card.uid === selectedUid);
      const canTargetDuringCombat =
        currentState === "COMBAT" && selectedCard?.id === "orbital_strike";
      if (
        fusionMode ||
        !selectedCard ||
        (currentState !== "BUILD" && !canTargetDuringCombat)
      ) {
        return;
      }

      const tile = tileAtPointer(event);
      if (!tile) return;
      if (
        selectedCard.kind === "tower" &&
        (isBuildable(tile) || placedTiles.has(tile.key))
      ) {
        pendingBoardClick = true;
        pendingTile = tile;
        window.setTimeout(() => {
          pendingBoardClick = false;
          pendingTile = null;
        }, 0);
      } else if (selectedCard.id === "orbital_strike") {
        event.preventDefault();
        event.stopPropagation();
        if (!onCastTargetedSpell) {
          showMessage("궤도 폭격 콜백이 연결되지 않았습니다.");
          return;
        }
        if (onCastTargetedSpell(selectedCard, tile.x, tile.y)) {
          consumeCard(selectedUid);
          drawPreview();
        }
      }
    },
    true,
  );

  // 기존 맵과 같은 타일 좌표를 이용해 타워 배치 프리뷰를 그립니다.
  canvas.addEventListener("pointerdown", () => drawPreview());
  shuffle(deck);
  drawHand();
  gameOverlay.hidden = false;
}

export function updateUI({
  coreHp,
  maxCoreHp,
  wave,
  maxWaves,
  energy,
  state,
  difficultyId = "normal",
  speedMultiplier = 1,
  mapId = DEFAULT_MAP_ID,
  selectedTower = null,
  towerFusionTargets = [],
  selectedCardIndex,
  message,
}) {
  const previousState = lastState;
  const previousWave = lastWave;
  const previousSelectedUid = lastSelectedCardUid;

  currentState = state;
  currentEnergy = energy;
  currentDifficultyId = DIFFICULTIES[difficultyId] ? difficultyId : "normal";
  currentSpeedMultiplier = speedMultiplier === 2 ? 2 : 1;
  currentMapId = MAPS[mapId] ? mapId : DEFAULT_MAP_ID;
  compatibleTowerTiles = new Set(towerFusionTargets);
  coreHpElement.textContent = `${Math.ceil(coreHp)} / ${maxCoreHp}`;
  coreHpBar.style.width = `${Math.max(0, Math.min(1, coreHp / maxCoreHp)) * 100}%`;
  waveCountElement.textContent = `${Math.min(wave, maxWaves)} / ${maxWaves}`;
  energyCountElement.textContent = String(energy);
  energyMaxElement.textContent = String(MAX_ENERGY);
  energyBar.style.width = `${Math.max(0, Math.min(1, energy / MAX_ENERGY)) * 100}%`;
  difficultySelect.value = currentDifficultyId;
  difficultySelect.disabled = state !== "BUILD" || wave !== 1;
  difficultyIndicator.textContent = DIFFICULTIES[currentDifficultyId].name;
  speedToggle.textContent = `${currentSpeedMultiplier}x`;
  speedToggle.setAttribute("aria-label", `게임 배속 ${currentSpeedMultiplier}배속`);
  speedToggle.setAttribute("aria-pressed", String(currentSpeedMultiplier === 2));
  mapSelect.value = currentMapId;
  mapSelect.disabled = state !== "BUILD" || wave !== 1;
  mapIndicator.textContent = MAPS[currentMapId].name;
  updateTowerUpgrade(selectedTower, state);
  phaseLabel.textContent =
    state === "BUILD" ? "건설 단계" : state === "COMBAT" ? "전투 진행 중" : "게임 종료";
  gameMessage.textContent = message;

  startButton.disabled = state !== "BUILD" || wave > maxWaves || !rewardOverlay.hidden;
  startButton.innerHTML =
    state === "COMBAT"
      ? '<span aria-hidden="true">●</span> 전투 진행 중'
      : wave > maxWaves
        ? '<span aria-hidden="true">✓</span> 방어 성공'
        : '<span aria-hidden="true">▶</span> 웨이브 시작';

  if (pendingBoardClick && previousSelectedUid !== null && selectedCardIndex === null) {
    if (pendingTile) placedTiles.add(pendingTile.key);
    consumeCard(previousSelectedUid);
    lastSelectedCardUid = null;
    pendingBoardClick = false;
    pendingTile = null;
  }

  lastSelectedCardUid = selectedCardIndex;
  if (selectedCardIndex === null && previousState === "BUILD") drawPreview();
  renderHand();
  drawPreview();

  if (previousState === "COMBAT" && wave !== previousWave) {
    if (state === "BUILD") {
      addRewardCards();
      rewardOverlay.hidden = false;
      startButton.disabled = true;
    } else if (state === "GAMEOVER") {
      showResult(coreHp > 0 && wave > maxWaves, message, currentDifficultyId);
    }
  } else if (state === "GAMEOVER" && previousState !== "GAMEOVER") {
    showResult(coreHp > 0 && wave > maxWaves, message, currentDifficultyId);
  }

  lastState = state;
  lastWave = wave;
}
