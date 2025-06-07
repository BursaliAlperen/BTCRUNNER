export default class AudioController {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.sounds = {};
        this.musicSource = null;
    }

    async addSound(name, url, loop = false) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.sounds[name] = { buffer: audioBuffer, loop: loop };
        } catch (error) {
            console.error(`Failed to load sound: ${name}`, error);
        }
    }

    playSound(name) {
        if (!this.sounds[name] || !this.sounds[name].buffer) {
            console.warn(`Sound not found or not loaded: ${name}`);
            return;
        }

        // To prevent issues with resuming context on user interaction
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = this.sounds[name].buffer;
        source.loop = this.sounds[name].loop;
        source.connect(this.audioContext.destination);
        source.start(0);
        
        if(this.sounds[name].loop) {
            if(this.musicSource) {
                this.musicSource.stop();
            }
            this.musicSource = source;
        }
    }
    
    pauseSound(name) {
        if(this.sounds[name] && this.sounds[name].loop) {
            if(this.musicSource) this.musicSource.stop();
            this.musicSource = null;
        }
    }

    stopSound(name) {
        if(this.sounds[name] && this.sounds[name].loop) {
            if (this.musicSource) {
                this.musicSource.stop();
                this.musicSource = null;
            }
        }
        // Could be extended to stop non-looping sounds if needed
    }
}

