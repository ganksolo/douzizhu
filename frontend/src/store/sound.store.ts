import { create } from 'zustand';
import { SoundService } from '../services/sound.service';

interface SoundState {
    enabled: boolean;
    volume: number;
    toggle: () => void;
    setVolume: (volume: number) => void;
    init: () => void;
}

export const useSoundStore = create<SoundState>((set) => ({
    enabled: true,
    volume: 0.5,

    toggle: () => {
        const newEnabled = SoundService.toggle();
        set({ enabled: newEnabled });
    },

    setVolume: (volume: number) => {
        SoundService.setVolume(volume);
        set({ volume });
    },

    init: () => {
        SoundService.init();
    },
}));
