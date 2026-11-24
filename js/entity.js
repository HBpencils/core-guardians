// 사거리 안에서 코어에 가장 가까운 적을 찾아 공격합니다.
export function findTargetInRange(tower, monsters) {
  let target = null;
  let nearestDistance = tower.range;
  for (const monster of monsters) {
    if (!monster.alive) continue;
    const distance = Math.hypot(monster.x - tower.x, monster.y - tower.y);
    if (distance <= nearestDistance) {
      nearestDistance = distance;
      target = monster;
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
    projectiles.push(new Projectile(this, target));
    this.cooldown = this.config.fireRate;
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = "rgb(5 12 16 / 55%)";
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 19, 28, 10, 0, 0, Math.PI * 2);
    ctx.fill();
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
  }

  // 이동 속도를 deltaTime에 곱해 프레임률에 관계없이 일정하게 이동합니다.
  update(deltaTime) {
    let remainingDistance = this.config.speed * deltaTime;
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
    this.hp -= amount;
    if (this.hp <= 0) this.alive = false;
  }

  draw(ctx) {
    const radius = this.config.radius;
    ctx.save();
    ctx.fillStyle = "rgb(0 0 0 / 28%)";
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + radius * 0.7, radius * 1.05, radius * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.config.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgb(255 255 255 / 28%)";
    ctx.beginPath();
    ctx.arc(this.x - radius * 0.32, this.y - radius * 0.35, radius * 0.25, 0, Math.PI * 2);
    ctx.fill();

    const barWidth = radius * 2;
    const hpRatio = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = "#273333";
    ctx.fillRect(this.x - barWidth / 2, this.y - radius - 8, barWidth, 4);
    ctx.fillStyle = hpRatio > 0.35 ? "#7af0ac" : "#ff786e";
    ctx.fillRect(this.x - barWidth / 2, this.y - radius - 8, barWidth * hpRatio, 4);
    ctx.restore();
  }
}

export class Projectile {
  constructor(tower, target) {
    this.x = tower.x;
    this.y = tower.y - 12;
    this.target = target;
    this.damage = tower.config.damage;
    this.speed = tower.config.projectileSpeed;
    this.color = tower.config.color;
    this.alive = true;
  }

  update(deltaTime) {
    if (!this.target.alive) {
      this.alive = false;
      return;
    }
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.hypot(dx, dy);
    const travel = this.speed * deltaTime;
    if (distance <= travel + this.target.config.radius) {
      this.target.takeDamage(this.damage);
      this.alive = false;
      return;
    }
    this.x += (dx / distance) * travel;
    this.y += (dy / distance) * travel;
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