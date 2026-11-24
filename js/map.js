// 게임 맵은 1000x600 논리 좌표를 사용해 화면 크기와 무관하게 동작합니다.
export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 600;
export const GRID_COLUMNS = 10;
export const GRID_ROWS = 6;
export const TILE_SIZE = MAP_WIDTH / GRID_COLUMNS;

export const WAYPOINT_TILES = [
  { col: 0, row: 2 },
  { col: 3, row: 2 },
  { col: 3, row: 4 },
  { col: 5, row: 4 },
  { col: 5, row: 3 },
];

const CORE_TILE = { col: 5, row: 3 };

export class GameMap {
  constructor() {
    // 경로는 타일 중심을 잇고, 모든 유닛은 이 좌표를 따라 이동합니다.
    this.waypoints = WAYPOINT_TILES.map(({ col, row }) => ({
      x: col * TILE_SIZE + TILE_SIZE / 2,
      y: row * TILE_SIZE + TILE_SIZE / 2,
    }));

    this.pathTiles = new Set();
    WAYPOINT_TILES.slice(1).forEach((target, index) => {
      const start = WAYPOINT_TILES[index];
      const stepX = Math.sign(target.col - start.col);
      const stepY = Math.sign(target.row - start.row);
      let col = start.col;
      let row = start.row;
      this.pathTiles.add(`${col},${row}`);
      while (col !== target.col || row !== target.row) {
        col += stepX;
        row += stepY;
        this.pathTiles.add(`${col},${row}`);
      }
    });
    this.pathTiles.add(`${WAYPOINT_TILES[0].col},${WAYPOINT_TILES[0].row}`);
  }

  // 배경, 경로, 격자, 중앙 코어를 캔버스에 그립니다.
  draw(ctx, coreHp, maxCoreHp) {
    ctx.fillStyle = "#0e191d";
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let col = 0; col < GRID_COLUMNS; col += 1) {
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;
        const isPath = this.pathTiles.has(`${col},${row}`);
        ctx.fillStyle = isPath
          ? "#243b39"
          : (row + col) % 2 === 0
            ? "#142329"
            : "#17272d";
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        if (isPath) {
          ctx.fillStyle = "rgb(100 243 193 / 4%)";
          ctx.fillRect(x + 7, y + 7, TILE_SIZE - 14, TILE_SIZE - 14);
        }
      }
    }

    // 경로의 중앙선을 그려 적의 진행 방향을 쉽게 알아볼 수 있게 합니다.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.waypoints[0].x, this.waypoints[0].y);
    this.waypoints.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.strokeStyle = "rgb(112 235 194 / 34%)";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 10]);
    ctx.stroke();
    ctx.restore();

    // 보드 테두리와 타일 격자를 그립니다.
    ctx.strokeStyle = "rgb(132 164 169 / 13%)";
    ctx.lineWidth = 1;
    for (let col = 0; col <= GRID_COLUMNS; col += 1) {
      ctx.beginPath();
      ctx.moveTo(col * TILE_SIZE + 0.5, 0);
      ctx.lineTo(col * TILE_SIZE + 0.5, MAP_HEIGHT);
      ctx.stroke();
    }
    for (let row = 0; row <= GRID_ROWS; row += 1) {
      ctx.beginPath();
      ctx.moveTo(0, row * TILE_SIZE + 0.5);
      ctx.lineTo(MAP_WIDTH, row * TILE_SIZE + 0.5);
      ctx.stroke();
    }

    this.drawCore(ctx, coreHp, maxCoreHp);
  }

  // 경로와 코어가 아닌 빈 타일만 타워 배치 위치로 인정합니다.
  isBuildable(col, row) {
    return (
      col >= 0 &&
      col < GRID_COLUMNS &&
      row >= 0 &&
      row < GRID_ROWS &&
      !this.pathTiles.has(`${col},${row}`) &&
      !(col === CORE_TILE.col && row === CORE_TILE.row)
    );
  }

  getTileAt(x, y) {
    return {
      col: Math.floor(x / TILE_SIZE),
      row: Math.floor(y / TILE_SIZE),
    };
  }

  getTileCenter(col, row) {
    return {
      x: col * TILE_SIZE + TILE_SIZE / 2,
      y: row * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  drawCore(ctx, coreHp, maxCoreHp) {
    const center = this.getTileCenter(CORE_TILE.col, CORE_TILE.row);
    const ratio = Math.max(0, coreHp / maxCoreHp);
    ctx.save();
    ctx.shadowColor = "#64f3c1";
    ctx.shadowBlur = 22;
    ctx.fillStyle = "#153f3d";
    ctx.beginPath();
    ctx.arc(center.x, center.y, 31, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#75f3d0";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(center.x, center.y, 23, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#b5ffe8";
    ctx.beginPath();
    ctx.moveTo(center.x, center.y - 15);
    ctx.lineTo(center.x + 13, center.y);
    ctx.lineTo(center.x, center.y + 15);
    ctx.lineTo(center.x - 13, center.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#b4c9c7";
    ctx.font = "11px 'DM Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("CORE", center.x, center.y + 43);
    ctx.fillStyle = "#263c3a";
    ctx.fillRect(center.x - 23, center.y + 50, 46, 4);
    ctx.fillStyle = ratio > 0.3 ? "#64f3c1" : "#ff746d";
    ctx.fillRect(center.x - 23, center.y + 50, 46 * ratio, 4);
  }
}