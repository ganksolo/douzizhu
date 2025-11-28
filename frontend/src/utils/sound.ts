class SoundManager {
    private sounds: Record<string, HTMLAudioElement> = {};
    private enabled: boolean = true;
    private initialized: boolean = false;
    private loadingPromises: Promise<void>[] = [];

    constructor() {
        this.loadSounds();
    }

    private loadSounds() {
        const soundNames = ['shuffle', 'deal', 'play', 'win', 'lose', 'click'];
        soundNames.forEach((name) => {
            const audio = new Audio(`/sounds/${name}.ogg`);
            audio.preload = 'auto';
            audio.volume = 0.6; // Set reasonable default volume
            this.sounds[name] = audio;

            // Create loading promise for each sound
            const loadPromise = new Promise<void>((resolve) => {
                audio.addEventListener('canplaythrough', () => resolve(), { once: true });
                audio.addEventListener('error', () => {
                    console.warn(`Failed to load sound: ${name}`);
                    resolve(); // Resolve anyway to not block
                }, { once: true });
            });
            this.loadingPromises.push(loadPromise);
        });
    }

    // Must be called after user interaction to comply with autoplay policy
    async initialize() {
        if (this.initialized) return;

        try {
            // Wait for all sounds to be loaded
            await Promise.all(this.loadingPromises);

            // Try to play and immediately pause a silent sound to unlock audio context
            const testSound = this.sounds['click'];
            if (testSound) {
                testSound.volume = 0;
                await testSound.play().catch(() => { });
                testSound.pause();
                testSound.currentTime = 0;
                testSound.volume = 0.6;
            }

            this.initialized = true;
            console.log('SoundManager initialized successfully');
        } catch (e) {
            console.warn('SoundManager initialization failed:', e);
        }
    }

    async play(name: string) {
        if (!this.enabled) return;

        const sound = this.sounds[name];
        if (sound) {
            try {
                sound.currentTime = 0;
                await sound.play();
            } catch (e) {
                // Silently fail if autoplay is blocked
                if (!this.initialized) {
                    console.warn(`Sound ${name} blocked. Call initialize() first after user interaction.`);
                }
            }
        }
    }

    toggle(enabled: boolean) {
        this.enabled = enabled;
    }

    isReady() {
        return this.initialized;
    }
}

export const soundManager = new SoundManager();
