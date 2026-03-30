/**
 * GNNgame: Neon Yılan (Snake) - ULTIMATE Phaser Version
 * Özellikler: Neon Grid Arka Plan, Partiküller, Kamera Sarsıntıları,
 *             Dinamik Hızlanma, Gökkuşağı Rengi Yılan
 */
export default class Snake extends Phaser.Scene {
    constructor() {
        super('Snake');
    }

    init() {
        this.gridSize = 40;
        this.width = 1280;
        this.height = 720;
        
        // Grid'e oturtmak için tam sınırları ayarlayalım
        this.cols = Math.floor(this.width / this.gridSize);
        this.rows = Math.floor(this.height / this.gridSize);

        this.snake = {
            x: 5 * this.gridSize,
            y: 5 * this.gridSize,
            dx: this.gridSize,
            dy: 0,
            cells: [],
            maxCells: 4
        };
        
        this.apple = { x: 0, y: 0 };
        this.score = 0;
        this.gameOver = false;
        
        // Zamanlayıcı
        this.moveTimer = 0;
        this.baseMoveSpeed = 160; 
        this.currentMoveSpeed = 160; 
    }

    create() {
        // ── NEON ARKA PLAN ──
        this.buildNeonBackground();

        // ── PARTİKÜLLER ──
        this.buildParticles();

        // ── ÇİZİM OBJESİ (Graphics) ──
        this.graphics = this.add.graphics();
        this.graphics.setDepth(10); // Yılan ve elma üstte

        // ── ARAYÜZ (UI) ──
        this.buildUI();

        // ── KONTROLLER ──
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // Mobil / Dokunmatik
        this.input.on('pointerdown', (pointer) => {
            this.touchStartX = pointer.x;
            this.touchStartY = pointer.y;
        });

        this.input.on('pointerup', (pointer) => {
            const dx = pointer.x - this.touchStartX;
            const dy = pointer.y - this.touchStartY;

            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 30  && this.snake.dx === 0) { this.snake.dx = this.gridSize; this.snake.dy = 0; }
                else if (dx < -30 && this.snake.dx === 0) { this.snake.dx = -this.gridSize; this.snake.dy = 0; }
            } else {
                if (dy > 30  && this.snake.dy === 0) { this.snake.dy = this.gridSize; this.snake.dx = 0; }
                else if (dy < -30 && this.snake.dy === 0) { this.snake.dy = -this.gridSize; this.snake.dx = 0; }
            }
        });

        // ── ELMA YERLEŞTİRME ──
        this.placeApple();

        // İlk başlangıç gösterişi
        this.cameras.main.fadeIn(500, 0, 0, 0);
    }

    buildNeonBackground() {
        // Koyu mavi / mor arka plan
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0f0c29, 0x0f0c29, 0x302b63, 0x302b63, 1);
        bg.fillRect(0, 0, this.width, this.height);

        // Neon ızgara (Grid) çizimi
        const gridGfx = this.add.graphics();
        gridGfx.lineStyle(1, 0x06D6A0, 0.15); // Saydam neon yeşil çizgiler

        for (let x = 0; x < this.width; x += this.gridSize) {
            gridGfx.beginPath();
            gridGfx.moveTo(x, 0);
            gridGfx.lineTo(x, this.height);
            gridGfx.strokePath();
        }
        for (let y = 0; y < this.height; y += this.gridSize) {
            gridGfx.beginPath();
            gridGfx.moveTo(0, y);
            gridGfx.lineTo(this.width, y);
            gridGfx.strokePath();
        }
        
        // Köşelere neon parlamaları (Radial Gradient yok ama yuvarlakla simüle edebiliriz)
        this.add.circle(0, 0, 400, 0x06D6A0, 0.1).setBlendMode(Phaser.BlendModes.ADD);
        this.add.circle(this.width, this.height, 400, 0xF72585, 0.1).setBlendMode(Phaser.BlendModes.ADD);
    }

    buildParticles() {
        // Elma yenme patlaması (Pembe yıldızlar)
        const eatGfx = this.make.graphics({ x:0, y:0, add:false });
        eatGfx.fillStyle(0xffffff, 1);
        eatGfx.fillRect(0, 0, 8, 8);
        eatGfx.generateTexture('apple-bit', 8, 8);

        this.eatBurst = this.add.particles(0, 0, 'apple-bit', {
            speed: { min: 100, max: 300 },
            scale: { start: 1.5, end: 0 },
            tint: [0xF72585, 0xFFD166, 0xFFffff],
            lifespan: 500,
            gravityY: 0,
            emitting: false
        }).setDepth(15);

        // Ölüm patlaması
        this.deathBurst = this.add.particles(0, 0, 'apple-bit', {
            speed: { min: 200, max: 600 },
            scale: { start: 2, end: 0 },
            tint: [0x06D6A0, 0x118AB2, 0xffffff],
            lifespan: 800,
            emitting: false
        }).setDepth(20);
    }

    buildUI() {
        // Skor Panosu (Neon Kutular)
        const hudBg = this.add.graphics().setDepth(100);
        hudBg.fillStyle(0x0f0c29, 0.8);
        hudBg.fillRoundedRect(30, 30, 260, 60, 15);
        hudBg.lineStyle(3, 0x06D6A0, 1);
        hudBg.strokeRoundedRect(30, 30, 260, 60, 15);

        this.scoreText = this.add.text(160, 60, '⚡ Skor: 0', {
            fontSize: '32px', fill: '#06D6A0', fontFamily: 'Nunito', fontWeight: '900',
            shadow: { offsetX: 0, offsetY: 0, color: '#06D6A0', blur: 10, fill: true }
        }).setOrigin(0.5).setDepth(105);

        // Rekor Panosu
        const engine = window.gameEngine || this.game.gameEngine;
        if (engine) {
            const highScore = engine.getHighScore('snake') || 0;
            hudBg.fillRoundedRect(this.width - 290, 30, 260, 60, 15);
            hudBg.lineStyle(3, 0xF72585, 1);
            hudBg.strokeRoundedRect(this.width - 290, 30, 260, 60, 15);

            this.add.text(this.width - 160, 60, `👑 Rekor: ${highScore}`, {
                fontSize: '28px', fill: '#F72585', fontFamily: 'Nunito', fontWeight: '900',
                shadow: { offsetX: 0, offsetY: 0, color: '#F72585', blur: 10, fill: true }
            }).setOrigin(0.5).setDepth(105);
        }
    }

    update(time, delta) {
        if (this.gameOver) return;

        // Kontroller (Gecikmesiz tepki)
        if (this.cursors.up.isDown    && this.snake.dy === 0) { this.snake.dx = 0; this.snake.dy = -this.gridSize; }
        else if (this.cursors.down.isDown  && this.snake.dy === 0) { this.snake.dx = 0; this.snake.dy = this.gridSize; }
        else if (this.cursors.left.isDown  && this.snake.dx === 0) { this.snake.dx = -this.gridSize; this.snake.dy = 0; }
        else if (this.cursors.right.isDown && this.snake.dx === 0) { this.snake.dx = this.gridSize; this.snake.dy = 0; }

        // Grid tabanlı hareket tiklemesi
        this.moveTimer += delta;
        if (this.moveTimer >= this.currentMoveSpeed) {
            this.moveTimer = 0;
            this.moveSnake();
            this.drawGame();
        }

        // Elma nabız animasyonu için elmayı sürekli çizmiyoruz, drawGame içinde basitçe çiziyoruz ama
        // efektleri orada veriyoruz.
    }

    moveSnake() {
        this.snake.x += this.snake.dx;
        this.snake.y += this.snake.dy;

        // 1. DUVAR ÇARPIŞMASI (Ekrandan çıkma)
        if (this.snake.x < 0 || this.snake.x >= this.width || this.snake.y < 0 || this.snake.y >= this.height) {
            this.triggerGameOver();
            return;
        }

        // 2. KENDİNE ÇARPMA
        this.snake.cells.forEach((cell, index) => {
            // Sadece hücre listesinde varsa çarpışır
            if (this.snake.x === cell.x && this.snake.y === cell.y) {
                this.triggerGameOver();
            }
        });

        if (this.gameOver) return;

        // Geçmişi kaydet (Kuyruk)
        this.snake.cells.unshift({ x: this.snake.x, y: this.snake.y });
        
        // Yılan büyümüyorsa son parçayı sil
        if (this.snake.cells.length > this.snake.maxCells) {
            this.snake.cells.pop();
        }

        // 3. ELMA YEME
        if (this.snake.x === this.apple.x && this.snake.y === this.apple.y) {
            this.snake.maxCells++;
            this.score += 10;
            this.scoreText.setText(`⚡ Skor: ${this.score}`);
            
            // Neon Juice: Patlama ve Ekran Sarsıntısı
            this.eatBurst.emitParticleAt(this.apple.x + this.gridSize/2, this.apple.y + this.gridSize/2, 15);
            this.cameras.main.shake(100, 0.008);
            
            // Pop-up skor yazısı
            const pt = this.add.text(this.apple.x + 20, this.apple.y, '+10', {
                fontSize: '28px', fill: '#F72585', fontFamily: 'Nunito', fontWeight: '900'
            }).setOrigin(0.5).setDepth(20);
            this.tweens.add({ targets: pt, y: pt.y - 40, alpha: 0, duration: 600, onComplete: () => pt.destroy() });

            // Hızlanma (Zorluk eğrisi)
            if (this.currentMoveSpeed > 60) {
                this.currentMoveSpeed -= 3; // Her elmada azıcık hızlanır
            }

            this.placeApple();
        }
    }

    placeApple() {
        let isCollision = true;
        // İçeride güvenli bir alan bırakalım ki elma tam kenarda çıkmasın
        const safeCols = this.cols - 2;
        const safeRows = this.rows - 2;

        while (isCollision) {
            this.apple.x = (Math.floor(Math.random() * safeCols) + 1) * this.gridSize;
            this.apple.y = (Math.floor(Math.random() * safeRows) + 1) * this.gridSize;

            isCollision = false;
            
            // Yılan oradaysa tekrar dene
            if (this.apple.x === this.snake.x && this.apple.y === this.snake.y) isCollision = true;
            for (let cell of this.snake.cells) {
                if (cell.x === this.apple.x && cell.y === this.apple.y) {
                    isCollision = true;
                    break;
                }
            }
        }
        
        // Yeni elma doğduğunda ufak bir parıldama işareti eklenebilir
    }

    drawGame() {
        this.graphics.clear();

        // ── ELMAYI ÇİZ (Glow Efektli Neon Meyve) ──
        const ax = this.apple.x + this.gridSize/2;
        const ay = this.apple.y + this.gridSize/2;
        
        // Parlama halkası
        this.graphics.fillStyle(0xF72585, 0.3);
        this.graphics.fillCircle(ax, ay, this.gridSize * 0.7);
        // Meyvenin kendisi
        this.graphics.fillStyle(0xFFD166, 1);
        this.graphics.fillRoundedRect(this.apple.x + 6, this.apple.y + 6, this.gridSize - 12, this.gridSize - 12, 8);
        
        // ── YILANI ÇİZ (Gökkuşağı / Neon Geçişi) ──
        this.snake.cells.forEach((cell, index) => {
            const pad = 2;
            const size = this.gridSize - (pad * 2);
            
            // Kafadan kuyruğa doğru renk açılımı (Yeşil'den Maviye)
            let rawColor = 0x06D6A0;
            if (index > 0) {
                // Hue kaydırma mantığı (basitçe mavi dozu katalım)
                const blueAmount = Math.min(255, index * 8);
                // 0x06D6A0 = 6, 214, 160 => Biz dinamik hexcod uretelim
                const r = 6;
                const g = Math.max(100, 214 - index*3);
                const b = Math.min(255, 160 + index*5);
                rawColor = (r << 16) | (g << 8) | b;
            }

            // Dış Parlama / Gövde
            this.graphics.fillStyle(rawColor, 1);
            
            // Kafa mı kuyruk mu?
            if (index === 0) {
                // Kafa yuvarlak hatlı ve biraz dışa taşıyor (nefes alma efekti)
                this.graphics.fillRoundedRect(cell.x + 1, cell.y + 1, size+2, size+2, 10);
                
                // Gözler (Harekete yöne baksın)
                this.graphics.fillStyle(0xffffff, 1);
                
                // Basit göz çizimi
                let ex1, ey1, ex2, ey2;
                if (this.snake.dx > 0) { // Sağa
                    ex1 = cell.x + 24; ey1 = cell.y + 10;
                    ex2 = cell.x + 24; ey2 = cell.y + 26;
                } else if (this.snake.dx < 0) { // Sola
                    ex1 = cell.x + 12; ey1 = cell.y + 10;
                    ex2 = cell.x + 12; ey2 = cell.y + 26;
                } else if (this.snake.dy < 0) { // Yukarı
                    ex1 = cell.x + 10; ey1 = cell.y + 12;
                    ex2 = cell.x + 26; ey2 = cell.y + 12;
                } else { // Aşağı
                    ex1 = cell.x + 10; ey1 = cell.y + 24;
                    ex2 = cell.x + 26; ey2 = cell.y + 24;
                }
                this.graphics.fillCircle(ex1, ey1, 5);
                this.graphics.fillCircle(ex2, ey2, 5);
                // Gözbebeği
                this.graphics.fillStyle(0x000000, 1);
                this.graphics.fillCircle(ex1+1, ey1, 2);
                this.graphics.fillCircle(ex2+1, ey2, 2);

            } else {
                // Gövde - Gittikçe küçülen pad bırakalım ki kuyruk incelsin
                const tailPad = pad + Math.min(6, (index / this.snake.maxCells) * 6);
                const tSize = this.gridSize - (tailPad * 2);
                this.graphics.fillRoundedRect(cell.x + tailPad, cell.y + tailPad, tSize, tSize, 6);
            }
        });
    }

    triggerGameOver() {
        this.gameOver = true;
        
        // Kamera şiddetli sarsıntı ve Kırmızı Flash
        this.cameras.main.shake(500, 0.03);
        this.cameras.main.flash(400, 255, 0, 50, 0.5);

        // Yılanın her parçasından partikül patlat (Kafadan daha çok)
        this.snake.cells.forEach((cell, idx) => {
            this.deathBurst.emitParticleAt(cell.x + 20, cell.y + 20, idx === 0 ? 20 : 3);
        });

        // Ekrana yılanı bir daha çizme
        this.graphics.clear();

        // Rekor Kaydı
        const engine = window.gameEngine || this.game.gameEngine;
        let newRec = false;
        if (engine) {
            newRec = engine.saveScore('snake', this.score);
        }

        // Gecikmeli Game Over Paneli
        this.time.delayedCall(800, () => {
            const ov = this.add.graphics().setDepth(200);
            ov.fillStyle(0x000000, 0.85);
            ov.fillRect(0, 0, this.width, this.height);

            const panel = this.add.graphics().setDepth(200);
            panel.fillStyle(0x0f0c29, 1); 
            panel.fillRoundedRect(this.width/2 - 250, this.height/2 - 180, 500, 360, 24);
            panel.lineStyle(6, 0x06D6A0, 1); 
            panel.strokeRoundedRect(this.width/2 - 250, this.height/2 - 180, 500, 360, 24);

            this.add.text(this.width/2, this.height/2 - 100, 'TURA BİTTİ', {
                fontSize: '56px', fill: '#06D6A0', fontFamily: 'Nunito', fontWeight: '900',
                shadow: { offsetX: 0, offsetY: 0, color: '#06D6A0', blur: 10, fill: true }
            }).setOrigin(0.5).setDepth(200);

            this.add.text(this.width/2, this.height/2, `Skor: ${this.score}`, {
                fontSize: '48px', fill: '#FFD166', fontFamily: 'Nunito', fontWeight: '800'
            }).setOrigin(0.5).setDepth(200);

            if (newRec) {
                const rt = this.add.text(this.width/2, this.height/2 + 60, '🌟 YENİ REKOR! 🌟', {
                    fontSize: '28px', fill: '#F72585', fontFamily: 'Nunito', fontWeight: '900'
                }).setOrigin(0.5).setDepth(200);
                this.tweens.add({ targets: rt, scale: 1.1, duration: 400, yoyo: true, repeat: -1 });
            }

            const rst = this.add.text(this.width/2, this.height/2 + 130, 'Tekrar başlamak için TIKLA', {
                fontSize: '24px', fill: '#fff', fontFamily: 'Nunito'
            }).setOrigin(0.5).setDepth(200);
            this.tweens.add({ targets: rst, alpha: 0.5, duration: 600, yoyo: true, repeat: -1 });

            this.time.delayedCall(300, () => {
                this.input.once('pointerdown', () => this.scene.restart());
                this.input.keyboard.once('keydown-SPACE', () => this.scene.restart());
            });
        });
    }
}
