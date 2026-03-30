/**
 * GNNgame: Space Defender - ULTIMATE (Collectible Power-up Drop System)
 * Ödüller göktaşı gibi düşer, tıklanarak toplanır.
 */
export default class SpaceDefender extends Phaser.Scene {
    constructor() {
        super('SpaceDefender');
    }

    init() {
        this.score        = 0;
        this.lives        = 3;
        this.gameOver     = false;
        this.width        = 1280;
        this.height       = 720;
        this.meteors      = [];
        this.drops        = [];      // Ekrandaki ödül simgeleri
        this.hitsCount    = 0;
        this.lastAutoFire = 0;
        this.spawnDelay   = 1200;
        this.speedMul     = 1.0;
        this._lastDiff    = null;

        // Aktif güçlendirmeler (ms, 0 = pasif)
        this.pw = { shield:0, rapid:0, triple:0, magnet:0, drone:0, nuke:false };
    }

    // ───────────────────────── CREATE ─────────────────────────
    create() {
        this.add.rectangle(0, 0, this.width, this.height, 0x050811).setOrigin(0);
        this.buildGalaxy();
        this.buildStars();
        this.buildParticles();
        this.buildCannon();
        this.buildUI();
        this.buildBarrier();
        this.buildDrone();

        this.spawnTimer = this.time.addEvent({
            delay: this.spawnDelay,
            callback: this.spawnMeteor,
            callbackScope: this,
            loop: true
        });

        this.input.on('pointerdown', (p) => this.onPointerDown(p));
    }

    // ───────────────────────── BUILD ─────────────────────────
    buildGalaxy() {
        const colors = [0x4b0082, 0x00008b, 0x191970, 0x2e0057];
        for (let i = 0; i < 7; i++) {
            this.add.circle(
                Phaser.Math.Between(0, this.width),
                Phaser.Math.Between(0, this.height),
                Phaser.Math.Between(250, 550),
                Phaser.Utils.Array.GetRandom(colors), 0.055
            );
        }
    }

    buildStars() {
        ['stars-slow','stars-fast'].forEach((key, idx) => {
            const g = this.make.graphics({ x:0, y:0, add:false });
            g.fillStyle(0xffffff, idx === 0 ? 0.4 : 0.7);
            for (let i = 0; i < (idx === 0 ? 40 : 30); i++)
                g.fillCircle(Phaser.Math.Between(0,256), Phaser.Math.Between(0,256), idx === 0 ? 1 : 1.6);
            g.generateTexture(key, 256, 256);
        });
        this.sf1 = this.add.tileSprite(0,0,this.width,this.height,'stars-slow').setOrigin(0).setAlpha(0.6);
        this.sf2 = this.add.tileSprite(0,0,this.width,this.height,'stars-fast').setOrigin(0);
    }

    buildParticles() {
        const gp = this.make.graphics({ x:0, y:0, add:false });
        gp.fillStyle(0xffffff, 1);
        gp.fillCircle(4,4,4);
        gp.generateTexture('pdot',8,8);

        this.boom = this.add.particles(0,0,'pdot', {
            speed:{min:80,max:280}, scale:{start:1.2,end:0},
            alpha:{start:1,end:0}, lifespan:450, emitting:false
        });
        this.nukeBoom = this.add.particles(0,0,'pdot', {
            speed:{min:200,max:600}, scale:{start:3,end:0},
            tint:[0xFF4500,0xFFD700,0xffffff],
            alpha:{start:1,end:0}, lifespan:700, emitting:false
        });
    }

    buildCannon() {
        this.cannon = this.add.container(this.width/2, this.height);
        const base = this.add.circle(0,0,50,0x2c3e50).setStrokeStyle(3,0x4a90d9);
        this.barrel = this.add.rectangle(0,-55,24,110,0x34495e).setOrigin(0.5,1).setStrokeStyle(2,0x7f8c8d);
        this.nozzle = this.add.circle(0,-110,14,0x00FFFF,0.3);
        this.cannon.add([base, this.barrel, this.nozzle]);
    }

