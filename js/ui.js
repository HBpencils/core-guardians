import { SPELLS, STARTING_HAND, TOWERS } from "./data.js";

const handElement = document.querySelector("#hand");
const startButton = document.querySelector("#start-wave");
const startGameButton = document.querySelector("#start-game");
const gameOverlay = document.querySelector("#game-overlay");
const rewardOverlay = document.querySelector("#reward-overlay");
const rewardOptions = document.querySelector("#reward-options");
const resultOverlay = document.querySelector("#result-overlay");
const resultModal = resultOverlay.querySelector(".result-modal");
const resultTitle = document.querySelector("#result-title");
const resultMessage = document.querySelector("#result-message");
const replayButton = document.querySelector("#replay-game");
const handCount = document.querySelector("#hand-count");
const coreHpElement = document.querySelector("#core-hp");
const coreHpBar = document.querySelector("#core-hp-bar");
const waveCountElement = document.querySelector("#wave-count");
const energyCountElement = document.querySelector("#energy-count");
const energyMaxElement = document.querySelector("#energy-max");
const energyBar = document.querySelector("#energy-bar");
const phaseLabel = document.querySelector("#phase-label");
const gameMessage = document.querySelector("#game-message");
const canvas = document.querySelector("#game-canvas");
const previewCanvas = document.querySelector("#interaction-overlay");
const previewContext = previewCanvas.getContext("2d");

const HAND_LIMIT = 4;
const MAX_ENERGY = 10;
const GRID_COLUMNS = 10;
const GRID_ROWS = 6;
const TILE_SIZE = 100;
const CORE_TILE = "5,3";
const PATH_TILES = new Set([
  "0,2", "1,2", "2,2", "3,2",
  "3,3", "3,4", "4,4", "5,4", "5,3",
]);

let deck = STARTING_HAND.map((card, sourceIndex) => ({ ...card, sourceIndex }));
let hand = [];
let discard = [];
let selectedSpellIndex = null;
let lastSelectedCardIndex = null;
let lastState = null;
let lastWave = null;
let currentState = "BUILD";
let currentEnergy = MAX_ENERGY;
let hasStartedWave = false;
let pointerPosition = null;
let pendingBoardClick = false;
let pendingTile = null;
const placedTiles = new Set();

