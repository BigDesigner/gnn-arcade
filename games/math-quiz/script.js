/**
 * GNNgame: Math Quiz - ULTIMATE Phaser Version
 * Özellikler: Fizikli Balonlar, Dairesel Timer, Streak Sistemi,
 *             Animasyonlu Soru Kartı, Particle Efektleri, Canlı Tema
 */
export default class MathQuiz extends Phaser.Scene {
    constructor() {
        super('MathQuiz');
    }

    init() {
        this.score = 0;
        this.streak = 0;
        this.multiplier = 1;
        this.lives = 3;
        this.timeLeft = 12;
        this.totalTime = 12;
        this.gameOver = false;
        this.question = null;
        this.bubbles = [];
        this.width = 1280;
        this.height = 720;
        this.difficulty = 'easy';
    }

    // ─────────────────────────────── CREATE ───────────────────────────────
    create() {
        this.buildBackground();
        this.buildParticles();
        this.showMenu();
    }

    // ─────────────────────────────── BACKGROUND ───────────────────────────
    buildBackground() {
        // Gradyan benzeri arka plan (açık mor → lacivert)
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x1a1a4e, 0x1a1a4e, 0x3a0ca3, 0x3a0ca3, 1);
        bg.fillRect(0, 0, this.width, this.height);

        // Geometrik şekil - yüzer kareler
        for (let i = 0; i < 12; i++) {
            const size = Phaser.Math.Between(20, 60);
            const x = Phaser.Math.Between(0, this.width);
            const y = Phaser.Math.Between(0, this.height);
            const col = Phaser.Utils.Array.GetRandom([0x7b2fff, 0x4cc9f0, 0xf72585, 0x4361ee]);
            const rect = this.add.rectangle(x, y, size, size, col, 0.15);
            rect.setRotation(Phaser.Math.FloatBetween(0, Math.PI));
            this.tweens.add({
                targets: rect,
                y: y - Phaser.Math.Between(60, 160),
                rotation: rect.rotation + Math.PI,
                alpha: { from: 0.15, to: 0.07 },
                duration: Phaser.Math.Between(4000, 8000),
                yoyo: true, repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        // Yıldız benzeri parıltılar
        for (let i = 0; i < 30; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, this.width),
                Phaser.Math.Between(0, this.height),
                Phaser.Math.Between(1, 3), 0xffffff, 0.5
            );
            this.tweens.add({
                targets: star, alpha: { from: 0.1, to: 0.8 },
                duration: Phaser.Math.Between(800, 2000),
                yoyo: true, repeat: -1
            });
        }
    }

    buildParticles() {
        // Konfeti parçacığı
        const gConf = this.make.graphics({ x: 0, y: 0, add: false });
        gConf.fillStyle(0xffffff, 1);
        gConf.fillRect(0, 0, 6, 6);
        gConf.generateTexture('conf', 6, 6);

        this.confetti = this.add.particles(0, 0, 'conf', {
            speed: { min: 200, max: 500 },
            scale: { start: 1.2, end: 0 },
            tint: [0xf72585, 0x4cc9f0, 0xFFD166, 0x06D6A0],
            lifespan: 800,
            angle: { min: -120, max: -60 },
            gravityY: 400,
            emitting: false
        });

        // Yanlış cevap kıvılcımı
        const gSpark = this.make.graphics({ x: 0, y: 0, add: false });
        gSpark.fillStyle(0xFF4444, 1);
        gSpark.fillCircle(4, 4, 4);
        gSpark.generateTexture('spark', 8, 8);

        this.sparks = this.add.particles(0, 0, 'spark', {
            speed: { min: 100, max: 300 },
            scale: { start: 1, end: 0 },
            lifespan: 500,
            emitting: false
        });
    }