    buildUI() {
        // ── Skor Panosu
        const scoreBg = this.add.graphics({ x: this.width/2 - 120, y: 15 });
        scoreBg.fillStyle(0x050811, 0.8);
        scoreBg.fillRoundedRect(0, 0, 240, 60, 16);
        scoreBg.lineStyle(4, 0x4a90d9, 1);
        scoreBg.strokeRoundedRect(0, 0, 240, 60, 16);

        this.scoreTxt = this.add.text(this.width/2, 45, '⭐ 0', {
            fontSize: '38px', fill: '#FFD700', fontFamily: 'Nunito', fontWeight: '900'
        }).setOrigin(0.5);

        // Canlar
        this.lifeIcons = [];
        for (let i = 0; i < 3; i++)
            this.lifeIcons.push(this.add.text(28 + i*48, 28, '❤️', { fontSize:'36px' }));

        // Aktif Ödül Göstergesi (can barının hemen yanı)
        this.activePwContainer = this.add.container(200, 28);
        this.activePwIcon = this.add.text(0, 0, '', { fontSize:'32px' });
        this.activePwTimer = this.add.text(40, 8, '', {
            fontSize:'22px', fill:'#FFD166', fontFamily:'Nunito', fontWeight:'bold'
        });
        this.activePwContainer.add([this.activePwIcon, this.activePwTimer]);

        // Mıknatıs çemberi
        this.magnetCircle = this.add.circle(0,0,160,0xAA00FF,0.08)
            .setStrokeStyle(2,0xAA00FF,0.5).setAlpha(0);
    }

    buildBarrier() {
        this.barrierLine = this.add.graphics();
        this.barrierLine.lineStyle(6,0x00FFFF,0.7);
        this.barrierLine.strokeLineShape(new Phaser.Geom.Line(0, this.height-100, this.width, this.height-100));
        this.barrierLine.setAlpha(0);
    }

    buildDrone() {
        this.droneObj = this.add.container(this.width/2, this.height - 150);
        const body = this.add.circle(0,0,16,0x00FFFF,0.8).setStrokeStyle(2,0xffffff);
        const eye  = this.add.circle(5,-4,4,0xffffff);
        this.droneObj.add([body, eye]);
        this.droneObj.setAlpha(0);
    }

    // ───────────────────────── POWER-UP POOL ─────────────────────────
    getPowerupPool() {
        return [
            { key:'shield', emoji:'🛡️', label:'Lazer Bariyeri', color:0x00FFFF, dur:10000, w:10 },
            { key:'rapid',  emoji:'🔥', label:'Seri Atış',       color:0xFF6600, dur:20000, w:20 },
            { key:'triple', emoji:'🏹', label:'Üçlü Atış',       color:0xFF69B4, dur:15000, w:20 },
            { key:'magnet', emoji:'🧲', label:'Mıknatıs',        color:0xAA00FF, dur:10000, w:10 },
            { key:'drone',  emoji:'🤖', label:'Drone',           color:0x00FF99, dur:20000, w:15 },
            { key:'nuke',   emoji:'💥', label:'Atom Bombası',    color:0xFF4500, dur:0,     w:10 },
            { key:'life',   emoji:'❤️', label:'Ekstra Can',      color:0xFF0000, dur:0,     w:15 },
        ];
    }

    // ───────────────────────── DROP SPAWN ─────────────────────────
    spawnDrop(pool) {
        const total = pool.reduce((s,p) => s+p.w, 0);
        let r = Phaser.Math.Between(0, total-1);
        let chosen;
        for (const p of pool) { r -= p.w; if (r < 0) { chosen = p; break; } }

        const x = Phaser.Math.Between(120, this.width - 120);
        const container = this.add.container(x, -60);

        // Parlayan arka plan dairesi
        const glow  = this.add.circle(0, 0, 38, chosen.color, 0.25).setStrokeStyle(3, chosen.color, 0.9);
        const label = this.add.text(0, 0, chosen.emoji, { fontSize:'40px' }).setOrigin(0.5);
        container.add([glow, label]);

        container.speed  = Phaser.Math.FloatBetween(2.0, 3.5);
        container.radius = 38;
        container.pwDef  = chosen;
        this.drops.push(container);

        // Parlama tweeni
        this.tweens.add({
            targets: glow, alpha: { from: 0.25, to: 0.7 },
            duration: 500, yoyo: true, repeat: -1
        });
    }

