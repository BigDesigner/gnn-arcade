/**
 * GNNgame: Ice Runner - ULTIMATE Juicy Version
 * Özellikler: Aurora Borealis Gökyüzü, Procedural Buz Dağları,
 *             Yoğun Kar Fırtınası, Çift Zıplama, Dinamik Sivri Engeller,
 *             Kamera Sarsıntıları ve Patlamalar, Neon Panolar
 */
export default class IceRunner extends Phaser.Scene {
    constructor() {
        super('IceRunner');
    }

    init() {
        this.score = 0;
        this.state = 'start'; // start, playing, gameover
        this.baseSpeed = 350;
        this.currentSpeed = 350;
        this.width = 1280;
        this.height = 720;
        this.groundHeight = 60;
        this.jumps = 0;
        this.maxJumps = 2;
        this.uiObjs = [];
    }

    preload() {
        // Görseller procedural (kodla) çizilecek
    }

    create() {
        // ── DOKU OLUŞTURMA ──
        this.buildTextures();

        // ── ARKA PLAN ──
        this.buildParallax();

        // ── ENGELLER ──
        this.obstacles = this.add.group();
        this.scoreSensors = this.add.group();

        // ── KARAKTER (Penguen) ──
        this.penguin = this.add.text(200, this.height - this.groundHeight - 50, '🐧', { fontSize: '64px' }).setOrigin(0.5);
        this.physics.add.existing(this.penguin);
        this.penguin.body.setGravityY(1600);
        this.penguin.body.setCollideWorldBounds(true);
        // Hassas hitbox
        this.penguin.body.setSize(40, 50);
        this.penguin.body.setOffset(12, 10);

        // ── PARTİKÜLLER ──
        this.buildParticles();

        // ── UI (Panolar) ──
        this.buildUI();

        // ── ÇARPIŞMALAR ──
        this.physics.add.collider(this.penguin, this.ground, () => {
            if (this.penguin.body.touching.down) {
                this.jumps = 0;
            }
        });
        
        // overlap kullanıyoruz ki fiziksel sekme olmasın, anında game over tetiklensin
        this.physics.add.overlap(this.penguin, this.obstacles, () => this.triggerGameOver());

        // ── KONTROLLER ──
        this.input.on('pointerdown', () => this.jump());
        this.input.keyboard.on('keydown-SPACE', () => this.jump());
        this.input.keyboard.on('keydown-UP', () => this.jump());
        this.cursors = this.input.keyboard.createCursorKeys();

        // Başlangıç ekranı
        this.physics.pause();
        this.showStartScreen();
    }

    buildTextures() {
        // Zemin: Derin Koyu Buzullu Zemin
        const gGfx = this.make.graphics({x:0, y:0, add:false});
        gGfx.fillStyle(0x0a2342, 1);
        gGfx.fillRect(0,0, 128, this.groundHeight);
        gGfx.fillStyle(0x4cc9f0, 0.4);
        gGfx.fillRect(0,0, 128, 6); // Üstteki buz parlaması
        gGfx.generateTexture('ice-ground', 128, this.groundHeight);

        // Sivri Buz Engeli (Ice Spike)
        const obsGfx = this.make.graphics({x:0, y:0, add:false});
        obsGfx.fillStyle(0xdff7ff, 1);
        obsGfx.beginPath();
        obsGfx.moveTo(35, 0); // Zirve
        obsGfx.lineTo(0, 90);
        obsGfx.lineTo(70, 90);
        obsGfx.fillPath();
        // Neon Aurora Çizgileri
        obsGfx.lineStyle(4, 0x06D6A0, 1);
        obsGfx.strokePath();
        // İç enerji
        obsGfx.fillStyle(0x06D6A0, 0.5);
        obsGfx.beginPath(); obsGfx.moveTo(35, 25); obsGfx.lineTo(15, 90); obsGfx.lineTo(55, 90); obsGfx.fillPath();
        obsGfx.generateTexture('ice-spike', 70, 90);
        
        // Arka Dağlar (Koyu Silüet)
        const mGfx = this.make.graphics({x:0, y:0, add:false});
        mGfx.fillStyle(0x0f2a40, 1);
        mGfx.beginPath(); mGfx.moveTo(150, 0); mGfx.lineTo(0, 250); mGfx.lineTo(300, 250); mGfx.fillPath();
        mGfx.fillStyle(0x1a4563, 1); // Arkadaki 2. dağ
        mGfx.beginPath(); mGfx.moveTo(70, 80); mGfx.lineTo(0, 250); mGfx.lineTo(180, 250); mGfx.fillPath();
        mGfx.generateTexture('ice-mountains', 300, 250);

        // Kar tanesi
        const sGfx = this.make.graphics({x:0, y:0, add:false});
        sGfx.fillStyle(0xffffff, 0.9);
        sGfx.fillCircle(4, 4, 4);
        sGfx.generateTexture('flake', 8, 8);
    }

