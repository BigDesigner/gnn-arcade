/**
 * GNNgame: Cosmic Surfer - ULTIMATE Phaser Version
 * Manyak Ã–zellikler: Gravity Flip, Parallax Background, Particle Trails, Combo System
 */

export default class CosmicSurfer extends Phaser.Scene {
    constructor() {
        super('CosmicSurfer');
    }

    init() {
        this.score = 0;
        this.highScore = 0;
        this.lives = 3;
        this.isGameOver = false;
        this.gameSpeed = 400;
        this.gravitySign = 1; // 1: AÅŸaÄŸÄ±, -1: YukarÄ±
        this.width = 1280;
        this.height = 720;
        this.combo = 0;
        this.lastCollectTime = 0;
        
        const engine = window.gameEngine || this.game.gameEngine;
        if (engine) this.highScore = engine.getHighScore('cosmic-surfer');
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ PRELOAD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    preload() {
        // Grafikleri kodla Ã¼reteceÄŸimiz iÃ§in dÄ±ÅŸ asset'e ihtiyaÃ§ yok (Full Performance)
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ CREATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    create() {
        this.buildBackground();
        this.buildPlayer();
        this.buildParticles();
        this.buildGroups();
        this.buildUI();

        // Kontroller
        this.input.on('pointerdown', () => this.flipGravity());
        this.input.keyboard.on('keydown-SPACE', () => this.flipGravity());

        // Obstacle Timer
        this.spawnTimer = this.time.addEvent({
            delay: 1500,
            callback: this.spawnObstacle,
            callbackScope: this,
            loop: true
        });

        // Star Timer
        this.starTimer = this.time.addEvent({
            delay: 800,
            callback: this.spawnStar,
            callbackScope: this,
            loop: true
        });

        this.cameras.main.fadeIn(1000, 10, 10, 30);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ BUILDERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    buildBackground() {
        // Koyu Uzay GradyanÄ±
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x05051a, 0x05051a, 0x1a0a3a, 0x1a0a3a, 1);
        bg.fillRect(0, 0, this.width, this.height);

        // Parallax YÄ±ldÄ±zlar (3 Katman)
        this.starLayers = [];
        for (let i = 0; i < 3; i++) {
            const layer = this.add.group();
            const count = 40;
            const speed = 0.5 + i * 1.5;
            for (let j = 0; j < count; j++) {
                const s = this.add.circle(
                    Phaser.Math.Between(0, this.width),
                    Phaser.Math.Between(0, this.height),
                    Phaser.Math.Between(1, 4),
                    0xffffff,
                    0.2 + (i * 0.3)
                );
                layer.add(s);
            }
            this.starLayers.push({ group: layer, speed: speed });
        }

    }

    buildPlayer() {
        this.player = this.add.container(200, this.height / 2);
        
        // GÃ¶vde (Diamond Shape)
        const g = this.add.graphics();
        g.fillStyle(0x4cc9f0, 1);
        g.fillRoundedRect(-20, -20, 40, 40, 8);
        g.lineStyle(4, 0xffffff, 1);
        g.strokeRoundedRect(-20, -20, 40, 40, 8);
        
        // Neon Glow (DÄ±ÅŸ halka)
        g.lineStyle(2, 0x4cc9f0, 0.5);
        g.strokeCircle(0, 0, 30);

        this.player.add(g);
        this.physics.add.existing(this.player);
        this.player.body.setGravityY(1200);
        this.player.body.setCollideWorldBounds(true);
        this.player.body.setBounce(0.2);
        this.player.body.setSize(40, 40);
        
        // Player Idle Animation
        this.tweens.add({
            targets: this.player,
            scaleX: 1.1,
            scaleY: 0.9,
            duration: 200,
            yoyo: true,
            repeat: -1
        });
    }

    buildParticles() {
        // Player Trail
        const tGfx = this.make.graphics({ x:0, y:0, add:false });
        tGfx.fillStyle(0xffffff, 1);
        tGfx.fillCircle(5, 5, 5);
        tGfx.generateTexture('trail-part', 10, 10);

        this.trail = this.add.particles(0, 0, 'trail-part', {
            speed: { min: 50, max: 100 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 0.5, end: 0 },
            lifespan: 600,
            blendMode: 'ADD',
            follow: this.player,
            delay: 10,
            tint: [0x4cc9f0, 0x3d5afe, 0xffffff]
        });

        // Explosion Particles
        this.bang = this.add.particles(0, 0, 'trail-part', {
            speed: { min: 200, max: 600 },
            scale: { start: 1.5, end: 0 },
            lifespan: 800,
            blendMode: 'ADD',
            emitting: false
        });

        // Speed Lines (Warp Effect)
        this.warpGroup = this.add.group();
    }

    buildGroups() {
        this.obstacles = this.physics.add.group();
        this.stars = this.physics.add.group();

        // Collisions
        this.physics.add.overlap(this.player, this.obstacles, this.hitObstacle, null, this);
        this.physics.add.overlap(this.player, this.stars, this.collectStar, null, this);
    }

    buildUI() {
        this.gameUI = [];

        // â”€â”€ Skor Panosu (Sol Ãœst)
        const scoreBg = this.add.graphics({ x: 30, y: 25 }).setDepth(99);
        scoreBg.fillStyle(0x1a1a4e, 0.9);
        scoreBg.fillRoundedRect(0, 0, 240, 60, 16);
        scoreBg.lineStyle(4, 0x4cc9f0, 1);
        scoreBg.strokeRoundedRect(0, 0, 240, 60, 16);
        this.gameUI.push(scoreBg);

        this.scoreTxt = this.add.text(150, 55, 'âš¡ Skor: 0', {
            fontSize: '30px', fill: '#fff', fontFamily: 'Nunito', fontWeight: '900'
        }).setOrigin(0.5).setDepth(100);
        this.gameUI.push(this.scoreTxt);

        // â”€â”€ Can Panosu (Orta Ãœst)
        const livesBg = this.add.graphics({ x: this.width / 2 - 80, y: 25 }).setDepth(99);
        livesBg.fillStyle(0x1a1a4e, 0.9);
        livesBg.fillRoundedRect(0, 0, 160, 60, 16);
        livesBg.lineStyle(3, 0xEF476F, 1);
        livesBg.strokeRoundedRect(0, 0, 160, 60, 16);
        this.gameUI.push(livesBg);

        this.lifeIcons = [];
        for (let i = 0; i < 3; i++) {
            const icon = this.add.text(this.width / 2 - 40 + i * 40, 55, 'â¤ï¸', { fontSize: '28px' }).setOrigin(0.5).setDepth(100);
            this.lifeIcons.push(icon);
            this.gameUI.push(icon);
        }

        // â”€â”€ YÃ¼ksek Skor Panosu (SaÄŸ Ãœst)
        const hsBg = this.add.graphics({ x: this.width - 270, y: 25 }).setDepth(99);
        hsBg.fillStyle(0x1a1a4e, 0.9);
        hsBg.fillRoundedRect(0, 0, 240, 60, 16);
        hsBg.lineStyle(4, 0xFFD166, 1);
        hsBg.strokeRoundedRect(0, 0, 240, 60, 16);
        this.gameUI.push(hsBg);

        this.highScoreTxt = this.add.text(this.width - 150, 55, `ğŸ† Rekor: ${this.highScore}`, {
            fontSize: '28px', fill: '#FFD166', fontFamily: 'Nunito', fontWeight: '900'
        }).setOrigin(0.5).setDepth(100);
        this.gameUI.push(this.highScoreTxt);

        // â”€â”€ Combo Panosu (Sol Ãœst AltÄ±)
        this.comboPanel = this.add.container(30, 100).setAlpha(0).setDepth(100);
        const cBg = this.add.graphics();
        cBg.fillStyle(0xf72585, 0.9);
        cBg.fillRoundedRect(0, 0, 180, 45, 12);
        this.comboTxt = this.add.text(90, 22, 'ğŸ”¥ COMBO x0', {
            fontSize: '22px', fill: '#fff', fontFamily: 'Nunito', fontWeight: '900'
        }).setOrigin(0.5);
        this.comboPanel.add([cBg, this.comboTxt]);
        this.gameUI.push(this.comboPanel);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ACTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    flipGravity() {
        if (this.isGameOver) return;
        this.gravitySign *= -1;
        this.player.body.setGravityY(1200 * this.gravitySign);
        
        // Flip Animation
        this.tweens.add({
            targets: this.player,
            angle: this.gravitySign > 0 ? 0 : 180,
            duration: 200,
            ease: 'Back.easeOut'
        });

        // Flash screen slightly
        this.cameras.main.flash(100, 76, 201, 240, 0.1);
    }

    spawnObstacle() {
        if (this.isGameOver) return;
        
        const isTop = Math.random() > 0.5;
        const y = isTop ? 20 : this.height - 20;
        const h = Phaser.Math.Between(150, 350);
        
        const obs = this.add.container(this.width + 100, y);
        const g = this.add.graphics();
        const color = isTop ? 0x4cc9f0 : 0xf72585;
        
        g.fillStyle(color, 1);
        const rectY = isTop ? 0 : -h;
        g.fillRoundedRect(-30, rectY, 60, h, 15);
        g.lineStyle(4, 0xffffff, 0.8);
        g.strokeRoundedRect(-30, rectY, 60, h, 15);

        obs.add(g);
        this.obstacles.add(obs);
        this.physics.add.existing(obs);
        
        obs.body.setVelocityX(-(this.gameSpeed + (this.score * 0.5)));
        obs.body.setAllowGravity(false);
        obs.body.setSize(50, h);
        if(!isTop) obs.body.setOffset(-25, -h); else obs.body.setOffset(-25, 0);

        // Auto destroy
        this.time.delayedCall(4000, () => obs.destroy());
    }

    spawnStar() {
        if (this.isGameOver) return;

        const y = Phaser.Math.Between(150, this.height - 150);
        const star = this.add.container(this.width + 100, y);
        
        const g = this.add.graphics();
        g.fillStyle(0xFFD166, 1);
        // Star shape
        const points = [];
        for (let i = 0; i < 5; i++) {
            const angle = (i * 0.8 * Math.PI) - (Math.PI / 2);
            points.push({ x: Math.cos(angle) * 22, y: Math.sin(angle) * 22 });
        }
        g.fillPoints(points, true);
        g.lineStyle(2, 0xffffff, 1);
        g.strokePoints(points, true);

        star.add(g);
        this.stars.add(star);
        this.physics.add.existing(star);
        
        star.body.setVelocityX(-(this.gameSpeed * 0.8));
        star.body.setAllowGravity(false);
        star.body.setAngularVelocity(100);

        // Floating animation
        this.tweens.add({
            targets: star,
            y: y - 30,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    collectStar(player, star) {
        star.destroy();
        
        // Combo Logic
        const now = this.time.now;
        if (now - this.lastCollectTime < 2000) {
            this.combo++;
        } else {
            this.combo = 1;
        }
        this.lastCollectTime = now;

        const gained = 100 * this.combo;
        this.score += gained;
        this.scoreTxt.setText(`âš¡ Skor: ${this.score}`);
        
        if (this.combo > 1) {
            this.comboTxt.setText(`ğŸ”¥ COMBO x${this.combo}`);
            this.comboPanel.setAlpha(1);
            this.tweens.add({ targets: this.comboPanel, scale: 1.1, duration: 100, yoyo: true });
        } else {
            this.comboPanel.setAlpha(0);
        }

        // VFX
        this.bang.emitParticleAt(player.x, player.y, 10);
        this.cameras.main.shake(100, 0.01);
        
        // Float text
        const t = this.add.text(player.x, player.y - 50, `+${gained}`, { 
            fontSize: '32px', fill: '#FFD166', fontWeight: '900' 
        }).setDepth(200);
        this.tweens.add({ targets: t, y: t.y - 100, alpha: 0, duration: 800, onComplete: () => t.destroy() });
    }

    hitObstacle(player, obs) {
        if (this.isGameOver) return;
        
        // Bu engele Ã§arptÄ±ÄŸÄ±mÄ±zda geÃ§ici olarak devredÄ±ÅŸÄ± bÄ±rakalÄ±m
        obs.destroy();
        
        this.lives--;
        this.updateLivesUI();
        this.combo = 0;
        this.comboPanel.setAlpha(0);

        // VFX & Shake
        this.cameras.main.shake(400, 0.03);
        this.cameras.main.flash(200, 255, 50, 50, 0.4);
        this.bang.emitParticleAt(this.player.x, this.player.y, 30);

        if (this.lives <= 0) {
            this.triggerGameOver();
        } else {
            // Player flicker
            this.tweens.add({
                targets: this.player,
                alpha: 0.2,
                duration: 100,
                yoyo: true,
                repeat: 5
            });
        }
    }

    updateLivesUI() {
        if (!this.lifeIcons) return;
        this.lifeIcons.forEach((icon, i) => {
            icon.setAlpha(i < this.lives ? 1 : 0.2);
            if (i === this.lives) {
                this.tweens.add({ targets: icon, scale: 1.8, alpha: 0, duration: 400 });
            }
        });
    }

    triggerGameOver() {
        this.isGameOver = true;
        this.physics.pause();
        this.player.setAlpha(0);
        
        // Explode
        this.bang.emitParticleAt(this.player.x, this.player.y, 60);

        // Save highscore
        const engine = window.gameEngine || this.game.gameEngine;
        let isNew = false;
        if (engine) isNew = engine.saveScore('cosmic-surfer', this.score);

        // Game Over Panel
        this.time.delayedCall(1000, () => this.showGameOver(isNew));
    }

    showGameOver(isNew) {
        this.gameOverObjs = [];
        const ov = this.add.graphics();
        ov.fillStyle(0x000000, 0.85);
        ov.fillRect(0, 0, this.width, this.height);
        this.gameOverObjs.push(ov);

        // Panel
        const panel = this.add.graphics();
        panel.fillStyle(0x1a1a4e, 1);
        panel.fillRoundedRect(this.width / 2 - 300, this.height / 2 - 180, 600, 360, 24);
        panel.lineStyle(3, 0x7b2fff, 1);
        panel.strokeRoundedRect(this.width / 2 - 300, this.height / 2 - 180, 600, 360, 24);
        this.gameOverObjs.push(panel);

        const t1 = this.add.text(this.width / 2, this.height / 2 - 120, 'OYUN BÄ°TTÄ°!', {
            fontSize: '64px', fill: '#EF476F', fontFamily: 'Nunito', fontWeight: 'bold'
        }).setOrigin(0.5);
        this.gameOverObjs.push(t1);

        const t2 = this.add.text(this.width / 2, this.height / 2 - 30, `Skor: ${this.score}`, {
            fontSize: '52px', fill: '#FFD166', fontFamily: 'Nunito', fontWeight: 'bold'
        }).setOrigin(0.5);
        this.gameOverObjs.push(t2);

        if (isNew) {
            const t3 = this.add.text(this.width / 2, this.height / 2 + 50, 'ğŸ‰ YENÄ° REKOR! ğŸ‰', {
                fontSize: '38px', fill: '#06D6A0', fontFamily: 'Nunito', fontWeight: 'bold'
            }).setOrigin(0.5);
            this.gameOverObjs.push(t3);
            this.tweens.add({ targets: t3, scale: 1.1, duration: 400, yoyo: true, repeat: -1 });
        }

        const t4 = this.add.text(this.width / 2, this.height / 2 + 130, 'Ana MenÃ¼ye DÃ¶n', {
            fontSize: '26px', fill: '#aaa', fontFamily: 'Nunito', backgroundColor: '#333', padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.gameOverObjs.push(t4);

        t4.on('pointerdown', () => {
            this.scene.restart();
        });
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ UPDATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    update(time, delta) {
        if (this.isGameOver) return;

        // Parallax scroll
        this.starLayers.forEach(layer => {
            layer.group.getChildren().forEach(star => {
                star.x -= layer.speed;
                if (star.x < -20) star.x = this.width + 20;
            });
        });

        // Warp Lines (Visual feedback for speed)
        if (Phaser.Math.Between(0, 100) > 95) {
            const line = this.add.graphics();
            line.lineStyle(1, 0x4cc9f0, 0.4);
            const y = Phaser.Math.Between(50, this.height - 50);
            line.strokeLineShape(new Phaser.Geom.Line(this.width + 10, y, this.width + 100, y));
            this.tweens.add({
                targets: line,
                x: -this.width - 200,
                duration: 400,
                onComplete: () => line.destroy()
            });
        }
    }
}
