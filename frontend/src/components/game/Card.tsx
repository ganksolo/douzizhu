
interface CardProps {
    suit: 'spades' | 'hearts' | 'clubs' | 'diamonds' | 'joker_black' | 'joker_red';
    rank: string;
    isSelected?: boolean;
    onClick?: () => void;
    scale?: number;
    hidden?: boolean; // Card back
}

export const Card = ({ suit, rank, isSelected, onClick, scale = 1, hidden = false }: CardProps) => {
    // Card back with dot pattern texture (matching PlayerAvatar hand count style)
    if (hidden) {
        return (
            <div
                className="relative select-none overflow-hidden"
                style={{
                    width: `${45 * scale}px`,
                    height: `${68 * scale}px`,
                    borderRadius: `${6 * scale}px`,
                    border: `${2 * scale}px solid #1e3a5f`,
                    background: '#1e3a8a', // Dark blue (blue-900)
                }}
            >
                {/* Dot pattern overlay */}
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `radial-gradient(circle, #3b82f6 ${1.5 * scale}px, transparent ${1.5 * scale}px)`,
                        backgroundSize: `${10 * scale}px ${10 * scale}px`,
                        backgroundPosition: `${3 * scale}px ${3 * scale}px`,
                    }}
                />
            </div>
        );
    }

    const isRed = suit === 'hearts' || suit === 'diamonds' || suit === 'joker_red';
    const isJoker = suit === 'joker_black' || suit === 'joker_red';
    const suitSymbol = {
        'spades': '♠',
        'hearts': '♥',
        'clubs': '♣',
        'diamonds': '♦',
        'joker_black': '🤡',
        'joker_red': '🤡'
    }[suit];

    const textColor = isRed ? 'text-red-500' : (suit === 'joker_black' ? 'text-gray-500' : 'text-black');

    return (
        <div
            onClick={onClick}
            className={`
                bg-white border border-gray-300 rounded-lg shadow-xl 
                relative cursor-pointer transition-transform duration-200 select-none
                ${isSelected ? '-translate-y-4' : ''}
            `}
            style={{ width: `${56 * scale}px`, height: `${80 * scale}px` }}
        >
            {/* Top-left corner: Rank */}
            <div
                className={`absolute font-bold ${textColor}`}
                style={{
                    top: `${4 * scale}px`,
                    left: `${4 * scale}px`,
                    fontSize: `${(isJoker ? 10 : 14) * scale}px`,
                    lineHeight: 1,
                }}
            >
                {isJoker ? 'J' : rank}
            </div>

            {/* Center: Suit Symbol */}
            <div
                className={`absolute ${textColor}`}
                style={{
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: `${(isJoker ? 28 : 32) * scale}px`,
                    lineHeight: 1,
                }}
            >
                {suitSymbol}
            </div>

            {/* Bottom-right corner: Rank (rotated 180°) */}
            <div
                className={`absolute font-bold ${textColor}`}
                style={{
                    bottom: `${4 * scale}px`,
                    right: `${4 * scale}px`,
                    fontSize: `${(isJoker ? 10 : 14) * scale}px`,
                    lineHeight: 1,
                    transform: 'rotate(180deg)',
                }}
            >
                {isJoker ? 'J' : rank}
            </div>
        </div>
    );
};
