import * as THREE from 'three';
import Game from './game.js';
import AudioController from './AudioController.js';

class Main {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.uiContainer = document.getElementById('ui-container');
        this.initThree();
        this.initAudio();

        this.balance = 0; // Start with 0 sats as requested
        this.musicEnabled = localStorage.getItem('musicEnabled') !== 'false';
        this.gameOverHandled = false;
        this.previousMenu = 'main';
        this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
        this.isLoggedIn = !!this.currentUser;

        this.initUI(); // Call after properties are initialized

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
        if (this.isLoggedIn) {
            document.body.classList.add('logged-in');
        } else {
            document.body.classList.remove('logged-in');
        }

        this.menus = {
            main: document.getElementById('main-menu'),
            hud: document.getElementById('hud'),
            admin: document.getElementById('admin-panel'),
            gameOver: document.getElementById('game-over-screen'),
            withdraw: document.getElementById('withdraw-screen'),
            settings: document.getElementById('settings-screen'),
            createAccount: document.getElementById('create-account-screen'),
            login: document.getElementById('login-screen'),
        };

        this.updateBalanceUI();
        this.updateMusicButtonText();

        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.startGame());
        document.getElementById('main-menu-btn').addEventListener('click', () => {
            this.showMenu('main');
            // If going to main menu from game over, ensure player is gone
            if (this.game.player.parent) {
                this.scene.remove(this.game.player);
            }
        });
        
        const showAdmin = (fromMenu) => {
            this.previousMenu = fromMenu;
            const password = prompt('Enter Admin Password:');
            if (password === 'Alperen1') {
                this.populateAdminPanel();
                this.showMenu('admin');
            } else if(password !== null && password !== "") {
                alert('Incorrect Password');
            }
        };

        document.getElementById('admin-btn').addEventListener('click', () => showAdmin('main'));
        document.getElementById('admin-btn-ingame').addEventListener('click', () => {
             if (!this.game.isPlaying) return;
             this.game.pause();
             this.audio.pauseSound('music');
             showAdmin('hud');
        });
        document.getElementById('admin-back-btn').addEventListener('click', () => this.goBack());

        // Settings Listeners
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.showSettingsScreen('main');
        });
        document.getElementById('settings-back-btn').addEventListener('click', () => this.goBack());
        document.getElementById('music-toggle-btn').addEventListener('click', () => this.toggleMusic());
        document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());

        // Create Account Listeners
        document.getElementById('create-account-btn').addEventListener('click', () => {
            this.previousMenu = 'main';
            document.getElementById('account-creation-status').textContent = ''; // Clear status
            this.showMenu('createAccount');
        });
        document.getElementById('account-back-btn').addEventListener('click', () => this.goBack());
        document.getElementById('create-account-submit-btn').addEventListener('click', () => this.handleAccountCreation());
        
        // Login Listeners
        document.getElementById('login-btn').addEventListener('click', () => {
            this.previousMenu = 'main';
            document.getElementById('login-status-message').textContent = '';
            this.showMenu('login');
        });
        document.getElementById('login-back-btn').addEventListener('click', () => this.goBack());
        document.getElementById('login-submit-btn').addEventListener('click', () => this.handleLogin());

        // Withdraw Listeners
        document.getElementById('withdraw-btn-menu').addEventListener('click', () => {
            this.showWithdrawScreen('main');
        });
        document.getElementById('withdraw-btn-ingame').addEventListener('click', () => {
            if (!this.game.isPlaying) return;
            this.game.pause();
            this.audio.pauseSound('music');
            this.showWithdrawScreen('hud');
        });
        document.getElementById('withdraw-back-btn').addEventListener('click', () => this.goBack());
        document.getElementById('request-withdraw-btn').addEventListener('click', () => this.handleWithdrawRequest());
    }

    goBack() {
        if (this.previousMenu === 'hud' && this.game.isPlaying) {
            this.game.resume();
            if (this.musicEnabled) {
                this.audio.playSound('music');
            }
        }
        this.showMenu(this.previousMenu);
    }
    
    showSettingsScreen(fromMenu) {
        this.previousMenu = fromMenu;
        this.showMenu('settings');
    }

    updateMusicButtonText() {
        const btn = document.getElementById('music-toggle-btn');
        if (btn) {
            btn.textContent = `Music: ${this.musicEnabled ? 'ON' : 'OFF'}`;
        }
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        localStorage.setItem('musicEnabled', String(this.musicEnabled));
        this.updateMusicButtonText();

        if (this.game.isPlaying && !this.game.isGameOver && !this.game.paused) {
            if (this.musicEnabled) {
                this.audio.playSound('music');
            } else {
                this.audio.pauseSound('music');
            }
        }
    }

    handleLogin() {
        const usernameInput = document.getElementById('login-username');
        const passwordInput = document.getElementById('login-password');
        const statusMsg = document.getElementById('login-status-message');

        const usernameOrEmail = usernameInput.value.trim();
        const password = passwordInput.value;

        statusMsg.style.color = 'var(--accent-color)';

        if (!usernameOrEmail || !password) {
            statusMsg.textContent = 'Please fill all fields.';
            return;
        }

        // Retrieve all accounts from localStorage (simulating a user database)
        const accounts = JSON.parse(localStorage.getItem('accounts')) || {};
        const account = Object.values(accounts).find(acc => (acc.username === usernameOrEmail || acc.email === usernameOrEmail));

        if (account && account.password === password) { // WARNING: Plain text password check.
            this.isLoggedIn = true;
            this.currentUser = account;
            localStorage.setItem('currentUser', JSON.stringify(account));
            document.body.classList.add('logged-in');
            
            statusMsg.style.color = '#00ff00';
            statusMsg.textContent = `Welcome back, ${account.username}!`;
            
            setTimeout(() => {
                this.showMenu('main');
                usernameInput.value = '';
                passwordInput.value = '';
                statusMsg.textContent = '';
            }, 1500);

        } else {
            statusMsg.textContent = 'Invalid username/email or password.';
        }
    }
    
    handleLogout() {
        this.isLoggedIn = false;
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        document.body.classList.remove('logged-in');
        this.showMenu('main'); // Go back to main menu
    }

    handleAccountCreation() {
        const usernameInput = document.getElementById('new-username');
        const emailInput = document.getElementById('new-email');
        const passwordInput = document.getElementById('new-password');
        const confirmPasswordInput = document.getElementById('confirm-password');
        const statusMsg = document.getElementById('account-creation-status');

        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        statusMsg.style.color = 'var(--accent-color)';

        if (!username || !email || !password || !confirmPassword) {
            statusMsg.textContent = 'Please fill all fields.';
            return;
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            statusMsg.textContent = 'Please enter a valid email address.';
            return;
        }
        if (password.length < 6) {
            statusMsg.textContent = 'Password must be at least 6 characters.';
            return;
        }
        if (password !== confirmPassword) {
            statusMsg.textContent = 'Passwords do not match.';
            return;
        }

        // Simulate a user database in localStorage
        const accounts = JSON.parse(localStorage.getItem('accounts')) || {};
        if (accounts[username]) {
            statusMsg.textContent = 'Username already taken.';
            return;
        }
        if (Object.values(accounts).some(acc => acc.email === email)) {
            statusMsg.textContent = 'Email already registered.';
            return;
        }

        // Store user data. In a real app, this would be on a server and password would be hashed.
        accounts[username] = { username, email, password };
        localStorage.setItem('accounts', JSON.stringify(accounts));
        
        statusMsg.style.color = '#00ff00';
        statusMsg.textContent = 'Account created successfully! Please login.';

        setTimeout(() => {
            this.showMenu('login');
            // Clear fields for next time
            usernameInput.value = '';
            emailInput.value = '';
            passwordInput.value = '';
            confirmPasswordInput.value = '';
            statusMsg.textContent = '';
        }, 2000);
    }

    showWithdrawScreen(fromMenu) {
        this.previousMenu = fromMenu;
        this.updateBalanceUI();
        document.getElementById('withdraw-request-amount').value = '';
        document.getElementById('withdraw-request-address').value = '';
        const statusMsg = document.getElementById('withdraw-status-message');
        statusMsg.textContent = '';
        statusMsg.style.color = 'var(--accent-color)';
        this.showMenu('withdraw');
    }

    handleWithdrawRequest() {
        const amountInput = document.getElementById('withdraw-request-amount');
        const addressInput = document.getElementById('withdraw-request-address');
        const statusMsg = document.getElementById('withdraw-status-message');

        const amount = parseInt(amountInput.value, 10);
        const address = addressInput.value.trim();

        statusMsg.style.color = 'var(--accent-color)';

        const lastWithdrawalTime = localStorage.getItem('lastWithdrawalTimestamp');
        const twentyFourHours = 24 * 60 * 60 * 1000;
        if (lastWithdrawalTime && (Date.now() - lastWithdrawalTime < twentyFourHours)) {
            statusMsg.textContent = 'You can only make one withdrawal request per day.';
            return;
        }

        if (isNaN(amount) || amount <= 0) {
            statusMsg.textContent = 'Please enter a valid amount.';
            return;
        }
        if (amount < 10000) {
            statusMsg.textContent = 'Minimum withdrawal is 10,000 satoshi.';
            return;
        }
        if (amount > this.balance) {
            statusMsg.textContent = 'Insufficient balance.';
            return;
        }
        if (address === '') {
            statusMsg.textContent = 'Please enter a BTC address.';
            return;
        }

        // Request is valid
        this.balance -= amount;
        this.updateBalanceUI();
        localStorage.setItem('lastWithdrawalTimestamp', Date.now().toString());

        statusMsg.style.color = '#00ff00'; // Success green
        statusMsg.textContent = 'Withdrawal request submitted for review!';
        
        setTimeout(() => {
            this.goBack();
        }, 2000);
    }

    populateAdminPanel() {
        const list = document.getElementById('admin-request-list');
        list.innerHTML = ''; // Clear previous list

        const requestCount = 100; // As requested
        for (let i = 0; i < requestCount; i++) {
            // Generate dummy data
            const username = `Player${Math.floor(Math.random() * 9000) + 1000}`;
            const amount = (Math.floor(Math.random() * 19) + 1) * 10000; // 10k to 200k
            const address = 'bc1q' + [...Array(38)].map(() => 'abcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 36))).join('');
            
            const item = document.createElement('div');
            item.className = 'admin-request-item';
            
            item.innerHTML = `
                <div class="request-details">
                    <p><strong>User:</strong> <span>${username}</span></p>
                    <p><strong>Amount:</strong> <span>${amount.toLocaleString()} sats</span></p>
                    <p><strong>Address:</strong> <span>${address}</span></p>
                </div>
                <div class="request-actions">
                    <span class="request-status pending">Pending</span>
                    <button class="approve-btn">✅ Approve</button>
                    <button class="reject-btn">❌ Reject</button>
                </div>
            `;

            const statusEl = item.querySelector('.request-status');
            const approveBtn = item.querySelector('.approve-btn');
            const rejectBtn = item.querySelector('.reject-btn');
            
            const handleAction = () => {
                 approveBtn.style.display = 'none';
                 rejectBtn.style.display = 'none';
            }

            approveBtn.addEventListener('click', () => {
                statusEl.textContent = 'Approved';
                statusEl.className = 'request-status approved';
                handleAction();
            });

            rejectBtn.addEventListener('click', () => {
                statusEl.textContent = 'Denied';
                statusEl.className = 'request-status denied';
                handleAction();
            });

            list.appendChild(item);
        }
    }

    updateBalanceUI() {
        const balanceStr = this.balance.toLocaleString();
        document.getElementById('main-menu-balance').textContent = balanceStr;
        document.getElementById('hud-balance').textContent = balanceStr;
        document.getElementById('withdraw-balance').textContent = balanceStr;
    }

    showMenu(name) {
        Object.values(this.menus).forEach(menu => menu.classList.remove('active'));
        if (this.menus[name]) {
            this.menus[name].classList.add('active');
        }
    }

    startGame() {
        this.gameOverHandled = false;
        this.showMenu('hud');
        this.game.start();
        if (this.musicEnabled) {
            this.audio.playSound('music');
        }
    }

    handleGameOver() {
        this.gameOverHandled = true;
        this.balance += this.game.score;
        this.updateBalanceUI();
        document.getElementById('final-score').textContent = this.game.score;
        this.showMenu('gameOver');
    }

    updateHUD() {
        document.getElementById('score').textContent = this.game.score;
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
            this.updateHUD();
        } else if (this.game.isGameOver && !this.gameOverHandled) {
            this.handleGameOver();
        }

        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('load', () => new Main());