    // ───────────────────────── METEOR SPAWN ────────────────────────
    spawnMeteor() {
        if (this.gameOver) return;
        const x = Phaser.Math.Between(150, this.width-150);
        const r = Phaser.Math.Between(25, 70);
        const m = this.add.container(x, -r*2);
        const base = this.add.circle(0,0,r,0x666666).setStrokeStyle(Math.max(2,r/12),0xFFA500);
        const c1  = this.add.circle(-r*.4,-r*.3,r*.25,0x444444);
        const c2  = this.add.circle( r*.4, r*.4, r*.30,0x444444);
        m.add([base,c1,c2]);
        m.speed  = (2.5 + r/18) * this.speedMul;
        m.rot    = Phaser.Math.FloatBetween(-0.04, 0.04);
        m.radius = r;
        this.meteors.push(m);
    }

    // ───────────────────────── INPUT ─────────────────────────────
    onPointerDown(p) {
        if (this.gameOver) return;

        // Önce ödül toplanabilir mi kontrol et
        for (let i = this.drops.length - 1; i >= 0; i--) {
            const d = this.drops[i];
            const dist = Phaser.Math.Distance.Between(p.x, p.y, d.x, d.y);
            if (dist < d.radius + 20) {
                this.collectDrop(d, i);
                return; // Ödül toplandı, lazer atma
            }
        }

        // Atom Bombası bekleniyorsa patlat
        if (this.pw.nuke) { this.triggerNuke(); return; }

        this.fireLaser(p);
    }

    collectDrop(drop, index) {
        const def = drop.pwDef;

        // Toplama efekti
        this.cameras.main.flash(80, 255, 220, 0, 0.25);
        this.boom.emitParticleAt(drop.x, drop.y, 12);

        // Güçlendirmeyi uygula
        switch (def.key) {
            case 'shield': this.pw.shield = def.dur; this.barrierLine.setAlpha(1); break;
            case 'rapid':  this.pw.rapid  = def.dur; this.nozzle.setFillStyle(0xFFD700,1); break;
            case 'triple': this.pw.triple = def.dur; this.nozzle.setFillStyle(0xFF69B4,1); break;
            case 'magnet': this.pw.magnet = def.dur; this.magnetCircle.setAlpha(1); break;
            case 'drone':  this.pw.drone  = def.dur; this.droneObj.setAlpha(1); break;
            case 'nuke':   this.pw.nuke   = true; break;
            case 'life':
                if (this.lives < 3) { this.lives++; this.updateLives(); }
                break;
        }

        // Aktif ödül göstergesini güncelle (süreliler için)
        if (def.dur > 0) {
            this.currentPwDef = def;
            this.activePwIcon.setText(def.emoji);
        } else if (def.key === 'nuke') {
            this.currentPwDef = def;
            this.activePwIcon.setText(def.emoji);
            this.activePwTimer.setText('TAP!');
        }

        drop.destroy();
        this.drops.splice(index, 1);
    }

    // ───────────────────────── LASER ─────────────────────────────
    fireLaser(pointer) {
        const angle = this.cannon.rotation;
        const nx = this.width/2 + Math.cos(angle - Math.PI/2)*110;
        const ny = this.height  + Math.sin(angle - Math.PI/2)*110;
        const offsets = this.pw.triple > 0 ? [-0.2, 0, 0.2] : [0];

        offsets.forEach(off => {
            const a  = angle + off;
            const tx = nx + Math.cos(a - Math.PI/2)*1600;
            const ty = ny + Math.sin(a - Math.PI/2)*1600;
            const lg = this.add.graphics();
            lg.lineStyle(this.pw.rapid > 0 ? 8 : 5, 0x00FFFF, 1);
            lg.moveTo(nx,ny); lg.lineTo(tx,ty); lg.strokePath();
            this.tweens.add({ targets:lg, alpha:0, duration:120, onComplete:()=>lg.destroy() });
        });

        this.tweens.add({ targets:this.barrel, scaleY:0.7, duration:50, yoyo:true });
        this.nozzle.setAlpha(1);
        this.tweens.add({ targets:this.nozzle, alpha:0.3, duration:180 });

        const offsets2 = this.pw.triple > 0 ? [-0.2, 0, 0.2] : [0];
        for (let i = this.meteors.length-1; i >= 0; i--) {
            const m = this.meteors[i];
            for (const off of offsets2) {
                const a  = angle + off - Math.PI/2;
                const dx = m.x - nx, dy = m.y - ny;
                const perp = Math.abs(-dx*Math.sin(a) + dy*Math.cos(a));
                const proj = dx*Math.cos(a) + dy*Math.sin(a);
                if (proj > 0 && perp < m.radius + 26) {
                    this.hitMeteor(m, i);
                    break;
                }
            }
        }
    }

