/**
 * GNNgame: Memory Match - ULTIMATE Phaser Version
 * Uzay Teması | Level Sistemi | 3D Flip | Parçacık Efektleri
 * Dairesel Timer | Hamle Sayacı | 3 Yıldız Derecelendirmesi
 */
export default class MemoryMatch extends Phaser.Scene {
    constructor() {
        super('MemoryMatch');
    }

    init() {
        this.score       = 0;
        this.moves       = 0;
        this.matchedPairs= 0;
        this.flipped     = [];
        this.isLocked    = false;
        this.gameOver    = false;
        this.width       = 1280;
        this.height      = 720;
        this.difficulty  = 'easy';
        this.timeLeft    = 60;
        this.totalTime   = 60;
        this.cards       = [];
        this.uiObjs      = [];
        this.timerEvt    = null;
    }

    // ── Seviye Tanımları
    getLevelConfig(diff) {
        return {
            easy:   { cols:4, rows:3, time:60, pairStars:[6,9,14],  label:'🌟 KOLAY',  color:0x06D6A0 },
            medium: { cols:4, rows:4, time:50, pairStars:[10,13,18], label:'⚡ ORTA',   color:0xFFD166 },
            hard:   { cols:5, rows:4, time:45, pairStars:[12,16,22], label:'🔥 ZOR',    color:0xf72585 }
        }[diff];
    }

    // ── Emoji havuzu — Orman & Doğa teması
    getEmojis() {
        return ['🦊','🐸','🪲','🦋','🌻','🐝','🌸','🐇','🦔','🌿'];
    }

    // ─────────────── CREATE ───────────────
    create() {
        this.buildBg();
        this.buildParticles();
        this.showMenu();
    }

    buildBg() {
        // Renkli Orman Teması: Yeşil → Koyu Yeşil Gradyan
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x1a6b2a, 0x1a6b2a, 0x0d3b16, 0x0d3b16, 1);
        bg.fillRect(0, 0, this.width, this.height);

        // Renkli dairesel orman leke efektleri
        const spotColors = [0x2d8a40, 0x3aad55, 0x145c22, 0x4aba66, 0x1e7a33];
        for (let i = 0; i < 8; i++) {
            this.add.circle(
                Phaser.Math.Between(0, this.width),
                Phaser.Math.Between(0, this.height),
                Phaser.Math.Between(150, 350),
                Phaser.Utils.Array.GetRandom(spotColors), 0.18
            );
        }

        // Üst ve alt dekoratif şeritler
        const topBar = this.add.graphics();
        topBar.fillStyle(0x0d3b16, 0.6);
        topBar.fillRect(0, 0, this.width, 8);
        topBar.fillRect(0, this.height - 8, this.width, 8);

        // Renkli konfeti noktaları (statik dekor)
        const confettiColors = [0xFFD166, 0xF72585, 0x4CC9F0, 0xFF6B35, 0x7B2FFF];
        for (let i = 0; i < 25; i++) {
            const dot = this.add.circle(
                Phaser.Math.Between(0, this.width),
                Phaser.Math.Between(0, this.height),
                Phaser.Math.Between(3, 8),
                Phaser.Utils.Array.GetRandom(confettiColors), 0.35
            );
            // Yavaşça soluk soluk parılda
            this.tweens.add({
                targets: dot, alpha: { from: 0.1, to: 0.5 },
                duration: Phaser.Math.Between(1000, 3000),
                yoyo: true, repeat: -1
            });
        }

