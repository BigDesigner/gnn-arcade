/**
 * GNNgame: Dino Jetpack - Yaratıcı "Gazoz Jetpack" Teması
 * Özellikler: Sonsuz Kaydırma, Parçacık Efektleri, Dinamik Engeller,
 *             Kamera Sarsıntısı, Pürüzsüz Fizik, Yüksek Etkileşim
 */
export default class SkyTraveler extends Phaser.Scene {
    constructor() {
        super('SkyTraveler');
    }

    init() {
        this.score = 0;
        this.state = 'start'; // start, playing, gameover
        this.baseSpeed = 300;
        this.currentSpeed = 300;
        this.width = 1280;
        this.height = 720;
    }

    preload() {
        // Harici görsel kullanmıyoruz, her şeyi kodla (prosedürel) çizeceğiz
    }

    create() {
        // ── ARKA PLAN (Tarih Öncesi Gün Batımı) ──
        this.buildPrehistoricBackground();

        // ── OYUNCU (DİNO ve GAZOZ JETPACK) ──
        this.birdContainer = this.add.container(250, this.height / 2);
        
        // Jetpack Sırt Çantası (Görsel)
        const jetpack = this.add.graphics();
        jetpack.fillStyle(0x00A8E8, 1); // Gazoz mavisi
        jetpack.fillRoundedRect(-35, -10, 20, 35, 8); // Dinozorun sırtında
        jetpack.fillStyle(0xffffff, 0.8);
        jetpack.fillRoundedRect(-30, -5, 10, 15, 4); // Etiket
        jetpack.fillStyle(0xcccccc, 1);
        jetpack.fillRect(-30, -20, 10, 10); // Kapak

        // Dinozor Emojisi (Yatay Çevrilmiş - Sağa Baksın)
        this.birdVisual = this.add.text(0, 0, '🦖', { fontSize: '64px' }).setOrigin(0.5).setScale(-1, 1);
        
        this.birdContainer.add([jetpack, this.birdVisual]);

        // Fizik gövdesi (container'a fizik ekliyoruz)
        this.physics.add.existing(this.birdContainer);
        this.birdContainer.body.setGravityY(1600);
        this.birdContainer.body.setCollideWorldBounds(false);
        this.birdContainer.body.setSize(45, 55);
        this.birdContainer.body.setOffset(-22.5, -27.5); // Çarpışma kutusunu merkeze oturt

        // ── ENGEL GRUPLARI ──
        this.obstacles = this.add.group();
        this.scoreSensors = this.add.group();

        // ── PARÇACIKLAR ──
        this.buildParticles();

        // ── ARAYÜZ (UI) JUNGLE PANOLARI ──
        
        // Skor Panosu
        const scoreBg = this.add.graphics({ x: 30, y: 30 }).setDepth(99);
        scoreBg.fillStyle(0x27131B, 0.9); // Koyu kahve / Orman karanlığı
        scoreBg.fillRoundedRect(0, 0, 240, 70, 20);
        scoreBg.lineStyle(5, 0xFFD166, 1); // Altın sarısı çerçeve
        scoreBg.strokeRoundedRect(0, 0, 240, 70, 20);

        this.scoreTxt = this.add.text(150, 65, '🍾 Skor: 0', {
            fontSize: '36px', fill: '#fff', fontFamily: 'Nunito', fontWeight: '900'
        }).setOrigin(0.5).setDepth(100);

        const engine = window.gameEngine || this.game.gameEngine;
        if (engine) {
            const highScore = engine.getHighScore('sky-traveler') || 0;
            
            // Rekor Panosu
            const recBg = this.add.graphics({ x: this.width - 270, y: 35 }).setDepth(99);
            recBg.fillStyle(0x27131B, 0.9);
            recBg.fillRoundedRect(0, 0, 240, 60, 16);
            recBg.lineStyle(4, 0x06D6A0, 1); // Orman yeşili çerçeve
            recBg.strokeRoundedRect(0, 0, 240, 60, 16);

            this.add.text(this.width - 150, 65, `👑 Rekor: ${highScore}`, {
                fontSize: '28px', fill: '#06D6A0', fontFamily: 'Nunito', fontWeight: '900'
            }).setOrigin(0.5).setDepth(100);
        }

        // ── KONTROLLER ──
        this.input.on('pointerdown', () => this.jump());
        this.cursors = this.input.keyboard.createCursorKeys();
        this.input.keyboard.on('keydown-SPACE', () => this.jump());

        // ── BAŞLANGIÇ DURUMU ──
        this.birdContainer.body.enable = false;
        
        // Idle süzülme animasyonu
        this.idleTween = this.tweens.add({
            targets: this.birdContainer,
            y: this.birdContainer.y - 25,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.showStartScreen();
    }

    buildPrehistoricBackground() {
        // Turuncu - Kırmızı Günbatımı Gradyanı
        const bg = this.add.graphics();
        bg.fillGradientStyle(0xFF7B00, 0xFF7B00, 0x761100, 0x761100, 1);
        bg.fillRect(0, 0, this.width, this.height);

        // Dev Günbatımı Güneşi
        this.add.circle(this.width/2, this.height/2 + 50, 250, 0xFFEA00, 0.15);
        this.add.circle(this.width/2, this.height/2 + 50, 180, 0xFFEA00, 0.4);
        this.add.circle(this.width/2, this.height/2 + 50, 120, 0xFFEA00, 0.8);

        // Arka plan Parallax Dağlar/Yanardağlar (Çok Yavaş Kayar)
        const mountGfx = this.make.graphics({ x:0, y:0, add:false });
        mountGfx.fillStyle(0x3B1F2B, 1);
        mountGfx.beginPath();
        mountGfx.moveTo(0, 256);
        mountGfx.lineTo(100, 50); // Zirve 1
        mountGfx.lineTo(250, 256);
        mountGfx.lineTo(350, 120); // Zirve 2 (Yanardağ ağzı)
        mountGfx.lineTo(400, 120);
        mountGfx.lineTo(512, 256);
        mountGfx.fillPath();

        // Yanardağ Lav detayı
        mountGfx.fillStyle(0xFF3300, 1);
        mountGfx.fillRect(350, 120, 50, 15);
        
        mountGfx.generateTexture('mountains', 512, 256);
        this.mountains = this.add.tileSprite(0, this.height - 250, this.width, 256, 'mountains').setOrigin(0);

        // Ön plan Parallax Zemin (Ağaç Gölgeleri)
        const groundGfx = this.make.graphics({ x:0, y:0, add:false });
        groundGfx.fillStyle(0x1B0B11, 1);
        groundGfx.beginPath();
        groundGfx.moveTo(0, 128);
        for (let i = 0; i < 512; i+=30) {
            groundGfx.lineTo(i, Phaser.Math.Between(20, 60)); // Ağaç silüetleri
            groundGfx.lineTo(i+15, 128);
        }
        groundGfx.fillPath();
        groundGfx.generateTexture('jungle', 512, 128);
        this.jungle = this.add.tileSprite(0, this.height - 100, this.width, 128, 'jungle').setOrigin(0).setDepth(50);
    }

    buildParticles() {
        // Gazoz Köpüğü (Açık Mavi/Beyaz Baloncuklar)
        const bubbleGfx = this.make.graphics({ x:0, y:0, add:false });
        bubbleGfx.fillStyle(0xCCFFFF, 1);
        bubbleGfx.fillCircle(8, 8, 8);
        bubbleGfx.generateTexture('soda-bubble', 16, 16);

        this.jumpPuff = this.add.particles(0, 0, 'soda-bubble', {
            speed: { min: 80, max: 200 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 800,
            angle: { min: 70, max: 110 }, // Aşağı doğru fışkırma
            gravityY: -50, // Balonlar yukarı çıkar
            tint: [0xCCFFFF, 0x00A8E8, 0xFFFFFF],
            emitting: false
        });

        // Çarpışma: Yıldızlar ve Dino yaprakları (fillStar geçersiz, elle basit bir yıldız/çapraz çiziyoruz)
        const starGfx = this.make.graphics({ x:0, y:0, add:false });
        starGfx.fillStyle(0xFFD166, 1);
        // Basit bir çapraz / patlama yıldızı
        starGfx.fillRect(8, 2, 4, 16);
        starGfx.fillRect(2, 8, 16, 4);
        starGfx.generateTexture('crash-star', 20, 20);

        this.crashBurst = this.add.particles(0, 0, 'crash-star', {
            speed: { min: 300, max: 600 },
            scale: { start: 1, end: 0 },
            tint: [0xFFD166, 0x06D6A0, 0xEF476F],
            lifespan: 1000,
            gravityY: 800,
            emitting: false
        });
    }

    showStartScreen() {
        this.uiContainer = this.add.container(0, 0).setDepth(200);
        
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.6);
        overlay.fillRect(0, 0, this.width, this.height);

        const title = this.add.text(this.width/2, this.height/2 - 60, 'DİNO GAZOZ UÇUŞU', {
            fontSize: '76px', fill: '#06D6A0', fontFamily: 'Nunito', fontWeight: '900',
            shadow: { offsetX: 5, offsetY: 5, color: '#000', blur: 12, fill: true }
        }).setOrigin(0.5);

        const sub = this.add.text(this.width/2, this.height/2 + 45, 'Gazozları patlatıp zıplamak için TIKLA veya BOŞLUK tuşuna bas\n(Sağ/Sol oklarla havada yön verebilirsin)', {
            fontSize: '28px', fill: '#fff', fontFamily: 'Nunito', align: 'center', lineHeight: 1.5
        }).setOrigin(0.5);

        // Nabız animasyonu
        this.tweens.add({ targets: sub, alpha: 0.3, duration: 800, yoyo: true, repeat: -1 });

        this.uiContainer.add([overlay, title, sub]);

        // Oyunu baslatacak ilk tiklama veya bosluk eventlerini dinleyelim
        const startFunc = () => {
            if (this.state === 'start') this.startGame();
        };

        this.input.once('pointerdown', startFunc);
        this.input.keyboard.once('keydown-SPACE', startFunc);
    }

    startGame() {
        if (this.state === 'playing') return;
        this.state = 'playing';
        
        if (this.idleTween) this.idleTween.stop();
        if (this.uiContainer) this.uiContainer.destroy();
        
        this.birdContainer.body.enable = true;
        this.birdContainer.setPosition(250, this.height / 2);
        
        // Engel döngüsü (Zamanlayıcı)
        const obsDelay = 1800; // Biraz daha tempolu
        this.obstacleTimer = this.time.addEvent({
            delay: obsDelay,
            callback: this.spawnObstacle,
            callbackScope: this,
            loop: true
        });

        // İlk zıplama motoru çalıştırır
        this.jump();
    }

    jump() {
        if (this.state !== 'playing') return;
        
        this.birdContainer.body.setVelocityY(-550);
        
        // Şahlanma rotasyon efekti
        this.tweens.killTweensOf(this.birdVisual);
        this.birdVisual.rotation = -0.3;
        this.tweens.add({
            targets: this.birdVisual,
            rotation: 0.1,
            duration: 600,
            ease: 'Sine.easeOut'
        });

        // Gazoz köpüğü fışkırması (Jetpack pompasından)
        this.jumpPuff.emitParticleAt(this.birdContainer.x - 30, this.birdContainer.y + 10, 6);
    }

    spawnObstacle() {
        if (this.state !== 'playing') return;

        const gap = Phaser.Math.Between(220, 250); // Boşluğu garanti geçiş için ferahlattım
        const minHeight = 80;
        const maxTopHeight = this.height - gap - minHeight;
        const topHeight = Phaser.Math.Between(minHeight, maxTopHeight);
        
        const obsW = 85;

        // Üst Sarmaşık (Doğrudan Rectangle - Çarpışma Sorunu 0)
        const topBody = this.add.rectangle(this.width + 100, 0, obsW, topHeight, 0x145c22).setOrigin(0);
        topBody.setStrokeStyle(6, 0x2d8a40, 1);
        this.physics.add.existing(topBody);
        topBody.body.setAllowGravity(false);
        topBody.body.setVelocityX(-this.currentSpeed);
        this.obstacles.add(topBody);

        // Alt Sarmaşık
        const bottomY = topHeight + gap;
        const bottomH = this.height - bottomY;
        const botBody = this.add.rectangle(this.width + 100, bottomY, obsW, bottomH, 0x145c22).setOrigin(0);
        botBody.setStrokeStyle(6, 0x2d8a40, 1);
        this.physics.add.existing(botBody);
        botBody.body.setAllowGravity(false);
        botBody.body.setVelocityX(-this.currentSpeed);
        this.obstacles.add(botBody);

        // Skor sensörü (Görünmez ince Rectangle)
        const sensor = this.add.rectangle(this.width + 100 + obsW/2, 0, 20, this.height, 0xff0000, 0).setOrigin(0);
        this.physics.add.existing(sensor);
        sensor.body.setAllowGravity(false);
        sensor.body.setVelocityX(-this.currentSpeed);
        sensor.passed = false;
        this.scoreSensors.add(sensor);
    }

    update() {
        if (this.state === 'gameover') return;

        // Arka plan Parallax Kaydırma (Hız hissi)
        if (this.mountains) this.mountains.tilePositionX += (this.currentSpeed / 250);
        if (this.jungle)    this.jungle.tilePositionX    += (this.currentSpeed / 80);

        if (this.state !== 'playing') return;

        // Ağır çekim (Düşerken ağzını açıp kafa üstü düşme hissi)
        if (this.birdContainer.body.velocity.y > 250) {
            this.birdVisual.rotation = Phaser.Math.Linear(this.birdVisual.rotation, 0.4, 0.1);
        }

        // Sol/Sağ Manevra (Hava sürtünmesi çok)
        if (this.cursors.left.isDown) {
            this.birdContainer.body.setVelocityX(-300);
        } else if (this.cursors.right.isDown) {
            this.birdContainer.body.setVelocityX(300);
        } else {
            this.birdContainer.body.setVelocityX(this.birdContainer.body.velocity.x * 0.9);
        }

        // Sınırlar
        if (this.birdContainer.x < 30) this.birdContainer.x = 30;
        // Engelleri ekran dışından getirmeden önce geçebilsin diye sağa fazla açılabilir
        if (this.birdContainer.x > this.width - 30) this.birdContainer.x = this.width - 30;

        // Çarpışma Kontrolü (Dino vs Sarmaşıklar)
        this.physics.overlap(this.birdContainer, this.obstacles, () => {
            if (this.state === 'playing') this.triggerGameOver();
        });

        // Yere veya çok yukarı değme
        if (this.birdContainer.y > this.height || this.birdContainer.y < -30) {
            this.triggerGameOver();
        }

        // Akıllı Skor Tespiti
        this.scoreSensors.getChildren().forEach(sensor => {
            if (!sensor.passed && this.birdContainer.x > sensor.x) {
                sensor.passed = true;
                this.score++;
                this.scoreTxt.setText(`🍾 Skor: ${this.score}`);
                
                // +1 Pop-up (Gazoz renginde)
                const pt = this.add.text(this.birdContainer.x, this.birdContainer.y - 50, '+1', {
                    fontSize: '44px', fill: '#00A8E8', fontFamily: 'Nunito', fontWeight: '900',
                    shadow: { offsetX: 2, offsetY: 2, color: '#fff', blur: 3, fill: true }
                }).setOrigin(0.5);
                this.tweens.add({ targets: pt, y: pt.y - 100, scale: 1.5, alpha: 0, duration: 800, onComplete: () => pt.destroy() });

                // Tempolu zorluk artışı
                if (this.score % 5 === 0) {
                    this.currentSpeed += 25; 
                    this.cameras.main.flash(150, 255, 200, 100, 0.2); // Altın sarısı speed-up flash
                }
            }
        });

        // Bellek Temizliği (Geride kalanları yok et)
        this.obstacles.getChildren().forEach(obs => {
            if (obs.x < -200) obs.destroy();
        });
        this.scoreSensors.getChildren().forEach(sen => {
            if (sen.x < -200) sen.destroy();
        });
    }

    triggerGameOver() {
        if (this.state === 'gameover') return;
        this.state = 'gameover';
        
        this.physics.pause();
        if (this.obstacleTimer) this.obstacleTimer.remove();

        // Şiddetli Kamera Sarsıntısı
        this.cameras.main.shake(500, 0.025);
        this.cameras.main.flash(300, 255, 0, 0, 0.4);

        // Dinozor Çarpışma Yıldızları
        this.crashBurst.emitParticleAt(this.birdContainer.x, this.birdContainer.y, 40);
        this.birdContainer.setVisible(false);

        // Skor Kaydı
        const engine = window.gameEngine || this.game.gameEngine;
        let newRecord = false;
        if (engine) newRecord = engine.saveScore('sky-traveler', this.score);

        // Sinematik Game Over Menüsü
        this.time.delayedCall(1000, () => {
            const ov = this.add.graphics();
            ov.fillStyle(0x000000, 0.85);
            ov.fillRect(0, 0, this.width, this.height);

            const panel = this.add.graphics();
            panel.fillStyle(0x2D1B69, 1); // Koyu Lacivert Arka
            panel.fillRoundedRect(this.width/2 - 300, this.height/2 - 200, 600, 400, 32);
            panel.lineStyle(6, 0x06D6A0, 1); // Parlak Yeşil Çerçeve
            panel.strokeRoundedRect(this.width/2 - 300, this.height/2 - 200, 600, 400, 32);

            this.add.text(this.width/2, this.height/2 - 120, '💥 ÇAKILDIN! 💥', {
                fontSize: '64px', fill: '#EF476F', fontFamily: 'Nunito', fontWeight: '900',
                shadow: { offsetX: 3, offsetY: 3, color: '#000', blur: 5, fill: true }
            }).setOrigin(0.5);

            this.add.text(this.width/2, this.height/2 - 10, `Skorun: ${this.score}`, {
                fontSize: '52px', fill: '#FFD166', fontFamily: 'Nunito', fontWeight: '800'
            }).setOrigin(0.5);

            if (newRecord) {
                const rt = this.add.text(this.width/2, this.height/2 + 70, '🌟 YENİ DİNO REKORU! 🌟', {
                    fontSize: '32px', fill: '#00A8E8', fontFamily: 'Nunito', fontWeight: '900'
                }).setOrigin(0.5);
                this.tweens.add({ targets: rt, scale: 1.1, duration: 400, yoyo: true, repeat: -1 });
            }

            const rst = this.add.text(this.width/2, this.height/2 + 150, 'Tekrar Oyna', {
                fontSize: '28px', fill: '#fff', fontFamily: 'Nunito', backgroundColor: '#4A90E2', padding: { x: 30, y: 15 }
            }).setOrigin(0.5).setDepth(15).setInteractive({ useHandCursor: true });
            
            this.time.delayedCall(300, () => {
                rst.once('pointerdown', () => this.scene.restart());
                this.input.keyboard.once('keydown-SPACE', () => this.scene.restart());
            });
        });
    }
}