function getCardData(card) {
  return card.kind === "tower" ? TOWERS[card.id] : SPELLS[card.id];
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

function drawHand() {
  let blockedDraws = 0;
  while (hand.length < HAND_LIMIT) {
    recycleDiscard();
    if (deck.length === 0 || blockedDraws >= deck.length) break;

    const card = deck.shift();
    if (hand.some((heldCard) => heldCard.sourceIndex === card.sourceIndex)) {
      deck.push(card);
      blockedDraws += 1;
      if (blockedDraws >= deck.length) {
        if (discard.length === 0) break;
        deck.push(...discard);
        discard = [];
        shuffle(deck);
        blockedDraws = 0;
      }
      continue;
    }

    hand.push(card);
    blockedDraws = 0;
  }
  renderHand();
}

function discardHand() {
  discard.push(...hand);
  hand = [];
}

function consumeCard(sourceIndex) {
  const cardIndex = hand.findIndex((card) => card.sourceIndex === sourceIndex);
  if (cardIndex < 0) return;
  discard.push(hand.splice(cardIndex, 1)[0]);
  if (selectedSpellIndex === sourceIndex) selectedSpellIndex = null;
  renderHand();
}

function renderHand() {
  const heldIndexes = new Set(hand.map((card) => card.sourceIndex));
  Array.from(handElement.children).forEach((button, index) => {
    const card = STARTING_HAND[index];
    const config = getCardData(card);
    const inHand = heldIndexes.has(index);
    button.hidden = !inHand;
    button.classList.toggle("selected", index === lastSelectedCardIndex || index === selectedSpellIndex);
    button.disabled =
      !inHand ||
      currentState === "GAMEOVER" ||
      (card.kind === "tower" && currentState !== "BUILD") ||
      currentEnergy < config.cost;
    button.setAttribute("aria-pressed", String(index === lastSelectedCardIndex || index === selectedSpellIndex));
  });
  handCount.textContent = `${hand.length} / ${HAND_LIMIT}`;
}

function createCardButton(card, index, className = "card") {
  const config = getCardData(card);
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.dataset.kind = card.kind;
  button.dataset.index = String(index);
  button.setAttribute("aria-label", `${config.name}, 에너지 ${config.cost}. ${config.description}`);
  button.title = `${config.name} · 에너지 ${config.cost} · ${config.description}`;

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
  const tooltip = document.createElement("span");
  tooltip.className = "card-tooltip";
  tooltip.textContent = config.description;

  button.append(type, title, description, cost, tooltip);
  return button;
}

function tileAtPointer(event) {
  const bounds = canvas.getBoundingClientRect();
  const x = ((event.clientX - bounds.left) / bounds.width) * 1000;
  const y = ((event.clientY - bounds.top) / bounds.height) * 600;
  const col = Math.floor(x / TILE_SIZE);
  const row = Math.floor(y / TILE_SIZE);
  return { x, y, col, row, key: `${col},${row}` };
}

function isBuildable(tile) {
  return (
    tile.col >= 0 &&
    tile.col < GRID_COLUMNS &&
    tile.row >= 0 &&
    tile.row < GRID_ROWS &&
    !PATH_TILES.has(tile.key) &&
    tile.key !== CORE_TILE &&
    !placedTiles.has(tile.key)
  );
}

function drawPreview() {
  previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  if (!pointerPosition || currentState !== "BUILD") return;

  const selectedIndex = lastSelectedCardIndex ?? selectedSpellIndex;
  if (selectedIndex === null) return;
  const card = STARTING_HAND[selectedIndex];
  if (!card || (card.kind === "tower" && selectedIndex !== lastSelectedCardIndex)) return;

  const config = getCardData(card);
  const tile = tileAtPointer(pointerPosition);
  const centerX = tile.col * TILE_SIZE + TILE_SIZE / 2;
  const centerY = tile.row * TILE_SIZE + TILE_SIZE / 2;
  const canPlace = card.kind === "spell" || isBuildable(tile);

  previewContext.save();
  previewContext.fillStyle = canPlace ? "rgb(72 235 161 / 24%)" : "rgb(255 89 89 / 27%)";
  previewContext.strokeStyle = canPlace ? "#70f2b5" : "#ff7777";
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

function handleCardClick(card, index, onSelectCard) {
  if (currentState === "GAMEOVER" || !hand.some((heldCard) => heldCard.sourceIndex === index)) return;
  const config = getCardData(card);
  if (currentEnergy < config.cost) {
    showMessage(`에너지가 부족합니다. (${config.cost} 필요)`);
    return;
  }

  if (card.kind === "tower") {
    selectedSpellIndex = null;
    onSelectCard(card, index);
    drawPreview();
    return;
  }

  if (config.effect === "energy" || config.effect === "damage" || config.effect === "heal") {
    const previousEnergy = currentEnergy;
    selectedSpellIndex = null;
    onSelectCard(card, index);
    if (config.effect === "energy" || currentEnergy < previousEnergy) consumeCard(index);
    return;
  }

  selectedSpellIndex = selectedSpellIndex === index ? null : index;
  renderHand();
  drawPreview();
  showMessage(
    config.effect === "targeted_damage"
      ? "폭격 지점 미리보기 — 현재 게임 콜백은 위치 지정 주문을 지원하지 않습니다."
      : "현재 게임 콜백에서 이 주문 효과를 지원하지 않습니다.",
  );
}

function addRewardCards() {
  rewardOptions.replaceChildren();
  const choices = STARTING_HAND.slice();
  shuffle(choices);
  choices.slice(0, 3).forEach((card) => {
    const sourceIndex = STARTING_HAND.indexOf(card);
    const button = createCardButton(card, sourceIndex, "card reward-card");
    button.addEventListener("click", () => {
      deck.push({ ...card, sourceIndex });
      rewardOverlay.hidden = true;
      startButton.disabled = currentState !== "BUILD";
      showMessage(`${getCardData(card).name} 카드를 덱에 추가했습니다.`);
      drawPreview();
    });
    rewardOptions.append(button);
  });
}

function showResult(won, message) {
  resultModal.dataset.result = won ? "victory" : "defeat";
  resultTitle.textContent = won ? "코어 방어 성공" : "코어 파괴";
  resultMessage.textContent = message;
  resultOverlay.hidden = false;
}

function startWave(onStartWave) {
  if (currentState !== "BUILD" || !rewardOverlay.hidden) return;
  if (hasStartedWave) {
    discardHand();
    selectedSpellIndex = null;
    drawHand();
  }
  hasStartedWave = true;
  lastSelectedCardIndex = null;
  onStartWave();
  renderHand();
  drawPreview();
}

// 카드 UI를 만들고 기존 게임 콜백과 덱 상태를 연결합니다.
export function initializeUI({ onStartWave, onSelectCard }) {
  handElement.replaceChildren();
  STARTING_HAND.forEach((card, index) => {
    const button = createCardButton(card, index);
    button.addEventListener("click", () => handleCardClick(card, index, onSelectCard));
    handElement.append(button);
  });

  startButton.addEventListener("click", () => startWave(onStartWave));
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
      const selectedIndex = lastSelectedCardIndex ?? selectedSpellIndex;
      const selectedCard = selectedIndex === null ? null : STARTING_HAND[selectedIndex];
      if (currentState !== "BUILD" || !selectedCard) return;

      const tile = tileAtPointer(event);
      if (selectedCard.kind === "tower" && isBuildable(tile)) {
        pendingBoardClick = true;
        pendingTile = tile;
        window.setTimeout(() => {
          pendingBoardClick = false;
          pendingTile = null;
        }, 0);
      } else if (selectedCard.id === "orbital_strike") {
        showMessage("궤도 폭격 위치를 선택했지만, 현재 게임 콜백은 위치를 전달하지 않습니다.");
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
  selectedCardIndex,
  message,
}) {
  const previousState = lastState;
  const previousWave = lastWave;
  const previousSelectedIndex = lastSelectedCardIndex;

  currentState = state;
  currentEnergy = energy;
  coreHpElement.textContent = `${Math.ceil(coreHp)} / ${maxCoreHp}`;
  coreHpBar.style.width = `${Math.max(0, Math.min(1, coreHp / maxCoreHp)) * 100}%`;
  waveCountElement.textContent = `${Math.min(wave, maxWaves)} / ${maxWaves}`;
  energyCountElement.textContent = String(energy);
  energyMaxElement.textContent = String(MAX_ENERGY);
  energyBar.style.width = `${Math.max(0, Math.min(1, energy / MAX_ENERGY)) * 100}%`;
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

  if (pendingBoardClick && previousSelectedIndex !== null && selectedCardIndex === null) {
    if (pendingTile) placedTiles.add(pendingTile.key);
    consumeCard(previousSelectedIndex);
    lastSelectedCardIndex = null;
    pendingBoardClick = false;
    pendingTile = null;
  }

  lastSelectedCardIndex = selectedCardIndex;
  if (selectedCardIndex === null && previousState === "BUILD") drawPreview();
  renderHand();
  drawPreview();

  if (previousState === "COMBAT" && wave !== previousWave) {
    if (state === "BUILD") {
      addRewardCards();
      rewardOverlay.hidden = false;
      startButton.disabled = true;
    } else if (state === "GAMEOVER") {
      showResult(coreHp > 0 && wave > maxWaves, message);
    }
  } else if (state === "GAMEOVER" && previousState !== "GAMEOVER") {
    showResult(coreHp > 0 && wave > maxWaves, message);
  }

  lastState = state;
  lastWave = wave;
}
