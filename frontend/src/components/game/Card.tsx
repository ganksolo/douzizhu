
interface CardProps {
    suit: 'spades' | 'hearts' | 'clubs' | 'diamonds' | 'joker_black' | 'joker_red';
    rank: string;
    isSelected?: boolean;
    onClick?: () => void;
    scale?: number;
    hidden?: boolean; // Card back
}

export const Card = ({ suit, rank, isSelected, onClick, scale = 1, hidden = false }: CardProps) => {
    if (hidden) {
        return (
            <div
                className="bg-blue-800 border-2 border-white rounded shadow-md flex items-center justify-center relative select-none"
                style={{ width: `${60 * scale}px`, height: `${90 * scale}px` }}
            >
                <div className="w-full h-full border border-blue-600 rounded opacity-50 m-1"></div>
            </div>
        );
    }

    const isRed = suit === 'hearts' || suit === 'diamonds' || suit === 'joker_red';
    const suitSymbol = {
        'spades': '♠',
        'hearts': '♥',
        'clubs': '♣',
        'diamonds': '♦',
        'joker_black': 'Joker',
        'joker_red': 'Joker'
    }[suit];

    return (
        <div
            onClick={onClick}
            className={`
                bg-white border border-gray-300 rounded-lg shadow-xl flex items-center justify-center 
                relative cursor-pointer transition-transform duration-200 select-none
                ${isSelected ? '-translate-y-4' : ''}
            `}
            style={{ width: `${80 * scale}px`, height: `${120 * scale}px` }}
        >
            {/* Top Left Corner */}
            <div className={`absolute top-1 left-1 flex flex-col items-center leading-none ${isRed ? 'text-red-500' : 'text-black'}`}>
                <span className="text-sm font-bold">{rank}</span>
                <span className="text-xs">{suitSymbol}</span>
            </div>

            {/* Center Symbol */}
            <div className={`text-3xl ${isRed ? 'text-red-500' : 'text-black'}`}>
                {suitSymbol}
            </div>

            {/* Bottom Right Corner (Inverted) */}
            <div className={`absolute bottom-1 right-1 flex flex-col items-center leading-none rotate-180 ${isRed ? 'text-red-500' : 'text-black'}`}>
                <span className="text-sm font-bold">{rank}</span>
                <span className="text-xs">{suitSymbol}</span>
            </div>
        </div>
    );
};
