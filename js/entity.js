import { drawLoadedImage } from "./image-assets.js";
import { MAX_CARD_RANK, TOWER_UPGRADES } from "./data.js";

// 타워와 몬스터 스프라이트는 이미지 위쪽을 향하므로 각도 보정값을 더합니다.
const SPRITE_ANGLE_OFFSET = Math.PI / 2;

// 사거리 안에서 경로를 가장 앞서 진행한 적을 찾아 공격합니다.
export function findTargetInRange(tower, monsters) {
  let target = null;
  let bestWaypointIndex = -1;
  let bestProgress = -1;
  let bestDistance = Infinity;

  for (const monster of monsters) {
    if (!monster.alive) continue;
    const distance = Math.hypot(monster.x - tower.x, monster.y - tower.y);
    if (distance > tower.range) continue;

    const waypointIndex = monster.waypointIndex ?? 0;
    const nextWaypoint = monster.waypoints && monster.waypoints[waypointIndex];
    const progress = nextWaypoint
      ? -Math.hypot(nextWaypoint.x - monster.x, nextWaypoint.y - monster.y)
      : 0;

    if (
      waypointIndex > bestWaypointIndex ||
      (waypointIndex === bestWaypointIndex && progress > bestProgress) ||
      (waypointIndex === bestWaypointIndex && progress === bestProgress && distance < bestDistance)
    ) {
      target = monster;
      bestWaypointIndex = waypointIndex;
      bestProgress = progress;
      bestDistance = distance;
    }
  }
  return target;
}

export class Tower {
  constructor(config, col, row, x, y, level = 1) {
    this.baseConfig = config;
    this.col = col;
    this.row = row;
    this.x = x;
    this.y = y;
    this.angle = -Math.PI / 2;
    this.applyLevel(level);
    this.cooldown = Math.random() * this.config.fireRate;
  }

  get nextUpgradeCost() {
    return TOWER_UPGRADES[this.level + 1]?.cost ?? null;
  }

  get canUpgrade() {
    return Boolean(TOWER_UPGRADES[this.level + 1]);
  }

  // 강화 카드로 소환할 때도 일반 강화와 같은 원본 능력치 배율을 적용합니다.
  applyLevel(level) {
    const boundedLevel = Math.max(1, Math.min(MAX_CARD_RANK, Math.floor(level || 1)));
    const upgrade = TOWER_UPGRADES[boundedLevel];
    this.level = upgrade ? boundedLevel : 1;
    this.config = {
      ...this.baseConfig,
      ...(upgrade && {
        damage: Math.round(this.baseConfig.damage * upgrade.damageMultiplier),
        fireRate: this.baseConfig.fireRate * upgrade.fireRateMultiplier,
        range: Math.round(this.baseConfig.range * upgrade.rangeMultiplier),
      }),
    };
    this.range = this.config.range;
  }

  // 강화 수치는 원본 설정을 기준으로 계산해 레벨업 때 누적 오차를 방지합니다.
  upgrade() {
    if (!this.canUpgrade) return false;
    this.applyLevel(this.level + 1);
    this.cooldown = Math.min(this.cooldown, this.config.fireRate);
    return true;
  }

  update(deltaTime, monsters, projectiles) {
    this.cooldown = Math.max(0, this.cooldown - deltaTime);
    const target = findTargetInRange(this, monsters);
    if (!target) return;
    // 발사 대기 중에도 조준 방향을 갱신하고, 목표가 없으면 마지막 각도를 유지합니다.
    this.angle = Math.atan2(target.y - this.y, target.x - this.x);
    if (this.cooldown > 0) return;

    projectiles.push(new Projectile(this, target, monsters));
    this.cooldown = this.config.fireRate;
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = "rgb(5 12 16 / 55%)";
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 19, 28, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + SPRITE_ANGLE_OFFSET);
    if (!drawLoadedImage(ctx, this.config.id, -39, -43, 78, 78)) {
      ctx.fillStyle = "#263b42";
      ctx.fillRect(-23, -8, 46, 31);
      ctx.fillStyle = this.config.color;
      ctx.fillRect(-18, -16, 36, 34);
      // 포신은 로컬 위쪽을 향해 그려 회전 각도에 맞춰 목표를 조준합니다.
      ctx.fillStyle = "#d9fff3";
      ctx.fillRect(-5, -27, 10, 15);
      ctx.fillStyle = this.config.color;
      ctx.beginPath();
      ctx.arc(0, -8, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 레벨 배지를 스프라이트 회전과 분리해 항상 똑바로 표시합니다.
    ctx.save();
    ctx.fillStyle = "#10251f";
    ctx.strokeStyle = "#8ff5d0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x + 25, this.y - 27, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#d9fff3";
    ctx.font = "bold 9px 'DM Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`L${this.level}`, this.x + 25, this.y - 27);
    ctx.restore();
  }
}

export class Monster {
  constructor(config, waypoints) {
    this.config = config;
    this.waypoints = waypoints;
    this.x = waypoints[0].x;
    this.y = waypoints[0].y;
    this.waypointIndex = 1;
    this.angle = 0;
    this.updateAngle();
    this.hp = config.hp;
    this.maxHp = config.hp;
    this.alive = true;
    this.frozenTime = 0;
    this.slowTime = 0;
    this.slowFactor = 1;
  }

  // 다음 웨이포인트를 향하는 벡터에서 현재 이동 각도를 계산합니다.
  updateAngle() {
    const nextWaypoint = this.waypoints[this.waypointIndex];
    if (!nextWaypoint) return;
    const dx = nextWaypoint.x - this.x;
    const dy = nextWaypoint.y - this.y;
    if (dx !== 0 || dy !== 0) this.angle = Math.atan2(dy, dx);
  }

