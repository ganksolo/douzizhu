class SoundManager {
    private sounds: Record<string, HTMLAudioElement> = {};
    private enabled: boolean = true;

    constructor() {
        this.loadSounds();
    }

    private loadSounds() {
        const soundNames = ['shuffle', 'deal', 'play', 'win', 'lose', 'click'];
        soundNames.forEach((name) => {
            // Assuming sounds are in public/sounds/
            const audio = new Audio(`/sounds/${name}.ogg`);
            audio.preload = 'auto';
            this.sounds[name] = audio;
        });
    }

    play(name: string) {
        if (!this.enabled) return;
        const sound = this.sounds[name];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch((e) => console.warn(`Failed to play sound ${name}:`, e));
        }
    }

    toggle(enabled: boolean) {
        this.enabled = enabled;
    }
}

export const soundManager = new SoundManager();
