export type Theme = 'classic' | 'tech' | 'wood';

export const themes: Record<Theme, { bg: string; accent: string; text: string }> = {
    classic: {
        // Texas Hold'em dual-tone felt (green with subtle pattern)
        bg: 'linear-gradient(135deg, #0d5223 0%, #1a7433 50%, #0d5223 100%)',
        accent: 'bg-yellow-500',
        text: 'text-yellow-100',
    },
    wood: {
        // Rich wood texture with warm tones
        bg: 'linear-gradient(135deg, #5a3e2b 0%, #7d5a3f 20%, #6b4830 40%, #8b6647 60%, #5a3e2b 100%)',
        accent: 'bg-amber-600',
        text: 'text-amber-100',
    },
    tech: {
        // Deep blue gradient with heavy, rich tones
        bg: 'linear-gradient(135deg, #001529 0%, #002847 25%, #003d66 50%, #002847 75%, #001529 100%)',
        accent: 'bg-cyan-500',
        text: 'text-cyan-100',
    },
};
