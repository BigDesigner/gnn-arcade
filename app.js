/**
 * GNNgame Core Engine
 * Architect: Gemini (Hybrid Strategy)
 */

class GNNGameEngine {
    constructor() {
        this.activeGame = null;
        this.canvas = document.getElementById('main-canvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.gameSelector = document.getElementById('game-selector');
        // Delay init slightly to ensure DOM is fully ready if script is not deferred
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    getHighScore(gameId) {
        return parseInt(localStorage.getItem(`gnngame_highscore_${gameId}`)) || 0;
    }

    saveScore(gameId, score) {
        const current = this.getHighScore(gameId);
        if (score > current) {
            localStorage.setItem(`gnngame_highscore_${gameId}`, score);
            return true; // New record
        }
        return false;
    }

    async init() {
        if (!this.canvas) {
            this.canvas = document.getElementById('main-canvas');
            if (this.canvas) {
                this.ctx = this.canvas.getContext('2d');
            }
        }

        // Tam Ekran Kontrolü
        const fullscreenBtn = document.getElementById('toggle-fullscreen');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                const wrapper = document.getElementById('canvas-wrapper');
                if (!document.fullscreenElement) {
                    // Tam ekrana geç
                    wrapper.requestFullscreen().catch(err => {
                        console.error(`Tam ekran hatası: ${err.message}`);
                    });
                } else {
                    // Tam ekrandan çık
                    document.exitFullscreen();
                }
            });
        }

        // Logo Tıklama (Ana Sayfa)
        const goHome = document.getElementById('go-home');
        if (goHome) {
            goHome.style.cursor = 'pointer';
            goHome.addEventListener('click', () => {
                location.hash = '';
                this.showHome();
            });
        }

        // 1. Hash Routing Dinle
        window.addEventListener('hashchange', () => this.handleRouting());

        // 2. Oyun Listesini Yükle
        try {
            const response = await fetch('games.json');
            const data = await response.json();
            this.renderHome(data.games);
            this.populateSelector(data.games);
            this.handleRouting(); // Sayfa ilk açıldığında kontrol et
        } catch (err) {
            console.error("GNNgame Error: Manifest bulunamadı!", err);
        }
    }

    async loadGame(gameId) {
        if (this.activeGame) this.unloadGame();

        console.log(`Loading: ${gameId}`);
        try {
            const gameModule = await import(`./games/${gameId}/script.js`);
            const GameContent = gameModule.default || gameModule;

            // UI Geçişi
            const homeView = document.getElementById('home-view');
            const gameView = document.getElementById('game-view');
            if (homeView) homeView.classList.add('hidden');
            if (gameView) gameView.classList.remove('hidden');

            // --- Phaser vs Plain JS Ayrımı ---
            const isPhaserScene = typeof GameContent === 'function' && 
                                 window.Phaser && 
                                 (GameContent.prototype instanceof window.Phaser.Scene || GameContent.name);

            if (isPhaserScene) {
                console.log(`${gameId}: Detected Phaser Scene. Initializing Phaser Game...`);
                
                const config = {
                    type: Phaser.AUTO,
                    parent: 'canvas-wrapper',
                    width: 1280,
                    height: 720,
                    physics: {
                        default: 'arcade',
                        arcade: { debug: false }
                    },
                    scene: GameContent,
                    scale: {
                        mode: Phaser.Scale.FIT,
                        autoCenter: Phaser.Scale.CENTER_BOTH
                    }
                };
                
                // Eski canvas'ı gizle, Phaser kendi canvas'ını 'canvas-wrapper' içine oluşturacak
                if (this.canvas) this.canvas.style.display = 'none';
                
                this.phaserGame = new Phaser.Game(config);
                this.activeGame = { isPhaser: true, instance: this.phaserGame };
                
                // Phaser instance'ına global engine'i enjekte et (Skor vb için)
                this.phaserGame.gameEngine = this;
            } else {
                // Klasik Plain JS Yapısı
                console.log(`${gameId}: Detected Plain JS Module.`);
                this.activeGame = GameContent;
                if (this.canvas) {
                    this.canvas.style.display = 'block';
                    if (this.activeGame.init) this.activeGame.init(this.canvas, this.ctx);
                }
            }
        } catch (err) {
            alert("Oyun yüklenirken bir hata oluştu!");
            console.error(err);
        }
    }

    unloadGame() {
        console.log("Cleaning up previous game...");
        
        if (this.activeGame) {
            if (this.activeGame.isPhaser) {
                // Phaser Temizliği
                console.log("Destroying Phaser Instance...");
                this.activeGame.instance.destroy(true);
            } else if (this.activeGame.destroy) {
                // Plain JS Temizliği
                this.activeGame.destroy();
            }
        }

        this.activeGame = null;
        this.phaserGame = null;

        // Canvas Reset (Plain JS için)
        if (this.canvas) {
            this.canvas.style.display = 'block';
            const newCtx = this.canvas.getContext('2d');
            newCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            const oldCanvas = this.canvas;
            const newCanvas = oldCanvas.cloneNode(true);
            if (oldCanvas.parentNode) {
                oldCanvas.parentNode.replaceChild(newCanvas, oldCanvas);
            }
            this.canvas = newCanvas;
            this.ctx = this.canvas.getContext('2d');
        }
    }

    handleRouting() {
        const hash = window.location.hash.substring(1);
        if (hash) this.loadGame(hash);
        else this.showHome();
    }

    showHome() {
        if (this.activeGame) this.unloadGame();
        const homeView = document.getElementById('home-view');
        const gameView = document.getElementById('game-view');
        if (homeView) homeView.classList.remove('hidden');
        if (gameView) gameView.classList.add('hidden');
    }

    renderHome(games) {
        const grid = document.getElementById('game-grid');
        if (!grid) return;
        grid.innerHTML = games.map(game => {
            const highScore = this.getHighScore(game.id);
            return `
            <div class="game-card" onclick="location.hash='${game.id}'">
                ${highScore > 0 ? `<div class="badge">🚀 Skor: ${highScore}</div>` : ''}
                <div class="card-thumbnail">
                    <img src="${game.thumbnail}" alt="${game.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="card-thumbnail-fallback" style="display:none;">🎮</div>
                </div>
                <h3>${game.title}</h3>
                <p>${game.description}</p>
            </div>
            `;
        }).join('');
    }

    populateSelector(games) {
        if (!this.gameSelector) return;
        games.forEach(game => {
            const opt = document.createElement('option');
            opt.value = game.id;
            opt.textContent = game.title;
            this.gameSelector.appendChild(opt);
        });
        this.gameSelector.addEventListener('change', (e) => {
            if (e.target.value) location.hash = e.target.value;
        });
    }
}

window.gameEngine = new GNNGameEngine();
