export type Theme = 'classic' | 'tech' | 'wood';

export const themes: Record<Theme, { bg: string; accent: string; text: string }> = {
    classic: {
        bg: '#1a472a',
        accent: '#facc15', // yellow-400
        text: '#ffffff',
    },
    tech: {
        bg: '#0f172a', // slate-900
        accent: '#38bdf8', // sky-400
        text: '#e2e8f0', // slate-200
    },
    wood: {
        bg: '#78350f', // amber-900
        accent: '#fbbf24', // amber-400
        text: '#fef3c7', // amber-100
    },
};