        // Kayan dekor şeritler (yaprak efekti)
        const sg = this.make.graphics({ x:0, y:0, add:false });
        sg.fillStyle(0x4aba66, 0.3);
        for (let i = 0; i < 15; i++) {
            sg.fillEllipse(Phaser.Math.Between(0,256), Phaser.Math.Between(0,256), 12, 6);
        }
        sg.generateTexture('mm-leaves', 256, 256);
        this.starField = this.add.tileSprite(0, 0, this.width, this.height, 'mm-leaves').setOrigin(0).setAlpha(0.6);
    }

    buildParticles() {
        const gp = this.make.graphics({ x:0, y:0, add:false });
        gp.fillStyle(0xffffff, 1);
        gp.fillCircle(4,4,4);
        gp.generateTexture('mm-dot', 8, 8);

        this.konfeti = this.add.particles(0, 0, 'mm-dot', {
            speed: { min:150, max:400 },
            scale: { start:1.2, end:0 },
            tint: [0xf72585, 0x4cc9f0, 0xFFD166, 0x06D6A0, 0xffffff],
            lifespan: 700, angle: { min:-120, max:-60 },
            gravityY: 350, emitting: false
        });

        this.matchGlow = this.add.particles(0, 0, 'mm-dot', {
            speed: { min:60, max:180 },
            scale: { start:1.5, end:0 },
            tint: [0x06D6A0, 0xffffff, 0x4cc9f0],
            lifespan: 500, emitting: false
        });
    }

    // ─────────────── MENU ───────────────
    showMenu() {
        this.clearUI();
        this.gameOver = false;
        this.score    = 0;
        this.moves    = 0;

        const title = this.add.text(this.width/2, 110, '🧠 Hafıza Kartları', {
            fontSize:'62px', fill:'#ffffff', fontFamily:'Nunito', fontWeight:'900',
            shadow:{ offsetX:3, offsetY:3, color:'#000', blur:12, fill:true }
        }).setOrigin(0.5);
        this.tweens.add({ targets:title, y:120, duration:1800, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
        this.uiObjs.push(title);

        const sub = this.add.text(this.width/2, 188, 'Seviyeni seç ve kartları eşleştir!', {
            fontSize:'26px', fill:'#a8f0c0', fontFamily:'Nunito'
        }).setOrigin(0.5);
        this.uiObjs.push(sub);

        // 3 Zorluk Kartı YAN YANA
        const levels = [
            { key:'easy',   emoji:'🌱', label:'Kolay',  desc:'4×3  ·  6 çift',  sub:'60 saniye',  color:0x06D6A0, dark:0x048a68 },
            { key:'medium', emoji:'⚡', label:'Orta',   desc:'4×4  ·  8 çift',  sub:'50 saniye',  color:0xFFD166, dark:0xc9a200 },
            { key:'hard',   emoji:'🔥', label:'Zor',    desc:'5×4  ·  10 çift', sub:'45 saniye',  color:0xf72585, dark:0xb3005e }
        ];

        const cardW = 260, cardH = 300, gap = 40;
        const totalW = levels.length * cardW + (levels.length-1) * gap;
        const startX = (this.width - totalW) / 2 + cardW/2;
        const baseY  = this.height/2 + 40;

        levels.forEach((lv, i) => {
            const x = startX + i * (cardW + gap);
            const card = this.add.container(x, baseY + 80).setAlpha(0);
            this.uiObjs.push(card);

            // Kart arka yüzü (kapalı hali - soru işareti)
            const back = this.add.graphics();
            back.fillStyle(lv.color, 1);
            back.fillRoundedRect(-cardW/2, -cardH/2, cardW, cardH, 22);
            back.lineStyle(5, lv.dark, 1);
            back.strokeRoundedRect(-cardW/2, -cardH/2, cardW, cardH, 22);

            const qmark = this.add.text(0, -20, '?', {
                fontSize:'90px', fill:'rgba(255,255,255,0.5)', fontFamily:'Nunito', fontWeight:'900'
            }).setOrigin(0.5);

            const qsub = this.add.text(0, 65, lv.emoji, { fontSize:'48px' }).setOrigin(0.5);

            // Kart ön yüzü (açık hali - hover'da görünür)
            const front = this.add.graphics();
            front.fillStyle(0xffffff, 1);
            front.fillRoundedRect(-cardW/2, -cardH/2, cardW, cardH, 22);
            front.lineStyle(5, lv.color, 1);
            front.strokeRoundedRect(-cardW/2, -cardH/2, cardW, cardH, 22);
            front.setAlpha(0);

            const flbl = this.add.text(0, -70, lv.emoji + ' ' + lv.label, {
                fontSize:'38px', fill:'#1a1a1a', fontFamily:'Nunito', fontWeight:'900'
            }).setOrigin(0.5).setAlpha(0);

            const fdesc = this.add.text(0, -10, lv.desc, {
                fontSize:'24px', fill:'#333', fontFamily:'Nunito', fontWeight:'700'
            }).setOrigin(0.5).setAlpha(0);

            const fsub = this.add.text(0, 35, lv.sub, {
                fontSize:'20px', fill:'#555', fontFamily:'Nunito'
            }).setOrigin(0.5).setAlpha(0);

            const fBtn = this.add.graphics();
            fBtn.fillStyle(lv.color, 1);
            fBtn.fillRoundedRect(-80, 72, 160, 50, 25);
            fBtn.setAlpha(0);

            const fBtnTxt = this.add.text(0, 97, 'Başla!', {
                fontSize:'24px', fill:'#fff', fontFamily:'Nunito', fontWeight:'800'
            }).setOrigin(0.5).setAlpha(0);

            card.add([back, qmark, qsub, front, flbl, fdesc, fsub, fBtn, fBtnTxt]);
            card.setSize(cardW, cardH);
            card.setInteractive({ useHandCursor:true });

            card.on('pointerover', () => {
                // Anında içerik değişimi (animasyon yok → çakma riski sıfır)
                back.setAlpha(0); qmark.setAlpha(0); qsub.setAlpha(0);
                front.setAlpha(1); flbl.setAlpha(1); fdesc.setAlpha(1);
                fsub.setAlpha(1); fBtn.setAlpha(1); fBtnTxt.setAlpha(1);
                // Sadece hafif büyüme tweeni
                this.tweens.killTweensOf(card);
                this.tweens.add({ targets:card, scale:1.07, duration:150, ease:'Back.easeOut' });
            });

            card.on('pointerout', () => {
                back.setAlpha(1); qmark.setAlpha(1); qsub.setAlpha(1);
                front.setAlpha(0); flbl.setAlpha(0); fdesc.setAlpha(0);
                fsub.setAlpha(0); fBtn.setAlpha(0); fBtnTxt.setAlpha(0);
                this.tweens.killTweensOf(card);
                this.tweens.add({ targets:card, scale:1, duration:120 });
            });

            card.on('pointerdown', () => this.startGame(lv.key));

            // Giriş animasyonu
            this.tweens.add({ targets:card, y:baseY, alpha:1, duration:400, delay:i*120, ease:'Back.easeOut' });
        });
    }

    clearUI() {
        this.uiObjs.forEach(o => { try { o.destroy(); } catch(e) {} });
        this.uiObjs = [];
        this.cards.forEach(c => { try { c.destroy(); } catch(e) {} });
        this.cards = [];
        if (this.timerEvt) { this.timerEvt.remove(); this.timerEvt = null; }
        if (this.timerGfx) { this.timerGfx.destroy(); this.timerGfx = null; }
    }

    // ─────────────── GAME START ───────────────
    startGame(diff) {
        this.difficulty  = diff;
        this.score       = 0;
        this.moves       = 0;
        this.matchedPairs= 0;
        this.flipped     = [];
        this.isLocked    = false;
        this.gameOver    = false;

        const cfg = this.getLevelConfig(diff);
        this.timeLeft  = cfg.time;
        this.totalTime = cfg.time;
        this.totalPairs = (cfg.cols * cfg.rows) / 2;

        this.clearUI();

        // ── Skor Panosu
        const scoreBg = this.add.graphics({ x: 30, y: 25 }).setDepth(99);
        scoreBg.fillStyle(0x0d3b16, 0.9);
        scoreBg.fillRoundedRect(0, 0, 220, 60, 16);
        scoreBg.lineStyle(4, 0x06D6A0, 1);
        scoreBg.strokeRoundedRect(0, 0, 220, 60, 16);
        this.uiObjs.push(scoreBg);

        this.scoreTxt = this.add.text(140, 55, '⭐ Skor: 0', {
            fontSize: '28px', fill: '#FFD166', fontFamily: 'Nunito', fontWeight: '900'
        }).setOrigin(0.5).setDepth(100);
        this.uiObjs.push(this.scoreTxt);

        // ── Hamle Panosu
        const moveBg = this.add.graphics({ x: 30, y: 95 }).setDepth(99);
        moveBg.fillStyle(0x0d3b16, 0.9);
        moveBg.fillRoundedRect(0, 0, 220, 46, 16);
        moveBg.lineStyle(3, 0x4cc9f0, 1);
        moveBg.strokeRoundedRect(0, 0, 220, 46, 16);
        this.uiObjs.push(moveBg);

        this.moveTxt = this.add.text(140, 118, '🔄 Hamle: 0', {
            fontSize: '24px', fill: '#fff', fontFamily: 'Nunito', fontWeight: '900'
        }).setOrigin(0.5).setDepth(100);
        this.uiObjs.push(this.moveTxt);

        // ── Süre Barı (Modern Progress Bar - Top Center)
        const timerBg = this.add.graphics().setDepth(99);
        timerBg.fillStyle(0x0d3b16, 0.9);
        timerBg.fillRoundedRect(this.width/2 - 200, 25, 400, 46, 23);
        timerBg.lineStyle(4, 0x06D6A0, 0.5);
        timerBg.strokeRoundedRect(this.width/2 - 200, 25, 400, 46, 23);
        this.uiObjs.push(timerBg);

        this.timerGfx = this.add.graphics().setDepth(100);
        this.uiObjs.push(this.timerGfx);

        this.timerLabel = this.add.text(this.width/2, 48, '⏳ ' + cfg.time, {
            fontSize: '24px', fill: '#fff', fontFamily: 'Nunito', fontWeight: '900'
        }).setOrigin(0.5).setDepth(101);
        this.uiObjs.push(this.timerLabel);

        // ── Eşleşme Panosu (Sağ Üst)
        const pairBg = this.add.graphics({ x: this.width - 250, y: 25 }).setDepth(99);
        pairBg.fillStyle(0x0d3b16, 0.9);
        pairBg.fillRoundedRect(0, 0, 220, 60, 16);
        pairBg.lineStyle(4, 0xFFD166, 1);
        pairBg.strokeRoundedRect(0, 0, 220, 60, 16);
        this.uiObjs.push(pairBg);

        this.pairTxt = this.add.text(this.width - 140, 55, `🧩 0 / ${this.totalPairs} çift`, {
            fontSize: '24px', fill: '#FFD166', fontFamily: 'Nunito', fontWeight: '900'
        }).setOrigin(0.5).setDepth(100);
        this.uiObjs.push(this.pairTxt);

        this.buildBoard(cfg);
        this.startTimer();
    }

    // ─────────────── BOARD ───────────────
    buildBoard(cfg) {
        const { cols, rows } = cfg;
        const pool = this.getEmojis().slice(0, this.totalPairs);
        const deck = Phaser.Utils.Array.Shuffle([...pool, ...pool]);

        const cw = 120, ch = 120, gx = 18, gy = 18;
        const boardW = cols * cw + (cols-1) * gx;
        const boardH = rows * ch + (rows-1) * gy;
        const startX = (this.width  - boardW) / 2 + cw/2;
        const startY = (this.height - boardH) / 2 + ch/2 + 25;

        deck.forEach((emoji, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x   = startX + col * (cw + gx);
            const y   = startY + row * (ch + gy);
            this.createCard(x, y, emoji, i);
        });
    }

    // ─────────────── CARD ───────────────
    createCard(x, y, emoji, idx) {
        const W = 118, H = 118, R = 18;

        const container = this.add.container(x, y - 400).setAlpha(0);

        // ── Arka Yüz: Yeşil Orman Teması
        const back = this.add.graphics();
        back.fillStyle(0x2d8a40, 1);
        back.fillRoundedRect(-W/2, -H/2, W, H, R);
        back.lineStyle(4, 0x145c22, 1);
        back.strokeRoundedRect(-W/2, -H/2, W, H, R);
        // Yaprak deseni
        back.fillStyle(0x3aad55, 0.5);
        back.fillEllipse(-22, -18, 28, 16);
        back.fillEllipse(20, 22, 24, 14);
        back.fillEllipse(-15, 25, 20, 12);
        back.fillEllipse(22, -20, 22, 12);

        const qmark = this.add.text(0, 0, '🍃', {
            fontSize:'44px', fontFamily:'Nunito'
        }).setOrigin(0.5);

        // ── Ön Yüz: Sıcak Krem / Sarı Teması
        const front = this.add.graphics();
        front.fillStyle(0xFFFDE7, 1);
        front.fillRoundedRect(-W/2, -H/2, W, H, R);
        front.lineStyle(4, 0x2d8a40, 1);
        front.strokeRoundedRect(-W/2, -H/2, W, H, R);
        front.setVisible(false);

        const emojiTxt = this.add.text(0, 0, emoji, {
            fontSize:'60px', fontFamily:'Nunito'
        }).setOrigin(0.5).setVisible(false);

        container.add([back, qmark, front, emojiTxt]);
        container.setSize(W, H);
        container.setInteractive({ useHandCursor: true });

        container.pwEmoji   = emoji;
        container.isFlipped = false;
        container.isMatched = false;

        container.on('pointerover', () => {
            if (!container.isFlipped && !container.isMatched)
                this.tweens.add({ targets:container, scale:1.08, duration:100 });
        });
        container.on('pointerout', () => {
            if (!container.isFlipped && !container.isMatched)
                this.tweens.add({ targets:container, scale:1, duration:100 });
        });
        container.on('pointerdown', () => this.flipCard(container));

        this.cards.push(container);

        // Kart giriş animasyonu (basamaklı)
        this.tweens.add({
            targets: container, y, alpha:1, duration:350,
            delay: idx * 40, ease:'Back.easeOut'
        });
    }

    // ─────────────── FLIP ───────────────
    flipCard(card) {
        if (this.isLocked || card.isFlipped || card.isMatched || this.gameOver) return;

        card.isFlipped = true;
        this.flipped.push(card);

        // 3D flip in
        this.tweens.add({
            targets: card, scaleX: 0, duration: 130,
            onComplete: () => {
                card.list[0].setVisible(false);  // back bg
                card.list[1].setVisible(false);  // qmark
                card.list[2].setVisible(true);   // front bg
                card.list[3].setVisible(true);   // emoji
                this.tweens.add({ targets:card, scaleX:1, duration:130 });
            }
        });

        if (this.flipped.length === 2) {
            this.isLocked = true;
            this.moves++;
            this.moveTxt.setText(`🔄 Hamle: ${this.moves}`);
            this.time.delayedCall(350, () => this.checkMatch());
        }
    }

    // ─────────────── CHECK MATCH ───────────────
    checkMatch() {
        const [c1, c2] = this.flipped;
        if (c1.pwEmoji === c2.pwEmoji) {
            this.onMatch(c1, c2);
        } else {
            this.onMismatch(c1, c2);
        }
    }

    onMatch(c1, c2) {
        const bonus = Math.ceil(this.timeLeft / this.totalTime * 30); // Hız bonusu
        this.score += 50 + bonus;
        this.matchedPairs++;
        c1.isMatched = true;
        c2.isMatched = true;
        this.flipped = [];
        this.isLocked = false;

        this.scoreTxt.setText(`⭐ Skor: ${this.score}`);
        this.pairTxt.setText(`🧩 ${this.matchedPairs} / ${this.totalPairs} çift`);

        // Yeşil parlama
        [c1, c2].forEach(c => {
            const gfx = c.list[2];
            this.tweens.add({ targets:c, scale:1.18, duration:120, yoyo:true });
            this.matchGlow.emitParticleAt(c.x, c.y, 15);
        });

        // Konfeti
        this.konfeti.emitParticleAt((c1.x+c2.x)/2, (c1.y+c2.y)/2, 25);
        this.cameras.main.flash(80, 6, 214, 160, 0.2);

        // Puan uçuşu
        const ptt = this.add.text((c1.x+c2.x)/2, (c1.y+c2.y)/2 - 20, `+${50+bonus}`, {
            fontSize:'38px', fill:'#FFD166', fontFamily:'Nunito', fontWeight:'900'
        }).setOrigin(0.5).setShadow(2,2,'#000',5);
        this.tweens.add({ targets:ptt, y:ptt.y-90, alpha:0, duration:700, onComplete:()=>ptt.destroy() });

        if (this.matchedPairs === this.totalPairs) {
            this.time.delayedCall(600, () => this.triggerVictory());
        }
    }

    onMismatch(c1, c2) {
        this.cameras.main.shake(180, 0.008);
        this.cameras.main.flash(80, 255, 50, 50, 0.2);

        // Kırmızı border geçici
        [c1, c2].forEach(c => {
            const gfx = c.list[2];
            gfx.lineStyle(4, 0xff4444, 1);
            gfx.strokeRoundedRect(-59, -59, 118, 118, 18);

            this.tweens.add({ targets:c, x: c.x+8, duration:40, yoyo:true, repeat:3,
                onComplete: () => {
                    gfx.lineStyle(4, 0x4cc9f0, 1);
                    gfx.strokeRoundedRect(-59, -59, 118, 118, 18);
                }
            });
        });

        this.time.delayedCall(800, () => {
            this.unflip(c1);
            this.unflip(c2);
            this.flipped = [];
            this.isLocked = false;
        });
    }

    unflip(card) {
        this.tweens.add({
            targets: card, scaleX:0, duration:120,
            onComplete: () => {
                card.isFlipped = false;
                card.list[0].setVisible(true);
                card.list[1].setVisible(true);
                card.list[2].setVisible(false);
                card.list[3].setVisible(false);
                this.tweens.add({ targets:card, scaleX:1, duration:120 });
            }
        });
    }

    // ─────────────── TIMER ───────────────
    startTimer() {
        this.drawTimerArc(1);
        this.timerEvt = this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.timeLeft--;
                this.timerLabel.setText('⏳ ' + this.timeLeft);
                this.drawTimerArc(this.timeLeft / this.totalTime);
                if (this.timeLeft <= 5) this.timerLabel.setFill('#EF476F');
                if (this.timeLeft <= 0 && !this.gameOver) this.triggerTimeOut();
            },
            loop: true
        });
    }

    drawTimerArc(ratio) {
        if (!this.timerGfx || !this.timerGfx.active) return;
        this.timerGfx.clear();
        
        const maxW = 384;
        const w = maxW * ratio; 
        const col = ratio > 0.4 ? 0x06D6A0 : ratio > 0.15 ? 0xFFD166 : 0xEF476F;
        
        this.timerGfx.fillStyle(col, 1);
        if (w > 12) {
            this.timerGfx.fillRoundedRect(this.width/2 - 192, 33, w, 30, 15);
        } else {
            this.timerGfx.fillCircle(this.width/2 - 192 + 15, 48, 15);
        }
    }

    triggerTimeOut() {
        if (this.gameOver) return;
        this.gameOver = true;
        if (this.timerEvt) this.timerEvt.remove();

        this.cameras.main.shake(400, 0.02);
        this.cameras.main.flash(200, 255, 0, 0, 0.3);

        const engine = window.gameEngine || this.game.gameEngine;
        if (engine) engine.saveScore('memory-match', this.score);

        const ov = this.add.graphics();
        ov.fillStyle(0x000000, 0.82); ov.fillRect(0,0,this.width,this.height);

        const panel = this.add.graphics();
        panel.fillStyle(0x1a0545,1);
        panel.fillRoundedRect(this.width/2-280, this.height/2-150, 560, 300, 24);
        panel.lineStyle(3,0xf72585,1);
        panel.strokeRoundedRect(this.width/2-280, this.height/2-150, 560, 300, 24);

        this.add.text(this.width/2, this.height/2-80, '⏰ SÜRE DOLDU!', {
            fontSize:'56px', fill:'#EF476F', fontFamily:'Nunito', fontWeight:'900'
        }).setOrigin(0.5);
        this.add.text(this.width/2, this.height/2+0, `Skor: ${this.score}`, {
            fontSize:'40px', fill:'#FFD166', fontFamily:'Nunito', fontWeight:'800'
        }).setOrigin(0.5);
        const btn1 = this.add.text(this.width/2, this.height/2+100, 'Tekrar Oyna', {
            fontSize:'28px', fill:'#fff', fontFamily:'Nunito', backgroundColor: '#4A90E2', padding: { x: 30, y: 15 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        btn1.once('pointerdown', () => this.scene.restart());
    }

    // ─────────────── VICTORY ───────────────
    triggerVictory() {
        if (this.gameOver) return;
        this.gameOver = true;
        if (this.timerEvt) this.timerEvt.remove();

        // Hız bonusu dahil skor
        const timeBonus = this.timeLeft * 5;
        this.score += timeBonus;

        const engine = window.gameEngine || this.game.gameEngine;
        let newRecord = false;
        if (engine) newRecord = engine.saveScore('memory-match', this.score);

        // Yıldız hesapla
        const cfg   = this.getLevelConfig(this.difficulty);
        const stars = this.moves <= cfg.pairStars[0] ? 3
                    : this.moves <= cfg.pairStars[1] ? 2 : 1;

        // Büyük konfeti
        for (let i = 0; i < 5; i++) {
            this.time.delayedCall(i * 150, () => {
                this.konfeti.emitParticleAt(
                    Phaser.Math.Between(200, this.width-200), 100, 35
                );
            });
        }

        this.cameras.main.flash(300, 255, 215, 0, 0.35);

        const ov = this.add.graphics();
        ov.fillStyle(0x000000, 0.80); ov.fillRect(0,0,this.width,this.height);

        const panel = this.add.graphics();
        panel.fillStyle(0x1a0545,1);
        panel.fillRoundedRect(this.width/2-300, this.height/2-200, 600, 400, 28);
        panel.lineStyle(3,0x06D6A0,1);
        panel.strokeRoundedRect(this.width/2-300, this.height/2-200, 600, 400, 28);

        this.add.text(this.width/2, this.height/2-150, '🎉 TEBRİKLER!', {
            fontSize:'56px', fill:'#06D6A0', fontFamily:'Nunito', fontWeight:'900'
        }).setOrigin(0.5);

        // Yıldızlar
        const starRow = this.add.text(this.width/2, this.height/2-75,
            '⭐'.repeat(stars) + '☆'.repeat(3-stars), {
            fontSize:'52px'
        }).setOrigin(0.5);
        this.tweens.add({ targets:starRow, scale:1.15, duration:600, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });

        this.add.text(this.width/2, this.height/2+5, `Skor: ${this.score}`, {
            fontSize:'42px', fill:'#FFD166', fontFamily:'Nunito', fontWeight:'800'
        }).setOrigin(0.5);

        this.add.text(this.width/2, this.height/2+60, `Hamle: ${this.moves}  ·  Süre Bonusu: +${timeBonus}`, {
            fontSize:'22px', fill:'#c8b8ff', fontFamily:'Nunito'
        }).setOrigin(0.5);

        if (newRecord) {
            this.add.text(this.width/2, this.height/2+105, '🏆 YENİ REKOR!', {
                fontSize:'32px', fill:'#FFD166', fontFamily:'Nunito', fontWeight:'800'
            }).setOrigin(0.5);
        }

        const btn2 = this.add.text(this.width/2, this.height/2+160, 'Tekrar Oyna', {
            fontSize:'28px', fill:'#fff', fontFamily:'Nunito', backgroundColor: '#4A90E2', padding: { x: 30, y: 15 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.time.delayedCall(300, () => {
            btn2.once('pointerdown', () => this.scene.restart());
        });
    }

    // ─────────────── UPDATE ───────────────
    update() {
        if (this.starField) this.starField.tilePositionY -= 0.3;
        if (this.starField) this.starField.tilePositionX += 0.15;
    }
}
