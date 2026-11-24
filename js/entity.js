import { drawLoadedImage } from "./image-assets.js";

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
  constructor(config, col, row, x, y) {
    this.config = config;
    this.col = col;
    this.row = row;
    this.x = x;
    this.y = y;
    this.range = config.range;
    this.cooldown = Math.random() * config.fireRate;
  }

  update(deltaTime, monsters, projectiles) {
    this.cooldown = Math.max(0, this.cooldown - deltaTime);
    if (this.cooldown > 0) return;

    const target = findTargetInRange(this, monsters);
    if (!target) return;
    projectiles.push(new Projectile(this, target, monsters));
    this.cooldown = this.config.fireRate;
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = "rgb(5 12 16 / 55%)";
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 19, 28, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!drawLoadedImage(ctx, this.config.id, this.x - 39, this.y - 43, 78, 78)) {
      ctx.fillStyle = "#263b42";
      ctx.fillRect(this.x - 23, this.y - 8, 46, 31);
      ctx.fillStyle = this.config.color;
      ctx.fillRect(this.x - 18, this.y - 16, 36, 34);
      ctx.fillStyle = "#d9fff3";
      ctx.fillRect(this.x - 5, this.y - 27, 10, 15);
      ctx.fillStyle = this.config.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y - 8, 9, 0, Math.PI * 2);
      ctx.fill();
    }
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
    this.hp = config.hp;
    this.maxHp = config.hp;
    this.alive = true;
    this.frozenTime = 0;
    this.slowTime = 0;
    this.slowFactor = 1;
  }

  // 상태이상 시간을 갱신한 뒤 프레임률에 관계없이 일정하게 이동합니다.
  update(deltaTime) {
    this.frozenTime = Math.max(0, this.frozenTime - deltaTime);
    this.slowTime = Math.max(0, this.slowTime - deltaTime);
    if (this.slowTime === 0) this.slowFactor = 1;

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
    const imageTop = this.y + radius - imageSize;
    ctx.save();
    ctx.fillStyle = "rgb(0 0 0 / 28%)";
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + radius * 0.7, radius * 1.05, radius * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    const hasImage = drawLoadedImage(
      ctx,
      this.config.id,
      this.x - imageSize / 2,
      imageTop,
      imageSize,
      imageSize,
    );
    if (hasImage && (this.frozenTime > 0 || this.slowTime > 0)) {
      ctx.strokeStyle = this.frozenTime > 0 ? "#b9f4ff" : "#83cfff";
      ctx.lineWidth = 2;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(radius, imageSize * 0.38), 0, Math.PI * 2);
      ctx.stroke();
    } else if (!hasImage) {
      ctx.fillStyle = this.frozenTime > 0
        ? "#b9f4ff"
        : this.slowTime > 0
          ? "#83cfff"
          : this.config.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgb(255 255 255 / 28%)";
      ctx.beginPath();
      ctx.arc(this.x - radius * 0.32, this.y - radius * 0.35, radius * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    const barWidth = hasImage ? Math.max(radius * 2, imageSize * 0.9) : radius * 2;
    const barY = hasImage ? imageTop - 8 : this.y - radius - 8;
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
    this.x = tower.x;
    this.y = tower.y - 12;
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