    buildParallax() {
        // Gökyüzü (Aurora Borealis)
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x011627, 0x011627, 0x118ab2, 0x06D6A0, 1);
        bg.fillRect(0,0, this.width, this.height);

        // Dağlar
        this.mountains = this.add.tileSprite(0, this.height - this.groundHeight - 240, this.width, 250, 'ice-mountains').setOrigin(0).setAlpha(0.85);

        // Zemin
        this.ground = this.add.tileSprite(0, this.height - this.groundHeight, this.width, this.groundHeight, 'ice-ground').setOrigin(0);
        this.physics.add.existing(this.ground, true); 
        this.ground.body.updateFromGameObject(); // TileSprite fizik güncellemesi
    }

    buildParticles() {
        // Yoğun Kar Fırtınası
        this.snowStorm = this.add.particles(0, 0, 'flake', {
            x: { min: 0, max: this.width + 200 },
            y: -20,
            lifespan: 5000,
            speedY: { min: 100, max: 250 },
            speedX: { min: -200, max: -80 }, // Fırtına sola esiyor
            scale: { start: 0.8, end: 1.5 },
            alpha: { start: 0.8, end: 0 },
            quantity: 3,
            frequency: 30
        }).setDepth(10);

        // Çift Zıplama Kar Patlaması
        this.jumpBurst = this.add.particles(0, 0, 'flake', {
            speed: { min: 100, max: 400 },
            scale: { start: 1.5, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 600,
            gravityY: 600,
            emitting: false
        }).setDepth(5);

        // Çarpışma Şoku
        this.crashBurst = this.add.particles(0, 0, 'flake', {
            speed: { min: 300, max: 700 },
            scale: { start: 2, end: 0 },
            tint: [0xef476f, 0xffd166, 0x06d6a0, 0xffffff],
            lifespan: 1000,
            gravityY: 500,
            emitting: false
        }).setDepth(100);
    }

    buildUI() {
        // Skor Panosu
        const scoreBg = this.add.graphics({ x: 30, y: 25 }).setDepth(99);
        scoreBg.fillStyle(0x0a2342, 0.9);
        scoreBg.fillRoundedRect(0, 0, 230, 60, 16);
        scoreBg.lineStyle(4, 0x4cc9f0, 1);
        scoreBg.strokeRoundedRect(0, 0, 230, 60, 16);

        this.scoreText = this.add.text(145, 55, '⭐ Skor: 0', {
            fontSize: '28px', fill: '#fff', fontFamily: 'Nunito', fontWeight: '900'
        }).setOrigin(0.5).setDepth(100);

        // Rekor Panosu
        const engine = window.gameEngine || this.game.gameEngine;
        if (engine) {
            const highScore = engine.getHighScore('ice-runner') || 0;
            const recBg = this.add.graphics({ x: this.width - 260, y: 25 }).setDepth(99);
            recBg.fillStyle(0x0a2342, 0.9);
            recBg.fillRoundedRect(0, 0, 230, 60, 16);
            recBg.lineStyle(4, 0xFFD166, 1);
            recBg.strokeRoundedRect(0, 0, 230, 60, 16);

            this.add.text(this.width - 145, 55, `🏆 Rekor: ${highScore}`, {
                fontSize: '26px', fill: '#FFD166', fontFamily: 'Nunito', fontWeight: '900'
            }).setOrigin(0.5).setDepth(100);
        }
    }

    showStartScreen() {
        this.overlay = this.add.graphics().setDepth(200);
        this.overlay.fillStyle(0x000000, 0.65);
        this.overlay.fillRect(0, 0, this.width, this.height);

        this.titleTxt = this.add.text(this.width/2, this.height/2 - 50, 'BUZUL KOŞUSU', {
            fontSize: '76px', fill: '#06D6A0', fontFamily: 'Nunito', fontWeight: '900',
            shadow: { offsetX: 4, offsetY: 4, color: '#000', blur: 10, fill: true }
        }).setOrigin(0.5).setDepth(200);

        this.subTxt = this.add.text(this.width/2, this.height/2 + 50, 'Zıplamak için Tıkla (Çift Zıplama Var!)\nPenguen fırtınaya karşı koşuyor 🐧', {
            fontSize: '28px', fill: '#fff', fontFamily: 'Nunito', align: 'center', lineHeight: 1.5
        }).setOrigin(0.5).setDepth(200);

        this.tweens.add({ targets: this.subTxt, alpha: 0.3, duration: 800, yoyo: true, repeat: -1 });

        this.startGameListener = () => this.startGame();
        this.input.once('pointerdown', this.startGameListener);
        this.input.keyboard.once('keydown-SPACE', this.startGameListener);
    }

    startGame() {
        this.state = 'playing';
        if (this.overlay) this.overlay.destroy();
        if (this.titleTxt) this.titleTxt.destroy();
        if (this.subTxt) this.subTxt.destroy();
        
        this.physics.resume();
        this.penguin.body.setVelocityY(-400); // İlk fırlatma hissi

        this.spawnTimer = this.time.addEvent({
            delay: 1400,
            callback: this.spawnObstacle,
            callbackScope: this,
            loop: true
        });
    }

    jump() {
        if (this.state !== 'playing') return;

        if (this.jumps < this.maxJumps) {
            this.penguin.body.setVelocityY(-620);
            this.jumps++;
            
            if (this.jumps === 2) {
                // Çift Zıplama: Kar Tanesi Patlaması ve Dönüş
                this.jumpBurst.emitParticleAt(this.penguin.x, this.penguin.y + 20, 20);
                this.tweens.killTweensOf(this.penguin);
                this.penguin.setAngle(0);
                this.tweens.add({ targets: this.penguin, angle: 360, duration: 450, ease: 'Cubic.easeOut', onComplete: () => this.penguin.setAngle(0) });
            } else {
                // Tek Zıplama
                this.jumpBurst.emitParticleAt(this.penguin.x, this.penguin.y + 20, 8);
                this.tweens.killTweensOf(this.penguin);
                this.penguin.setAngle(0);
                this.tweens.add({ targets: this.penguin, angle: -15, duration: 200, yoyo: true });
            }
        }
    }

    spawnObstacle() {
        if (this.state !== 'playing') return;

        const isAir = Phaser.Math.Between(0, 100) > 85; 
        const isDouble = Phaser.Math.Between(0, 100) > 75; // Yanyana iki engel şansı

        this.createIceSpike(this.width + 100, isAir);
        
        if (isDouble && !isAir) {
            this.createIceSpike(this.width + 170, false);
        }
    }

    createIceSpike(x, isAir) {
        const y = isAir ? this.height - this.groundHeight - 120 : this.height - this.groundHeight - 45;

        // Spritelar origin 0.5 olduğu için 90 yüksekliğin yarısı yukarda duracak
        const obs = this.add.sprite(x, y, 'ice-spike');
        this.physics.add.existing(obs);
        obs.body.setAllowGravity(false);
        obs.body.setVelocityX(-this.currentSpeed);
        
        // Çarpışma alanını insaflı yap (Görsel 70x90)
        obs.body.setSize(35, 75);
        obs.body.setOffset(17, 10);
        
        this.obstacles.add(obs);

        // Uçan engeller biraz dalgalansın
        if (isAir) {
            this.tweens.add({
                targets: obs, y: obs.y - 30, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            });
        }

        // Skor Sensörü
        const sensor = this.add.rectangle(obs.x + 20, 0, 10, this.height, 0xff0000, 0).setOrigin(0);
        this.physics.add.existing(sensor);
        sensor.body.setAllowGravity(false);
        sensor.body.setVelocityX(-this.currentSpeed);
        sensor.passed = false;
        this.scoreSensors.add(sensor);
    }

    update(time, delta) {
        if (this.state !== 'playing') return;

        // Parallax Kaydırma
        this.mountains.tilePositionX += (this.currentSpeed / 250);
        this.ground.tilePositionX += (this.currentSpeed / 80);

        // Havadayken yavaşça düzeltme ve düşüş hissi
        if (this.penguin.body.velocity.y > 100 && this.jumps === 1) {
            this.penguin.rotation = Phaser.Math.Linear(this.penguin.rotation, 0.2, 0.1);
        }

        // Sola Sağ Oklarla hafif manevra
        if (this.cursors.left.isDown) {
            this.penguin.x = Math.max(50, this.penguin.x - 4);
        } else if (this.cursors.right.isDown) {
            this.penguin.x = Math.min(this.width/2, this.penguin.x + 4);
        }

        // Skor Kontrolü (Sensörler)
        this.scoreSensors.getChildren().forEach(sen => {
            if (!sen.passed && this.penguin.x > sen.x) {
                sen.passed = true;
                this.score++;
                this.scoreText.setText(`⭐ Skor: ${this.score}`);
                
                const pt = this.add.text(this.penguin.x, this.penguin.y - 50, '+1', {
                    fontSize: '44px', fill: '#06D6A0', fontFamily: 'Nunito', fontWeight: '900',
                    shadow: { offsetX: 2, offsetY: 2, color: '#fff', blur: 3, fill: true }
                }).setOrigin(0.5);
                this.tweens.add({ targets: pt, y: pt.y - 80, scale: 1.5, alpha: 0, duration: 600, onComplete: () => pt.destroy() });

                if (this.score % 5 === 0) {
                    this.currentSpeed += 25; 
                    this.cameras.main.flash(150, 6, 214, 160, 0.25);
                    this.spawnTimer.reset({
                        delay: Math.max(800, 1400 - (this.score * 15)),
                        callback: this.spawnObstacle, callbackScope: this, loop: true
                    });
                }
            }
            if (sen.x < -100) sen.destroy();
        });

        // Çıkan Engelleri Yok Et
        this.obstacles.getChildren().forEach(obs => {
            if (obs.x < -100) obs.destroy();
        });
    }

    triggerGameOver() {
        if (this.state === 'gameover') return;
        this.state = 'gameover';
        
        this.physics.pause();
        if (this.spawnTimer) this.spawnTimer.remove();

        this.cameras.main.shake(600, 0.035);
        this.cameras.main.flash(400, 239, 71, 111, 0.5);

        this.crashBurst.emitParticleAt(this.penguin.x, this.penguin.y, 50);
        this.penguin.setVisible(false);

        const engine = window.gameEngine || this.game.gameEngine;
        let newRecord = false;
        if (engine) newRecord = engine.saveScore('ice-runner', this.score);

        // Sinematik Game Over Menu
        this.time.delayedCall(900, () => {
            const ov = this.add.graphics();
            ov.fillStyle(0x000000, 0.85); ov.fillRect(0, 0, this.width, this.height);

            const panel = this.add.graphics();
            panel.fillStyle(0x0a2342, 1); 
            panel.fillRoundedRect(this.width/2 - 300, this.height/2 - 200, 600, 400, 32);
            panel.lineStyle(6, 0xEF476F, 1); 
            panel.strokeRoundedRect(this.width/2 - 300, this.height/2 - 200, 600, 400, 32);

            this.add.text(this.width/2, this.height/2 - 120, '💥 DONDUN KALDIN! 💥', {
                fontSize: '56px', fill: '#EF476F', fontFamily: 'Nunito', fontWeight: '900',
                shadow: { offsetX: 3, offsetY: 3, color: '#000', blur: 5, fill: true }
            }).setOrigin(0.5).setDepth(200);

            this.add.text(this.width/2, this.height/2 - 10, `Skorun: ${this.score}`, {
                fontSize: '52px', fill: '#FFD166', fontFamily: 'Nunito', fontWeight: '800'
            }).setOrigin(0.5).setDepth(200);

            if (newRecord) {
                const rt = this.add.text(this.width/2, this.height/2 + 70, '🌟 YENİ REKOR! 🌟', {
                    fontSize: '32px', fill: '#06D6A0', fontFamily: 'Nunito', fontWeight: '900'
                }).setOrigin(0.5).setDepth(200);
                this.tweens.add({ targets: rt, scale: 1.1, duration: 400, yoyo: true, repeat: -1 });
            }

            const rst = this.add.text(this.width/2, this.height/2 + 150, 'Tekrar Oyna', {
                fontSize: '28px', fill: '#fff', fontFamily: 'Nunito', backgroundColor: '#4A90E2', padding: { x: 30, y: 15 }
            }).setOrigin(0.5).setDepth(200).setInteractive({ useHandCursor: true });

            this.time.delayedCall(300, () => {
                rst.once('pointerdown', () => this.scene.restart());
                this.input.keyboard.once('keydown-SPACE', () => this.scene.restart());
            });
        });
    }
}