    triggerNuke() {
        this.pw.nuke = false;
        this.currentPwDef = null;
        this.activePwIcon.setText('');
        this.activePwTimer.setText('');

        this.nukeBoom.emitParticleAt(this.width/2, this.height/2, 70);
        this.cameras.main.shake(500, 0.03);
        this.cameras.main.flash(250, 255, 120, 0, 0.45);

        [...this.meteors].forEach(m => { this.boom.emitParticleAt(m.x, m.y, 8); m.destroy(); });
        this.meteors = [];
        this.score += 50;
        this.scoreTxt.setText('⭐ ' + this.score);
    }

    hitMeteor(m, index) {
        this.score += 10;
        this.hitsCount++;
        this.scoreTxt.setText('⭐ ' + this.score);
        this.boom.emitParticleAt(m.x, m.y, 12);
        this.cameras.main.shake(70, 0.008);
        m.destroy();
        this.meteors.splice(index, 1);

        // Ödül düşürme eşiği
        const threshold = this.hitsCount < 40 ? 20 : this.hitsCount < 80 ? 30 : 40;
        if (this.hitsCount % threshold === 0) {
            this.spawnDrop(this.getPowerupPool());
        }
    }

    // ───────────────────────── UPDATE ─────────────────────────────
    update(time, delta) {
        if (this.gameOver) return;

        const ptr = this.input.activePointer;
        const ang = Phaser.Math.Angle.Between(this.width/2, this.height, ptr.x, ptr.y);
        this.cannon.rotation = ang + Math.PI/2;

        this.sf1.tilePositionY -= 0.6;
        this.sf2.tilePositionY -= 1.8;

        this.tickPowerups(time, delta, ptr);
        this.updateDrops();
        this.updateMeteors();

        // Zorluk artışı — 7-8 yaş grubuna göre çok yavaş ve yumuşak kademe
        // Her 20 saniyede bir tetiklenir. Hız maksimum 1.6x ile sınırlı.
        if (!this._lastDiff) this._lastDiff = time;
        if (time - this._lastDiff > 20000) {
            this._lastDiff = time;
            this.spawnDelay = Math.max(750, this.spawnDelay - 30); // Min 750ms ara
            this.speedMul   = Math.min(1.6, this.speedMul + 0.06); // Max 1.6x hız
            this.spawnTimer.reset({
                delay: this.spawnDelay,
                callback: this.spawnMeteor,
                callbackScope: this,
                loop: true
            });
        }
    }

    tickPowerups(time, delta, ptr) {
        let activeDef  = this.currentPwDef;
        let remaining  = 0;

        if (this.pw.rapid > 0) {
            this.pw.rapid -= delta; remaining = this.pw.rapid;
            if (ptr.isDown && time > this.lastAutoFire + 120) { this.fireLaser(ptr); this.lastAutoFire = time; }
            if (this.pw.rapid <= 0) { this.nozzle.setFillStyle(0x00FFFF, 0.3); this.clearActivePw('rapid'); }
        }
        if (this.pw.triple > 0) {
            this.pw.triple -= delta; remaining = this.pw.triple;
            if (this.pw.triple <= 0) { this.nozzle.setFillStyle(0x00FFFF, 0.3); this.clearActivePw('triple'); }
        }
        if (this.pw.magnet > 0) {
            this.pw.magnet -= delta; remaining = this.pw.magnet;
            this.magnetCircle.setPosition(ptr.x, ptr.y);
            if (this.pw.magnet <= 0) { this.magnetCircle.setAlpha(0); this.clearActivePw('magnet'); }
        }
        if (this.pw.drone > 0) {
            this.pw.drone -= delta; remaining = this.pw.drone;
            if (this.meteors.length > 0) {
                let closest = null, minD = Infinity;
                this.meteors.forEach(m => {
                    const d = Phaser.Math.Distance.Between(this.droneObj.x, this.droneObj.y, m.x, m.y);
                    if (d < minD) { minD = d; closest = m; }
                });
                if (closest) {
                    this.droneObj.x = Phaser.Math.Linear(this.droneObj.x, closest.x + 60, 0.05);
                    this.droneObj.y = Phaser.Math.Linear(this.droneObj.y, closest.y - 60, 0.05);
                    if (minD < 50) {
                        const idx = this.meteors.indexOf(closest);
                        if (idx !== -1) this.hitMeteor(closest, idx);
                    }
                }
            }
            if (this.pw.drone <= 0) { this.droneObj.setAlpha(0); this.clearActivePw('drone'); }
        }
        if (this.pw.shield > 0) {
            this.pw.shield -= delta; remaining = this.pw.shield;
            if (this.pw.shield <= 0) { this.barrierLine.setAlpha(0); this.clearActivePw('shield'); }
        }

        // HUD güncelle
        if (this.currentPwDef && this.currentPwDef.dur > 0 && remaining > 0) {
            this.activePwTimer.setText(Math.ceil(remaining/1000) + 's');
        } else if (this.pw.nuke) {
            this.activePwTimer.setText('TAP!');
        }
    }

