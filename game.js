import * as THREE from 'three';

const LANES = [-3, 0, 3];
const PLAYER_SPEED = 15;
const OBSTACLE_COUNT = 10;
const COIN_COUNT = 30;

export default class Game {
    constructor(scene, camera, audio) {
        this.scene = scene;
        this.camera = camera;
        this.audio = audio;
        this.isPlaying = false;
        this.isGameOver = false;
        this.score = 0;
        this.speed = PLAYER_SPEED;
        this.paused = false;

        this.init();
        this.setupControls();
    }

    init() {
        // Player
        const playerGeo = new THREE.CapsuleGeometry(0.5, 1, 4, 12);
        const playerMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, roughness: 0.4, metalness: 0.8 });
        this.player = new THREE.Mesh(playerGeo, playerMat);
        this.player.position.y = 1.5;
        this.player.castShadow = true;
        this.player.currentLane = 1;

        // Ground
        this.grounds = [];
        const groundGeo = new THREE.PlaneGeometry(12, 100);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x222244 });
        for (let i = 0; i < 3; i++) {
            const ground = new THREE.Mesh(groundGeo, groundMat);
            ground.rotation.x = -Math.PI / 2;
            ground.position.z = -50 * i;
            ground.receiveShadow = true;
            this.grounds.push(ground);
            this.scene.add(ground);
        }
        
        // Neon lights for ground
        this.neonLights = [];
        const lightGeo = new THREE.PlaneGeometry(0.5, 100);
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
        [-5.5, 5.5].forEach(x => {
            for (let i = 0; i < 3; i++) {
                const light = new THREE.Mesh(lightGeo, lightMat);
                light.rotation.x = -Math.PI / 2;
                light.position.set(x, 0.01, -50 * i);
                this.neonLights.push(light);
                this.scene.add(light);
            }
        });


        // Obstacles Pool
        this.obstacles = [];
        const obstacleGeo = new THREE.BoxGeometry(2, 2, 2);
        const obstacleMat = new THREE.MeshStandardMaterial({ color: 0xffa500 });
        for (let i = 0; i < OBSTACLE_COUNT; i++) {
            const obstacle = new THREE.Mesh(obstacleGeo, obstacleMat);
            obstacle.visible = false;
            this.obstacles.push(obstacle);
            this.scene.add(obstacle);
        }

        // Coins Pool
        this.coins = [];
        const coinGeo = new THREE.TorusGeometry(0.5, 0.2, 16, 100);
        const coinTexture = new THREE.TextureLoader().load('coin-icon.png');
        const coinMat = new THREE.MeshStandardMaterial({ color: 0xffa500, map: coinTexture, emissive: 0xffa500, emissiveIntensity: 0.5 });
        for (let i = 0; i < COIN_COUNT; i++) {
            const coin = new THREE.Mesh(coinGeo, coinMat);
            coin.rotation.y = Math.PI / 2;
            coin.visible = false;
            this.coins.push(coin);
            this.scene.add(coin);
        }
    }

    setupControls() {
        this.touchStartX = 0;
        this.touchEndX = 0;

        window.addEventListener('keydown', (e) => {
            if (!this.isPlaying) return;
            if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') this.moveLane(-1);
            if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') this.moveLane(1);
        });

        window.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        
        window.addEventListener('touchend', (e) => {
            if (!this.isPlaying) return;
            this.touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        }, { passive: true });
    }

    handleSwipe() {
        if (this.touchEndX < this.touchStartX - 50) this.moveLane(-1);
        if (this.touchEndX > this.touchStartX + 50) this.moveLane(1);
    }
    
    moveLane(direction) {
        if (this.paused) return;
        const targetLane = this.player.currentLane + direction;
        if (targetLane >= 0 && targetLane < LANES.length) {
            this.player.currentLane = targetLane;
        }
    }

    start() {
        this.isPlaying = true;
        this.isGameOver = false;
        this.paused = false;
        this.score = 0;
        this.speed = PLAYER_SPEED;
        this.updateScoreUI();
        
        this.player.position.set(0, 1.5, 0);
        this.player.currentLane = 1;
        this.scene.add(this.player);

        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(this.player.position);
        
        this.obstacles.forEach(o => o.visible = false);
        this.coins.forEach(c => c.visible = false);
        this.spawnInitialObjects();
        document.getElementById('game-over-screen').classList.remove('active');
    }

    update(deltaTime) {
        if (this.paused) return;
        if (!this.isPlaying || this.isGameOver) return;
        
        this.player.position.z -= this.speed * deltaTime;

        // Smoothly move player between lanes
        const targetX = LANES[this.player.currentLane];
        this.player.position.x = THREE.MathUtils.lerp(this.player.position.x, targetX, 0.2);

        this.camera.position.z = this.player.position.z + 10;
        
        this.updateWorld();
        this.checkCollisions();
        
        // Animate coins
        this.coins.forEach(coin => {
            if(coin.visible) {
                coin.rotation.z += deltaTime * 2;
            }
        });
    }

    updateWorld() {
        [...this.grounds, ...this.neonLights].forEach(obj => {
             if (this.player.position.z < obj.position.z - 50) {
                 obj.position.z -= 150; // 3 grounds * 50 length
                 if(obj.geometry.type === 'PlaneGeometry' && obj.material.color.getHex() !== 0xff00ff){
                     this.spawnObjectsOnGround(obj);
                 }
             }
        });
    }

    spawnObjectsOnGround(ground) {
        const startZ = ground.position.z - 25;
        const endZ = ground.position.z + 25;

        for (let z = startZ; z < endZ; z += 10) {
            const lane = Math.floor(Math.random() * 3);
            if (Math.random() < 0.3) {
                const obstacle = this.getInactive(this.obstacles);
                if (obstacle) {
                    obstacle.position.set(LANES[lane], 1, z);
                    obstacle.visible = true;
                }
            } else if (Math.random() < 0.7) {
                for(let i = 0; i < 3; i++){
                    const coin = this.getInactive(this.coins);
                    if (coin) {
                        coin.position.set(LANES[lane], 1.5, z + i * 1.5);
                        coin.visible = true;
                    }
                }
            }
        }
    }
    
    spawnInitialObjects() {
        this.grounds.forEach(g => {
            if(g.position.z < this.player.position.z) {
                this.spawnObjectsOnGround(g);
            }
        });
    }

    getInactive(pool) {
        return pool.find(obj => !obj.visible);
    }
    
    checkCollisions() {
        const playerBox = new THREE.Box3().setFromObject(this.player);
        
        this.obstacles.forEach(obstacle => {
            if (obstacle.visible) {
                const obstacleBox = new THREE.Box3().setFromObject(obstacle);
                if (playerBox.intersectsBox(obstacleBox)) {
                    this.gameOver();
                }
            }
        });

        this.coins.forEach(coin => {
            if (coin.visible) {
                const coinBox = new THREE.Box3().setFromObject(coin);
                if (playerBox.intersectsBox(coinBox)) {
                    coin.visible = false;
                    this.score++;
                    this.updateScoreUI();
                    this.audio.playSound('collect');
                }
            }
        });
    }

    updateScoreUI() {
        document.getElementById('score').textContent = this.score;
    }
    
    pause() {
        this.paused = true;
        this.audio.pauseSound('music');
    }
    
    resume() {
        this.paused = false;
        if(this.isPlaying && !this.isGameOver) {
             this.audio.playSound('music');
        }
    }

    gameOver() {
        this.isPlaying = false;
        this.isGameOver = true;
        this.paused = false;
        this.audio.stopSound('music');
        this.audio.playSound('crash');
        
        this.scene.remove(this.player);
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('hud').classList.remove('active');
        document.getElementById('game-over-screen').classList.add('active');
    }
}

