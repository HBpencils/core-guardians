const ASSET_PATHS = {
  machine_gun: "../assets/machine gun turret.png",
  mortar: "../assets/heavy mortar cannon.png",
  frost_tower: "../assets/ice crystal frost tower.png",
  slime: "../assets/cute green slime monster.png",
  goblin: "../assets/fast armored goblin.png",
  golem: "../assets/giant stone golem.png",
  dragon: "../assets/red boss dragon.png",
  core: "../assets/core.png",
};

const images = {};

if (typeof Image !== "undefined") {
  for (const [id, path] of Object.entries(ASSET_PATHS)) {
    const image = new Image();
    image.src = new URL(path, import.meta.url).href;
    images[id] = image;
  }
}

// 이미지가 완전히 로드된 경우에만 그려 호출부의 도형 대체 렌더링을 보장합니다.
export function drawLoadedImage(ctx, id, x, y, width, height) {
  const image = images[id];
  if (!image || !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
    return false;
  }

  ctx.drawImage(image, x, y, width, height);
  return true;
}
