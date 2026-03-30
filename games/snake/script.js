/**
 * GNNgame: Neon YÄ±lan (Snake) - ULTIMATE Phaser Version
 * Ã–zellikler: Neon Grid Arka Plan, PartikÃ¼ller, Kamera SarsÄ±ntÄ±larÄ±,
 *             Dinamik HÄ±zlanma, GÃ¶kkuÅŸaÄŸÄ± Rengi YÄ±lan
 */
export default class Snake extends Phaser.Scene {
    constructor() {
        super('Snake');
    }

    init() {
        this.gridSize = 40;
        this.width = 1280;
        this.height = 720;
        
        // Grid'e oturtmak iÃ§in tam sÄ±nÄ±rlarÄ± ayarlayalÄ±m
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
        
        // ZamanlayÄ±cÄ±
        this.moveTimer = 0;
        this.baseMoveSpeed = 160; 
        this.currentMoveSpeed = 160; 
    }

    create() {
        // â”€â”€ NEON ARKA PLAN â”€â”€
        this.buildNeonBackground();

        // â”€â”€ PARTÄ°KÃœLLER â”€â”€
        this.buildParticles();

        // â”€â”€ Ã‡Ä°ZÄ°M OBJESÄ° (Graphics) â”€â”€
        this.graphics = this.add.graphics();
        this.graphics.setDepth(10); // YÄ±lan ve elma Ã¼stte

        // â”€â”€ ARAYÃœZ (UI) â”€â”€
        this.buildUI();

        // â”€â”€ KONTROLLER â”€â”€
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

        // â”€â”€ ELMA YERLEÅTÄ°RME â”€â”€
        this.placeApple();

        // Ä°lk baÅŸlangÄ±Ã§ gÃ¶steriÅŸi
        this.cameras.main.fadeIn(500, 0, 0, 0);
    }

    buildNeonBackground() {
        // Koyu mavi / mor arka plan
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0f0c29, 0x0f0c29, 0x302b63, 0x302b63, 1);
        bg.fillRect(0, 0, this.width, this.height);

        // Neon Ä±zgara (Grid) Ã§izimi
        const gridGfx = this.add.graphics();
        gridGfx.lineStyle(1, 0x06D6A0, 0.15); // Saydam neon yeÅŸil Ã§izgiler

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
        