    // ─────────────────────────────── MENU ─────────────────────────────────
    showMenu() {
        this.clearScene();
        this.gameOver = false;
        this.score = 0;
        this.streak = 0;

        // Başlık
        const title = this.add.text(this.width / 2, 160, '🧮 Matematik Avcısı', {
            fontSize: '64px', fill: '#ffffff',
            fontFamily: 'Nunito', fontWeight: 'bold',
            shadow: { offsetX: 3, offsetY: 3, color: '#000', blur: 10, fill: true }
        }).setOrigin(0.5);
        this.tweens.add({ targets: title, y: 170, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

        const subtitle = this.add.text(this.width / 2, 240, 'Bir zorluk seviyesi seç!', {
            fontSize: '28px', fill: '#c8b8ff', fontFamily: 'Nunito'
        }).setOrigin(0.5);

        this.menuItems = [title, subtitle];

        const levels = [
            { key: 'easy', label: 'Kolay', desc: 'Toplama  (1-10)', color: 0x06D6A0, glow: 0x03f0a0 },
            { key: 'medium', label: 'Orta', desc: 'Çıkarma & Toplama', color: 0xFFD166, glow: 0xffc107 },
            { key: 'hard', label: 'Zor', desc: 'Çarpma  (2×2 - 12×12)', color: 0xf72585, glow: 0xff006e }
        ];

        levels.forEach((lv, i) => {
            const y = 360 + i * 115;
            const card = this.add.container(this.width / 2, y + 80).setAlpha(0);
            this.menuItems.push(card);

            const bg = this.add.graphics();
            bg.fillStyle(lv.color, 1);
            bg.fillRoundedRect(-220, -38, 440, 76, 38);
            // İnce border glow efekti
            bg.lineStyle(3, lv.glow, 0.7);
            bg.strokeRoundedRect(-220, -38, 440, 76, 38);

            const labelTxt = this.add.text(0, 0, lv.label, {
                fontSize: '36px', fill: '#1a1a1a', fontFamily: 'Nunito', fontWeight: '900'
            }).setOrigin(0.5, 0.5);

            card.add([bg, labelTxt]);
            card.setSize(440, 76);
            card.setInteractive({ useHandCursor: true });

            card.on('pointerover', () => this.tweens.add({ targets: card, scaleX: 1.05, scaleY: 1.05, duration: 120 }));
            card.on('pointerout', () => this.tweens.add({ targets: card, scaleX: 1, scaleY: 1, duration: 120 }));
            card.on('pointerdown', () => this.startGame(lv.key));

            // Kart giriş animasyonu
            this.tweens.add({ targets: card, y: y, alpha: 1, duration: 400, delay: i * 120, ease: 'Back.easeOut' });
        });
    }

    clearScene() {
        if (this.menuItems) this.menuItems.forEach(o => o.destroy());
        this.menuItems = [];
        if (this.gameOverObjs) this.gameOverObjs.forEach(o => { if (o && o.active) o.destroy(); });
        this.gameOverObjs = [];
        this.bubbles.forEach(b => b.container && b.container.destroy());
        this.bubbles = [];
        if (this.timerEvent) { this.timerEvent.remove(); this.timerEvent = null; }
        if (this.timerGraphics) { this.timerGraphics.destroy(); this.timerGraphics = null; }
        if (this.gameUI) { this.gameUI.forEach(o => o.destroy()); this.gameUI = []; }
    }

    // ─────────────────────────────── GAME START ───────────────────────────
    startGame(diff) {
        this.difficulty = diff;
        this.score = 0;
        this.streak = 0;
        this.lives = 3;
        this.clearScene();
        this.gameUI = [];

        // ── Skor Panosu
        const scoreBg = this.add.graphics({ x: 30, y: 25 }).setDepth(99);
        scoreBg.fillStyle(0x1a1a4e, 0.9);
        scoreBg.fillRoundedRect(0, 0, 220, 60, 16);
        scoreBg.lineStyle(4, 0x4cc9f0, 1);
        scoreBg.strokeRoundedRect(0, 0, 220, 60, 16);
        this.gameUI.push(scoreBg);

        this.scoreTxt = this.add.text(140, 55, '⭐ Skor: 0', {
            fontSize: '28px', fill: '#fff', fontFamily: 'Nunito', fontWeight: '900'
        }).setOrigin(0.5).setDepth(100);
        this.gameUI.push(this.scoreTxt);

        // ── Canlar (❤️ ikonları) Panosu (Sağ Üst)
        const livesBg = this.add.graphics({ x: this.width - 190, y: 25 }).setDepth(99);
        livesBg.fillStyle(0x1a1a4e, 0.9);
        livesBg.fillRoundedRect(0, 0, 160, 60, 16);
        livesBg.lineStyle(3, 0xEF476F, 1);
        livesBg.strokeRoundedRect(0, 0, 160, 60, 16);
        this.gameUI.push(livesBg);

        this.lifeIcons = [];
        for (let i = 0; i < 3; i++) {
            const icon = this.add.text(this.width - 150 + i * 42, 55, '❤️', { fontSize: '28px' }).setOrigin(0.5).setDepth(100);
            this.lifeIcons.push(icon);
            this.gameUI.push(icon);
        }

        // ── Süre Barı (Modern Progress Bar - Top Center)
        const timerBg = this.add.graphics().setDepth(99);
        timerBg.fillStyle(0x1a1a4e, 0.9);
        timerBg.fillRoundedRect(this.width / 2 - 200, 25, 400, 46, 23);
        timerBg.lineStyle(4, 0x4cc9f0, 0.5);
        timerBg.strokeRoundedRect(this.width / 2 - 200, 25, 400, 46, 23);
        this.gameUI.push(timerBg);

        this.timerGraphics = this.add.graphics().setDepth(100);
        this.gameUI.push(this.timerGraphics);

        this.timerLabel = this.add.text(this.width / 2, 48, '⏳ 12', {
            fontSize: '24px', fill: '#fff', fontFamily: 'Nunito', fontWeight: '900'
        }).setOrigin(0.5).setDepth(101);
        this.gameUI.push(this.timerLabel);

        // ── Streak (Seri)
        this.streakTxt = this.add.text(30, 95, '', {
            fontSize: '24px', fill: '#FFD166', fontFamily: 'Nunito', fontWeight: '900'
        });
        this.gameUI.push(this.streakTxt);

        // ── Soru Kartı (başlangıçta görünmez)
        this.questionCard = this.buildQuestionCard();
        this.gameUI.push(this.questionCard);

        this.generateQuestion();
    }

    buildQuestionCard() {
        const card = this.add.container(this.width / 2, -150);
        const bg = this.add.graphics();
        bg.fillStyle(0xffffff, 0.12);
        bg.fillRoundedRect(-280, -55, 560, 110, 24);
        bg.lineStyle(2, 0xffffff, 0.3);
        bg.strokeRoundedRect(-280, -55, 560, 110, 24);
        this.questionTxt = this.add.text(0, 0, '', {
            fontSize: '90px', fill: '#fff',
            fontFamily: 'Nunito', fontWeight: 'bold',
            shadow: { offsetX: 3, offsetY: 3, color: '#000088', blur: 12, fill: true }
        }).setOrigin(0.5);
        card.add([bg, this.questionTxt]);
        return card;
    }

    // ─────────────────────────────── QUESTION ─────────────────────────────
    generateQuestion() {
        if (this.gameOver) return;

        let n1, n2, ans, op;
        if (this.difficulty === 'easy') {
            n1 = Phaser.Math.Between(1, 15);
            n2 = Phaser.Math.Between(1, 15);
            op = '+'; ans = n1 + n2;
        } else if (this.difficulty === 'medium') {
            n1 = Phaser.Math.Between(5, 50);
            n2 = Phaser.Math.Between(5, 50);
            op = Math.random() > 0.5 ? '+' : '-';
            if (op === '-' && n2 > n1) [n1, n2] = [n2, n1];
            ans = op === '+' ? n1 + n2 : n1 - n2;
        } else {
            n1 = Phaser.Math.Between(2, 12);
            n2 = Phaser.Math.Between(2, 12);
            op = '×'; ans = n1 * n2;
        }

        this.question = { text: `${n1} ${op} ${n2} = ?`, answer: ans };
        this.questionTxt.setText(this.question.text);

        // Kart giriş animasyonu
        this.questionCard.y = -150;
        this.tweens.add({
            targets: this.questionCard, y: 155,
            duration: 400, ease: 'Back.easeOut'
        });

        // 3 yanlış cevap üret, doğru cevap kesin olarak dahil et
        const wrongs = [];
        let attempts = 0;
        while (wrongs.length < 3 && attempts < 100) {
            attempts++;
            const offset = Phaser.Math.Between(-12, 12);
            const v = ans + offset;
            if (offset !== 0 && v >= 0 && !wrongs.includes(v)) {
                wrongs.push(v);
            }
        }
        // 4 seçenek: 3 yanlış + 1 doğru, karıştır
        const opts = Phaser.Utils.Array.Shuffle([ans, ...wrongs]);
        this.spawnBubbles(opts);
        this.startTimer();
    }

    // ─────────────────────────────── BUBBLES ──────────────────────────────
    spawnBubbles(opts) {
        this.bubbles.forEach(b => b.container.destroy());
        this.bubbles = [];

        const palette = [0xf72585, 0x4cc9f0, 0x06D6A0, 0xFFD166];
        const xPositions = [220, 480, 740, 1000];

        opts.forEach((val, i) => {
            const x = xPositions[i];
            const startY = this.height + 90;
            const targetY = Phaser.Math.Between(420, 560);
            const radius = 68;
            const color = palette[i];

            const c = this.add.container(x, startY);

            // Ana balon dairesi
            const g = this.add.graphics();
            g.fillStyle(color, 1);
            g.fillCircle(0, 0, radius);
            // Parlama
            g.fillStyle(0xffffff, 0.25);
            g.fillEllipse(-22, -24, 30, 18);

            // Değer metni
            const txt = this.add.text(0, 4, String(val), {
                fontSize: '52px', fill: '#fff',
                fontFamily: 'Nunito', fontWeight: 'bold'
            }).setOrigin(0.5);

            c.add([g, txt]);
            c.setSize(radius * 2, radius * 2);
            c.setInteractive({ useHandCursor: true });
            c.on('pointerdown', () => this.handleAnswer(val, entry));
            c.on('pointerover', () => this.tweens.add({ targets: c, scale: 1.12, duration: 100 }));
            c.on('pointerout', () => this.tweens.add({ targets: c, scale: 1.0, duration: 100 }));

            // Giriş animasyonu (aşağıdan yukarı) → bitince sallantı başlar
            this.tweens.add({
                targets: c, y: targetY, duration: 500 + i * 80,
                ease: 'Back.easeOut', delay: i * 60,
                onComplete: () => {
                    // Sallantı tweeni sadece giriş bittikten sonra başlar
                    this.tweens.add({
                        targets: c,
                        y: targetY - Phaser.Math.Between(18, 35),
                        duration: Phaser.Math.Between(1400, 2200),
                        yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
                    });
                }
            });

            const entry = { val, container: c, graphics: g, radius, color };
            this.bubbles.push(entry);
        });
    }

    // ─────────────────────────────── TIMER ────────────────────────────────
    startTimer() {
        if (this.timerEvent) this.timerEvent.remove();
        this.timeLeft = this.totalTime;
        this.timerLabel.setText('⏳ ' + this.timeLeft).setFill('#fff');
        this.drawTimerArc(1);

        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.timeLeft--;
                this.timerLabel.setText('⏳ ' + this.timeLeft);
                const ratio = this.timeLeft / this.totalTime;
                this.drawTimerArc(ratio);
                if (this.timeLeft <= 3) this.timerLabel.setFill('#EF476F');
                if (this.timeLeft <= 0) this.onTimeOut();
            },
            loop: true
        });
    }

    drawTimerArc(ratio) {
        if (!this.timerGraphics || !this.timerGraphics.active) return;
        this.timerGraphics.clear();

        // Timer bar draw (uzun progress bar)
        // Maksimum bar genişliği 384 (padding 8 solda sağda)
        const maxW = 384;
        const w = maxW * ratio;
        const color = ratio > 0.4 ? 0x06D6A0 : ratio > 0.2 ? 0xFFD166 : 0xEF476F;

        this.timerGraphics.fillStyle(color, 1);
        if (w > 12) {
            this.timerGraphics.fillRoundedRect(this.width / 2 - 192, 33, w, 30, 15);
        } else {
            // Sona doğru yuvarlanma bozulmasın diye
            this.timerGraphics.fillCircle(this.width / 2 - 192 + 15, 48, 15);
        }
    }

    onTimeOut() {
        this.streak = 0;
        this.multiplier = 1;
        this.updateStreakUI();
        // Süre bitti: 1 can al
        this.loseLife(() => this.generateQuestion());
    }

    // ─────────────────────────────── ANSWER ───────────────────────────────
    handleAnswer(val, entry) {
        if (this.gameOver) return;
        if (this.timerEvent) this.timerEvent.remove();

        if (val === this.question.answer) {
            // ✅ DOĞRU
            this.streak++;
            this.multiplier = this.streak >= 5 ? 3 : this.streak >= 3 ? 2 : 1;
            const gained = 10 * this.multiplier;
            this.score += gained;
            this.scoreTxt.setText(`⭐ Skor: ${this.score}`);
            this.updateStreakUI();

            // Puan uçuşu
            const pt = this.add.text(entry.container.x, entry.container.y - 20, `+${gained}`, {
                fontSize: '48px', fill: '#FFD166', fontFamily: 'Nunito', fontWeight: 'bold'
            }).setOrigin(0.5).setShadow(2, 2, '#000', 5);
            this.tweens.add({ targets: pt, y: pt.y - 120, alpha: 0, duration: 700, onComplete: () => pt.destroy() });

            // Konfeti patlaması
            this.confetti.emitParticleAt(entry.container.x, entry.container.y, 30);

            // Kamera flash yeşil
            this.cameras.main.flash(100, 6, 214, 160, 0.3);

            // Balonu patlat
            this.tweens.add({
                targets: entry.container, scale: 1.6, alpha: 0, duration: 250,
                onComplete: () => this.generateQuestion()
            });

        } else {
            // ❌ YANLIŞ
            this.streak = 0;
            this.multiplier = 1;
            this.updateStreakUI();

            this.sparks.emitParticleAt(entry.container.x, entry.container.y, 20);
            this.cameras.main.shake(400, 0.018);
            this.cameras.main.flash(100, 255, 50, 50, 0.3);

            // Balonu salla
            this.tweens.add({
                targets: entry.container, x: entry.container.x + 12,
                duration: 50, yoyo: true, repeat: 5,
                onComplete: () => {
                    this.loseLife(() => this.generateQuestion());
                }
            });
        }
    }

    loseLife(continueCallback) {
        this.lives--;
        this.updateLivesUI();
        this.cameras.main.shake(300, 0.015);
        this.cameras.main.flash(100, 255, 0, 0, 0.3);

        if (this.lives <= 0) {
            this.triggerGameOver();
        } else {
            // Kalan can varsa oyun devam eder
            if (continueCallback) {
                this.time.delayedCall(700, continueCallback);
            }
        }
    }

    updateLivesUI() {
        if (!this.lifeIcons) return;
        this.lifeIcons.forEach((icon, i) => {
            icon.setAlpha(i < this.lives ? 1 : 0.2);
        });
    }

    updateStreakUI() {
        if (this.streak >= 5) {
            this.streakTxt.setText(`🔥 ALEV! ${this.streak} seri × ${this.multiplier}`).setFill('#FF4500');
        } else if (this.streak >= 3) {
            this.streakTxt.setText(`⚡ Seri: ${this.streak} × ${this.multiplier}`).setFill('#FFD166');
        } else if (this.streak > 0) {
            this.streakTxt.setText(`✅ Seri: ${this.streak}`).setFill('#06D6A0');
        } else {
            this.streakTxt.setText('');
        }
    }

    // ─────────────────────────────── GAME OVER ────────────────────────────
    triggerGameOver() {
        if (this.gameOver) return;
        this.gameOver = true;
        if (this.timerEvent) this.timerEvent.remove();

        const engine = window.gameEngine || this.game.gameEngine;
        let newRecord = false;
        if (engine) newRecord = engine.saveScore('math-quiz', this.score);

        this.gameOverObjs = [];
        const ov = this.add.graphics();
        ov.fillStyle(0x000000, 0.75);
        ov.fillRect(0, 0, this.width, this.height);
        this.gameOverObjs.push(ov);

        // Panel
        const panel = this.add.graphics();
        panel.fillStyle(0x1a1a4e, 1);
        panel.fillRoundedRect(this.width / 2 - 300, this.height / 2 - 180, 600, 360, 24);
        panel.lineStyle(3, 0x7b2fff, 1);
        panel.strokeRoundedRect(this.width / 2 - 300, this.height / 2 - 180, 600, 360, 24);
        this.gameOverObjs.push(panel);

        const t1 = this.add.text(this.width / 2, this.height / 2 - 120, 'OYUN BİTTİ!', {
            fontSize: '64px', fill: '#EF476F', fontFamily: 'Nunito', fontWeight: 'bold'
        }).setOrigin(0.5);
        this.gameOverObjs.push(t1);

        const t2 = this.add.text(this.width / 2, this.height / 2 - 30, `Skor: ${this.score}`, {
            fontSize: '52px', fill: '#FFD166', fontFamily: 'Nunito', fontWeight: 'bold'
        }).setOrigin(0.5);
        this.gameOverObjs.push(t2);

        if (newRecord) {
            const t3 = this.add.text(this.width / 2, this.height / 2 + 50, '🎉 YENİ REKOR! 🎉', {
                fontSize: '38px', fill: '#06D6A0', fontFamily: 'Nunito', fontWeight: 'bold'
            }).setOrigin(0.5);
            this.gameOverObjs.push(t3);
        }

        const t4 = this.add.text(this.width / 2, this.height / 2 + 130, 'Menüye dönmek için tıklayın', {
            fontSize: '26px', fill: '#aaa', fontFamily: 'Nunito'
        }).setOrigin(0.5);
        this.gameOverObjs.push(t4);

        this.input.once('pointerdown', () => {
            this.clearScene();
            this.showMenu();
        });
    }

    // ─────────────────────────────── UPDATE ───────────────────────────────
    update() {
        // Arka plandaki şekiller kendi tween döngülerinde zaten hareketli.
        // Timer arc her saniye güncelleniyor, burada ek işlem yok.
    }
}
