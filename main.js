import * as THREE from 'three';
import Game from './game.js';
import AudioController from './AudioController.js';

class Main {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.uiContainer = document.getElementById('ui-container');
        this.initThree();
        this.initUI();
        this.initAudio();

        this.game = new Game(this.scene, this.camera, this.audio);
        
        this.clock = new THREE.Clock();
        this.animate();
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x0a0a1f, 10, 80);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 2, 0);

        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7);
        this.scene.add(directionalLight);

        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    initAudio() {
        this.audio = new AudioController();
        this.audio.addSound('collect', 'collect-coin.mp3');
        this.audio.addSound('crash', 'crash.mp3');
        this.audio.addSound('music', 'background-music.mp3', true);
    }
    
    initUI() {
        this.menus = {
            main: document.getElementById('main-menu'),
            hud: document.getElementById('hud'),
            admin: document.getElementById('admin-panel'),
            gameOver: document.getElementById('game-over-screen'),
        };

        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.startGame());
        
        const showAdmin = () => {
            const password = prompt('Enter Admin Password:');
            if (password === 'Alperen1') {
                this.showMenu('admin');
            } else if(password) {
                alert('Incorrect Password');
            }
        };

        document.getElementById('admin-btn').addEventListener('click', showAdmin);
        document.getElementById('admin-btn-ingame').addEventListener('click', () => {
             this.game.pause();
             showAdmin();
        });
        document.getElementById('admin-back-btn').addEventListener('click', () => {
            this.game.resume();
            this.showMenu(this.game.isGameOver ? 'gameOver' : 'hud');
        });

        const adminStatusEl = document.querySelector('#admin-status span');
        document.getElementById('approve-btn').addEventListener('click', () => {
            adminStatusEl.textContent = 'Approved';
            adminStatusEl.className = 'approved';
        });
        document.getElementById('reject-btn').addEventListener('click', () => {
            adminStatusEl.textContent = 'Denied';
            adminStatusEl.className = 'denied';
        });

        // Other buttons are placeholders for now
        document.getElementById('settings-btn').addEventListener('click', () => alert('Settings coming soon!'));
        document.getElementById('withdraw-btn-menu').addEventListener('click', () => alert('Withdraw functionality coming soon!'));
        document.getElementById('withdraw-btn-ingame').addEventListener('click', () => alert('Withdraw functionality coming soon!'));
    }

    showMenu(name) {
        Object.values(this.menus).forEach(menu => menu.classList.remove('active'));
        if (this.menus[name]) {
            this.menus[name].classList.add('active');
        }
    }

    startGame() {
        this.showMenu('hud');
        this.game.start();
        this.audio.playSound('music');
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const deltaTime = this.clock.getDelta();
        
        if (this.game.isPlaying) {
            this.game.update(deltaTime);
        }

        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('load', () => new Main());