  // 상태이상 시간을 갱신한 뒤 프레임률에 관계없이 일정하게 이동합니다.
  update(deltaTime) {
    this.frozenTime = Math.max(0, this.frozenTime - deltaTime);
    this.slowTime = Math.max(0, this.slowTime - deltaTime);
    if (this.slowTime === 0) this.slowFactor = 1;

    this.updateAngle();
    if (this.frozenTime > 0) return this.waypointIndex >= this.waypoints.length;

    let remainingDistance = this.config.speed * this.slowFactor * deltaTime;
    while (remainingDistance > 0 && this.waypointIndex < this.waypoints.length) {
      const target = this.waypoints[this.waypointIndex];
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= remainingDistance) {
        this.x = target.x;
        this.y = target.y;
        remainingDistance -= distance;
        this.waypointIndex += 1;
      } else {
        this.x += (dx / distance) * remainingDistance;
        this.y += (dy / distance) * remainingDistance;
        remainingDistance = 0;
      }
    }
    this.updateAngle();
    return this.waypointIndex >= this.waypoints.length;
  }

  takeDamage(amount) {
    if (!this.alive || amount <= 0) return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) this.alive = false;
  }

  applyFreeze(duration) {
    this.frozenTime = Math.max(this.frozenTime, duration);
  }

  applySlow(duration, factor = 0.6) {
    this.slowTime = Math.max(this.slowTime, duration);
    this.slowFactor = Math.min(this.slowFactor, Math.max(0, Math.min(1, factor)));
  }

  draw(ctx) {
    const radius = this.config.radius;
    const imageSize = radius * 2.8;
    const spriteCenterY = radius - imageSize / 2;
    ctx.save();
    ctx.fillStyle = "rgb(0 0 0 / 28%)";
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + radius * 0.7, radius * 1.05, radius * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + SPRITE_ANGLE_OFFSET);
    const hasImage = drawLoadedImage(
      ctx,
      this.config.id,
      -imageSize / 2,
      spriteCenterY - imageSize / 2,
      imageSize,
      imageSize,
    );
    if (hasImage && (this.frozenTime > 0 || this.slowTime > 0)) {
      ctx.strokeStyle = this.frozenTime > 0 ? "#b9f4ff" : "#83cfff";
      ctx.lineWidth = 2;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(radius, imageSize * 0.38), 0, Math.PI * 2);
      ctx.stroke();
    } else if (!hasImage) {
      ctx.fillStyle = this.frozenTime > 0
        ? "#b9f4ff"
        : this.slowTime > 0
          ? "#83cfff"
          : this.config.color;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgb(255 255 255 / 28%)";
      ctx.beginPath();
      ctx.arc(-radius * 0.32, -radius * 0.35, radius * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    const barWidth = hasImage ? Math.max(radius * 2, imageSize * 0.9) : radius * 2;
    const barY = hasImage
      ? this.y + spriteCenterY - imageSize / 2 - 8
      : this.y - radius - 8;
    const hpRatio = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = "#273333";
    ctx.fillRect(this.x - barWidth / 2, barY, barWidth, 4);
    ctx.fillStyle = hpRatio > 0.35 ? "#7af0ac" : "#ff786e";
    ctx.fillRect(this.x - barWidth / 2, barY, barWidth * hpRatio, 4);
    ctx.restore();
  }
}

export class Projectile {
  constructor(tower, target, monsters = []) {
    this.x = tower.x + Math.cos(tower.angle) * 24;
    this.y = tower.y + Math.sin(tower.angle) * 24;
    this.target = target;
    this.monsters = monsters;
    this.damage = tower.config.damage;
    this.speed = tower.config.projectileSpeed;
    this.color = tower.config.color;
    this.splashRadius = tower.config.splashRadius || tower.config.radius || 0;
    this.slowDuration = tower.config.slowDuration || 0;
    this.slowFactor = tower.config.slowFactor ?? 0.6;
    this.alive = true;
  }

  update(deltaTime, monsters = this.monsters) {
    const targetIsMonster = typeof this.target.alive === "boolean";
    if (targetIsMonster && !this.target.alive) {
      this.alive = false;
      return;
    }

    const targetX = this.target.x;
    const targetY = this.target.y;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.hypot(dx, dy);
    const travel = this.speed * deltaTime;
    const targetRadius = targetIsMonster ? this.target.config.radius : 0;
    if (distance <= travel + targetRadius) {
      this.x = targetX;
      this.y = targetY;
      this.impact(monsters);
      this.alive = false;
      return;
    }
    if (distance === 0) {
      this.impact(monsters);
      this.alive = false;
      return;
    }
    this.x += (dx / distance) * travel;
    this.y += (dy / distance) * travel;
  }

  // 단일 명중 또는 착탄 지점 기준 범위 피해와 둔화를 적용합니다.
  impact(monsters) {
    if (!this.splashRadius) {
      if (this.target.alive) this.applyHit(this.target);
      return;
    }

    for (const monster of monsters) {
      if (!monster.alive) continue;
      const distance = Math.hypot(monster.x - this.x, monster.y - this.y);
      if (distance <= this.splashRadius) this.applyHit(monster);
    }
  }

  applyHit(monster) {
    monster.takeDamage(this.damage);
    if (this.slowDuration > 0 && monster.alive) {
      monster.applySlow(this.slowDuration, this.slowFactor);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}