        // KÃ¶ÅŸelere neon parlamalarÄ± (Radial Gradient yok ama yuvarlakla simÃ¼le edebiliriz)
        this.add.circle(0, 0, 400, 0x06D6A0, 0.1).setBlendMode(Phaser.BlendModes.ADD);
        this.add.circle(this.width, this.height, 400, 0xF72585, 0.1).setBlendMode(Phaser.BlendModes.ADD);
    }

    buildParticles() {
        // Elma yenme patlamasÄ± (Pembe yÄ±ldÄ±zlar)
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

        // Ã–lÃ¼m patlamasÄ±
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

        this.scoreText = this.add.text(160, 60, 'âš¡ Skor: 0', {
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

            this.add.text(this.width - 160, 60, `ğŸ‘‘ Rekor: ${highScore}`, {
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

        // Grid tabanlÄ± hareket tiklemesi
        this.moveTimer += delta;
        if (this.moveTimer >= this.currentMoveSpeed) {
            this.moveTimer = 0;
            this.moveSnake();
            this.drawGame();
        }

        // Elma nabÄ±z animasyonu iÃ§in elmayÄ± sÃ¼rekli Ã§izmiyoruz, drawGame iÃ§inde basitÃ§e Ã§iziyoruz ama
        // efektleri orada veriyoruz.
    }

    moveSnake() {
        this.snake.x += this.snake.dx;
        this.snake.y += this.snake.dy;

        // 1. DUVAR Ã‡ARPIÅMASI (Ekrandan Ã§Ä±kma)
        if (this.snake.x < 0 || this.snake.x >= this.width || this.snake.y < 0 || this.snake.y >= this.height) {
            this.triggerGameOver();
            return;
        }

        // 2. KENDÄ°NE Ã‡ARPMA
        this.snake.cells.forEach((cell, index) => {
            // Sadece hÃ¼cre listesinde varsa Ã§arpÄ±ÅŸÄ±r
            if (this.snake.x === cell.x && this.snake.y === cell.y) {
                this.triggerGameOver();
            }
        });

        if (this.gameOver) return;

        // GeÃ§miÅŸi kaydet (Kuyruk)
        this.snake.cells.unshift({ x: this.snake.x, y: this.snake.y });
        
        // YÄ±lan bÃ¼yÃ¼mÃ¼yorsa son parÃ§ayÄ± sil
        if (this.snake.cells.length > this.snake.maxCells) {
            this.snake.cells.pop();
        }

        // 3. ELMA YEME
        if (this.snake.x === this.apple.x && this.snake.y === this.apple.y) {
            this.snake.maxCells++;
            this.score += 10;
            this.scoreText.setText(`âš¡ Skor: ${this.score}`);
            
            // Neon Juice: Patlama ve Ekran SarsÄ±ntÄ±sÄ±
            this.eatBurst.emitParticleAt(this.apple.x + this.gridSize/2, this.apple.y + this.gridSize/2, 15);
            this.cameras.main.shake(100, 0.008);
            
            // Pop-up skor yazÄ±sÄ±
            const pt = this.add.text(this.apple.x + 20, this.apple.y, '+10', {
                fontSize: '28px', fill: '#F72585', fontFamily: 'Nunito', fontWeight: '900'
            }).setOrigin(0.5).setDepth(20);
            this.tweens.add({ targets: pt, y: pt.y - 40, alpha: 0, duration: 600, onComplete: () => pt.destroy() });

            // HÄ±zlanma (Zorluk eÄŸrisi)
            if (this.currentMoveSpeed > 60) {
                this.currentMoveSpeed -= 3; // Her elmada azÄ±cÄ±k hÄ±zlanÄ±r
            }

            this.placeApple();
        }
    }

    placeApple() {
        let isCollision = true;
        // Ä°Ã§eride gÃ¼venli bir alan bÄ±rakalÄ±m ki elma tam kenarda Ã§Ä±kmasÄ±n
        const safeCols = this.cols - 2;
        const safeRows = this.rows - 2;

        while (isCollision) {
            this.apple.x = (Math.floor(Math.random() * safeCols) + 1) * this.gridSize;
            this.apple.y = (Math.floor(Math.random() * safeRows) + 1) * this.gridSize;

            isCollision = false;
            
            // YÄ±lan oradaysa tekrar dene
            if (this.apple.x === this.snake.x && this.apple.y === this.snake.y) isCollision = true;
            for (let cell of this.snake.cells) {
                if (cell.x === this.apple.x && cell.y === this.apple.y) {
                    isCollision = true;
                    break;
                }
            }
        }
        
        // Yeni elma doÄŸduÄŸunda ufak bir parÄ±ldama iÅŸareti eklenebilir
    }

    drawGame() {
        this.graphics.clear();

        // â”€â”€ ELMAYI Ã‡Ä°Z (Glow Efektli Neon Meyve) â”€â”€
        const ax = this.apple.x + this.gridSize/2;
        const ay = this.apple.y + this.gridSize/2;
        
        // Parlama halkasÄ±
        this.graphics.fillStyle(0xF72585, 0.3);
        this.graphics.fillCircle(ax, ay, this.gridSize * 0.7);
        // Meyvenin kendisi
        this.graphics.fillStyle(0xFFD166, 1);
        this.graphics.fillRoundedRect(this.apple.x + 6, this.apple.y + 6, this.gridSize - 12, this.gridSize - 12, 8);
        
        // â”€â”€ YILANI Ã‡Ä°Z (GÃ¶kkuÅŸaÄŸÄ± / Neon GeÃ§iÅŸi) â”€â”€
        this.snake.cells.forEach((cell, index) => {
            const pad = 2;
            const size = this.gridSize - (pad * 2);
            
            // Kafadan kuyruÄŸa doÄŸru renk aÃ§Ä±lÄ±mÄ± (YeÅŸil'den Maviye)
            let rawColor = 0x06D6A0;
            if (index > 0) {
                // Hue kaydÄ±rma mantÄ±ÄŸÄ± (basitÃ§e mavi dozu katalÄ±m)
                const blueAmount = Math.min(255, index * 8);
                // 0x06D6A0 = 6, 214, 160 => Biz dinamik hexcod uretelim
                const r = 6;
                const g = Math.max(100, 214 - index*3);
                const b = Math.min(255, 160 + index*5);
                rawColor = (r << 16) | (g << 8) | b;
            }

            // DÄ±ÅŸ Parlama / GÃ¶vde
            this.graphics.fillStyle(rawColor, 1);
            
            // Kafa mÄ± kuyruk mu?
            if (index === 0) {
                // Kafa yuvarlak hatlÄ± ve biraz dÄ±ÅŸa taÅŸÄ±yor (nefes alma efekti)
                this.graphics.fillRoundedRect(cell.x + 1, cell.y + 1, size+2, size+2, 10);
                
                // GÃ¶zler (Harekete yÃ¶ne baksÄ±n)
                this.graphics.fillStyle(0xffffff, 1);
                
                // Basit gÃ¶z Ã§izimi
                let ex1, ey1, ex2, ey2;
                if (this.snake.dx > 0) { // SaÄŸa
                    ex1 = cell.x + 24; ey1 = cell.y + 10;
                    ex2 = cell.x + 24; ey2 = cell.y + 26;
                } else if (this.snake.dx < 0) { // Sola
                    ex1 = cell.x + 12; ey1 = cell.y + 10;
                    ex2 = cell.x + 12; ey2 = cell.y + 26;
                } else if (this.snake.dy < 0) { // YukarÄ±
                    ex1 = cell.x + 10; ey1 = cell.y + 12;
                    ex2 = cell.x + 26; ey2 = cell.y + 12;
                } else { // AÅŸaÄŸÄ±
                    ex1 = cell.x + 10; ey1 = cell.y + 24;
                    ex2 = cell.x + 26; ey2 = cell.y + 24;
                }
                this.graphics.fillCircle(ex1, ey1, 5);
                this.graphics.fillCircle(ex2, ey2, 5);
                // GÃ¶zbebeÄŸi
                this.graphics.fillStyle(0x000000, 1);
                this.graphics.fillCircle(ex1+1, ey1, 2);
                this.graphics.fillCircle(ex2+1, ey2, 2);

            } else {
                // GÃ¶vde - GittikÃ§e kÃ¼Ã§Ã¼len pad bÄ±rakalÄ±m ki kuyruk incelsin
                const tailPad = pad + Math.min(6, (index / this.snake.maxCells) * 6);
                const tSize = this.gridSize - (tailPad * 2);
                this.graphics.fillRoundedRect(cell.x + tailPad, cell.y + tailPad, tSize, tSize, 6);
            }
        });
    }

    triggerGameOver() {
        this.gameOver = true;
        
        // Kamera ÅŸiddetli sarsÄ±ntÄ± ve KÄ±rmÄ±zÄ± Flash
        this.cameras.main.shake(500, 0.03);
        this.cameras.main.flash(400, 255, 0, 50, 0.5);

        // YÄ±lanÄ±n her parÃ§asÄ±ndan partikÃ¼l patlat (Kafadan daha Ã§ok)
        this.snake.cells.forEach((cell, idx) => {
            this.deathBurst.emitParticleAt(cell.x + 20, cell.y + 20, idx === 0 ? 20 : 3);
        });

        // Ekrana yÄ±lanÄ± bir daha Ã§izme
        this.graphics.clear();

        // Rekor KaydÄ±
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
            panel.fillStyle(0x1a1a4e, 1);
            panel.fillRoundedRect(this.width / 2 - 300, this.height / 2 - 180, 600, 360, 24);
            panel.lineStyle(3, 0x06D6A0, 1);
            panel.strokeRoundedRect(this.width / 2 - 300, this.height / 2 - 180, 600, 360, 24);

            this.add.text(this.width / 2, this.height / 2 - 120, 'OYUN BÄ°TTÄ°!', {
                fontSize: '64px', fill: '#EF476F', fontFamily: 'Nunito', fontWeight: 'bold'
            }).setOrigin(0.5).setDepth(200);

            this.add.text(this.width / 2, this.height / 2 - 30, `Skor: ${this.score}`, {
                fontSize: '52px', fill: '#FFD166', fontFamily: 'Nunito', fontWeight: 'bold'
            }).setOrigin(0.5).setDepth(200);

            if (newRec) {
                const rt = this.add.text(this.width / 2, this.height / 2 + 50, 'ğŸ‰ YENÄ° REKOR! ğŸ‰', {
                    fontSize: '38px', fill: '#06D6A0', fontFamily: 'Nunito', fontWeight: 'bold'
                }).setOrigin(0.5).setDepth(200);
                this.tweens.add({ targets: rt, scale: 1.1, duration: 400, yoyo: true, repeat: -1 });
            }

            const rst = this.add.text(this.width / 2, this.height / 2 + 130, 'Ana MenÃ¼ye DÃ¶n', {
                fontSize: '26px', fill: '#aaa', fontFamily: 'Nunito', backgroundColor: '#333', padding: { x: 20, y: 10 }
            }).setOrigin(0.5).setDepth(200).setInteractive({ useHandCursor: true });

            this.time.delayedCall(300, () => {
                rst.on('pointerdown', () => this.scene.restart());
                this.input.keyboard.once('keydown-SPACE', () => this.scene.restart());
            });
        });
    }
}
