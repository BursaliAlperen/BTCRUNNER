import * as THREE from 'three';

const LANES = [-3, 0, 3];
const PLAYER_SPEED = 15;
const OBSTACLE_COUNT = 10;
const COIN_COUNT = 30;
const CAR_COUNT = 5;

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

        // Cars Pool
        this.cars = [];
        for (let i = 0; i < CAR_COUNT; i++) {
            const car = this.createCar();
            car.visible = false;
            this.cars.push(car);
            this.scene.add(car);
        }
    }

    createCar() {
        const car = new THREE.Group();

        // Car Body
        const bodyGeo = new THREE.BoxGeometry(2, 1, 4);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xaa0000, roughness: 0.5, metalness: 0.5 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.5;
        car.add(body);

        // Car Cabin
        const cabinGeo = new THREE.BoxGeometry(1.5, 0.8, 2);
        const cabinMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.1, metalness: 0.2 });
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(0, 1.2, -0.5);
        car.add(cabin);

        // Headlights
        const lightGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16);
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        
        const headLight1 = new THREE.Mesh(lightGeo, lightMat);
        headLight1.position.set(-0.7, 0.5, -2.05);
        headLight1.rotation.x = Math.PI / 2;
        car.add(headLight1);
        
        const headLight2 = headLight1.clone();
        headLight2.position.x = 0.7;
        car.add(headLight2);

        // Taillights
        const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const tailLight1 = new THREE.Mesh(lightGeo, tailLightMat);
        tailLight1.position.set(-0.7, 0.5, 2.05);
        tailLight1.rotation.x = Math.PI / 2;
        car.add(tailLight1);

        const tailLight2 = tailLight1.clone();
        tailLight2.position.x = 0.7;
        car.add(tailLight2);
        
        // Add a speed property to the car group
        car.userData.speed = 0;

        return car;
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

        this.player.position.set(0, 1.5, 0);
        this.player.currentLane = 1;
        this.scene.add(this.player);

        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(this.player.position);
        
        this.obstacles.forEach(o => o.visible = false);
        this.coins.forEach(c => c.visible = false);
        this.cars.forEach(car => car.visible = false);
        this.spawnInitialObjects();
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
        this.updateCars(deltaTime);
        this.checkCollisions();
        
        // Animate coins
        this.coins.forEach(coin => {
            if(coin.visible) {
                coin.rotation.z += deltaTime * 2;
            }
        });
    }

    updateCars(deltaTime) {
        this.cars.forEach(car => {
            if (car.visible) {
                car.position.z += car.userData.speed * deltaTime;
                
                // De-spawn car if it's far behind the player
                if(car.position.z > this.player.position.z + 20) {
                    car.visible = false;
                }
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
        const occupiedLanes = {}; // To prevent spawning multiple things in the same spot

        for (let z = startZ; z < endZ; z += 15) { // Increased spacing
            const lane = Math.floor(Math.random() * 3);
            if (occupiedLanes[z] === lane) continue;

            const randomVal = Math.random();

            if (randomVal < 0.2) { // Spawn static obstacle
                const obstacle = this.getInactive(this.obstacles);
                if (obstacle) {
                    obstacle.position.set(LANES[lane], 1, z);
                    obstacle.visible = true;
                    occupiedLanes[z] = lane;
                }
            } else if (randomVal < 0.4) { // Spawn a moving car
                const car = this.getInactive(this.cars);
                if (car) {
                    car.position.set(LANES[lane], 0, z);
                    // Cars can move with or against player direction
                    car.userData.speed = (Math.random() > 0.5) ? PLAYER_SPEED * 0.5 : -PLAYER_SPEED * 0.2;
                    // Flip car model if it's moving towards player
                    car.rotation.y = car.userData.speed > 0 ? Math.PI : 0;
                    car.visible = true;
                    occupiedLanes[z] = lane;
                }
            } else if (randomVal < 0.8) { // Spawn coins
                for(let i = 0; i < 5; i++){
                    const coin = this.getInactive(this.coins);
                    if (coin) {
                        coin.position.set(LANES[lane], 1.5, z + i * 1.5);
                        coin.visible = true;
                    }
                }
                occupiedLanes[z] = lane;
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

        this.cars.forEach(car => {
            if (car.visible) {
                const carBox = new THREE.Box3().setFromObject(car);
                if (playerBox.intersectsBox(carBox)) {
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
    }
    
    resume() {
        this.paused = false;
    }

    gameOver() {
        this.isPlaying = false;
        this.isGameOver = true;
        this.paused = false;
        this.audio.stopSound('music');
        this.audio.playSound('crash');
        
        this.scene.remove(this.player);
    }
}