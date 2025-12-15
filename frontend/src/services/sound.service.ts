/**
 * Sound Service - Manages game sound effects
 */

export type SoundType = 'click' | 'deal' | 'play' | 'shuffle' | 'win' | 'lose';

class SoundServiceClass {
    private sounds: Map<SoundType, HTMLAudioElement> = new Map();
    private enabled: boolean = true;
    private volume: number = 0.5;
    private initialized: boolean = false;

    /**
     * Initialize all sound effects
     */
    init() {
        if (this.initialized) return;

        const soundFiles: Record<SoundType, string> = {
            click: '/sounds/click.ogg',
            deal: '/sounds/deal.ogg',
            play: '/sounds/play.ogg',
            shuffle: '/sounds/shuffle.ogg',
            win: '/sounds/win.ogg',
            lose: '/sounds/lose.ogg',
        };

        Object.entries(soundFiles).forEach(([name, path]) => {
            const audio = new Audio(path);
            audio.preload = 'auto';
            audio.volume = this.volume;
            this.sounds.set(name as SoundType, audio);
        });

        this.initialized = true;
        console.log('[SoundService] Initialized with', this.sounds.size, 'sounds');
    }

    /**
     * Play a sound effect
     */
    play(type: SoundType) {
        if (!this.enabled) return;

        const sound = this.sounds.get(type);
        if (sound) {
            // Clone the audio to allow overlapping plays
            const clone = sound.cloneNode() as HTMLAudioElement;
            clone.volume = this.volume;
            clone.play().catch(err => {
                console.warn('[SoundService] Failed to play sound:', type, err);
            });
        }
    }

    /**
     * Toggle sound on/off
     */
    toggle(): boolean {
        this.enabled = !this.enabled;
        console.log('[SoundService] Sound', this.enabled ? 'enabled' : 'disabled');
        return this.enabled;
    }

    /**
     * Set sound enabled state
     */
    setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    /**
     * Check if sound is enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Set volume (0.0 to 1.0)
     */
    setVolume(vol: number) {
        this.volume = Math.max(0, Math.min(1, vol));
        this.sounds.forEach(sound => {
            sound.volume = this.volume;
        });
    }

    /**
     * Get current volume
     */
    getVolume(): number {
        return this.volume;
    }
}

export const SoundService = new SoundServiceClass();