    clearActivePw(key) {
        if (this.currentPwDef && this.currentPwDef.key === key) {
            this.currentPwDef = null;
            this.activePwIcon.setText('');
            this.activePwTimer.setText('');
        }
    }

    updateDrops() {
        for (let i = this.drops.length - 1; i >= 0; i--) {
            const d = this.drops[i];
            d.y += d.speed;
            if (d.y > this.height + 60) {
                d.destroy();
                this.drops.splice(i, 1);
            }
        }
    }

    updateMeteors() {
        const ptr = this.input.activePointer;
        for (let i = this.meteors.length - 1; i >= 0; i--) {
            const m = this.meteors[i];

            if (this.pw.magnet > 0) {
                const dx = ptr.x - m.x, dy = ptr.y - m.y;
                const d  = Math.hypot(dx, dy);
                if (d < 160) {
                    m.x += (dx/d) * 4; m.y += (dy/d) * 4;
                    if (d < 40) { this.hitMeteor(m, i); continue; }
                }
            }

            m.y += m.speed;
            m.rotation += m.rot;

            if (this.pw.shield > 0 && m.y > this.height - 115) {
                this.hitMeteor(m, i); continue;
            }

            if (m.y > this.height + 80) {
                m.destroy();
                this.meteors.splice(i, 1);
                this.loseLife();
            }
        }
    }

    loseLife() {
        this.lives--;
        this.updateLives();
        this.cameras.main.shake(200, 0.02);
        this.cameras.main.flash(100, 255, 0, 0, 0.3);
        if (this.lives <= 0) this.triggerGameOver();
    }

    updateLives() {
        this.lifeIcons.forEach((ic, i) => ic.setAlpha(i < this.lives ? 1 : 0.2));
    }

    triggerGameOver() {
        if (this.gameOver) return;
        this.gameOver = true;
        this.spawnTimer.remove();
        this.meteors.forEach(m => m.destroy()); this.meteors = [];
        this.drops.forEach(d => d.destroy()); this.drops = [];

        const engine = window.gameEngine || this.game.gameEngine;
        if (engine) engine.saveScore('space-defender', this.score);

        const ov = this.add.graphics();
        ov.fillStyle(0x000000, 0.88);
        ov.fillRect(0, 0, this.width, this.height);

        this.add.text(this.width/2, this.height/2 - 60, 'SAVUNMA HATTI ÇÖKTÜ!', {
            fontSize:'60px', fill:'#EF476F', fontFamily:'Nunito', fontWeight:'bold'
        }).setOrigin(0.5);
        this.add.text(this.width/2, this.height/2 + 20, `Skor: ${this.score}`, {
            fontSize:'42px', fill:'#FFD700', fontFamily:'Nunito', fontWeight:'bold'
        }).setOrigin(0.5);
        this.add.text(this.width/2, this.height/2 + 100, 'Tekrar oynamak için tıklayın', {
            fontSize:'26px', fill:'#aaa', fontFamily:'Nunito'
        }).setOrigin(0.5);
        this.input.once('pointerdown', () => this.scene.restart());
    }
}
