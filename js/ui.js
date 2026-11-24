import { SPELLS, STARTING_HAND, TOWERS } from "./data.js";

const handElement = document.querySelector("#hand");
const startButton = document.querySelector("#start-wave");
const coreHpElement = document.querySelector("#core-hp");
const coreHpBar = document.querySelector("#core-hp-bar");
const waveCountElement = document.querySelector("#wave-count");
const energyCountElement = document.querySelector("#energy-count");
const phaseLabel = document.querySelector("#phase-label");
const gameMessage = document.querySelector("#game-message");

function getCardData(card) {
  return card.kind === "tower" ? TOWERS[card.id] : SPELLS[card.id];
}

// 카드 UI를 만들고 선택/주문 발동 이벤트를 게임 로직에 전달합니다.
export function initializeUI({ onStartWave, onSelectCard }) {
  handElement.replaceChildren();
  STARTING_HAND.forEach((card, index) => {
    const config = getCardData(card);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card";
    button.dataset.kind = card.kind;
    button.dataset.index = String(index);
    button.innerHTML = `
      <span class="card-type">${card.kind === "tower" ? "TOWER" : "SPELL"}</span>
      <span class="card-title">${config.name}</span>
      <span class="card-description">${config.description}</span>
      <span class="card-cost">✦ ${config.cost}</span>
    `;
    button.addEventListener("click", () => onSelectCard(card, index));
    handElement.append(button);
  });
  startButton.addEventListener("click", onStartWave);
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
  coreHpElement.textContent = `${Math.ceil(coreHp)} / ${maxCoreHp}`;
  coreHpBar.style.width = `${Math.max(0, Math.min(1, coreHp / maxCoreHp)) * 100}%`;
  waveCountElement.textContent = `${Math.min(wave, maxWaves)} / ${maxWaves}`;
  energyCountElement.textContent = String(energy);
  phaseLabel.textContent =
    state === "BUILD" ? "건설 단계" : state === "COMBAT" ? "전투 진행 중" : "게임 종료";
  gameMessage.textContent = message;

  const canBuild = state === "BUILD";
  startButton.disabled = !canBuild || wave > maxWaves;
  startButton.innerHTML =
    state === "COMBAT"
      ? '<span aria-hidden="true">●</span> 전투 진행 중'
      : wave > maxWaves
        ? '<span aria-hidden="true">✓</span> 방어 성공'
        : '<span aria-hidden="true">▶</span> 웨이브 시작';

  Array.from(handElement.children).forEach((button, index) => {
    const card = STARTING_HAND[index];
    const config = getCardData(card);
    button.classList.toggle("selected", index === selectedCardIndex);
    button.disabled =
      state === "GAMEOVER" ||
      (card.kind === "tower" && !canBuild) ||
      energy < config.cost;
    button.setAttribute("aria-pressed", String(index === selectedCardIndex));
  });
}