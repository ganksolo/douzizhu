import type { Card as CardType } from '../../types';

// Issue #36: 统一的 Card 组件，支持两种使用方式
// 方式 1: 使用 CardType 对象 (card prop) - PlayerHand.tsx 使用
// 方式 2: 使用独立 props (suit, rank) - GameBoard 出牌区使用

interface CardProps {
    // 方式 1: 传入 card 对象 (兼容 PlayerHand.tsx)
    card?: CardType;
    // 方式 2: 分散 props (GameBoard 出牌区使用)
    suit?: 'spades' | 'hearts' | 'clubs' | 'diamonds' | 'joker_black' | 'joker_red' | 'joker';
    rank?: string;
    isSelected?: boolean;
    onClick?: ((card: CardType) => void) | (() => void);
    scale?: number;
    hidden?: boolean;
    // 兼容 PlayerHand.tsx 的 props
    isBack?: boolean;
    small?: boolean;
}

export const Card = (props: CardProps) => {
    // 从 card 对象或分散 props 获取值
    const card = props.card;

    // 优先使用 card 对象中的值
    let suit: string = props.suit || (card?.suit as string) || 'spades';
    const rank: string = props.rank || card?.rank || '';
    const isSelected: boolean = props.isSelected ?? card?.isSelected ?? false;

    // 兼容 isBack/hidden 和 small/scale
    const hidden: boolean = props.hidden || props.isBack || false;
    const scale: number = props.scale ?? (props.small ? 0.6 : 1);

    // 处理 Joker suit 映射
    if (card?.rank === 'black_joker' || suit === 'joker') {
        suit = 'joker_black';
    }
    if (card?.rank === 'red_joker') {
        suit = 'joker_red';
    }

    // 处理 onClick
    const handleClick = () => {
        if (props.onClick) {
            if (card) {
                // 如果有 card 对象，传递完整对象
                (props.onClick as (card: CardType) => void)(card);
            } else {
                // 否则直接调用
                (props.onClick as () => void)();
            }
        }
    };

    // Card back with diamond pattern texture (设计稿红色菱形风格)
    if (hidden) {
        return (
            <div
                className="relative select-none overflow-hidden"
                style={{
                    width: `${45 * scale}px`,
                    height: `${68 * scale}px`,
                    borderRadius: `${4 * scale}px`,
                    border: `${1.5 * scale}px solid #d4a574`,
                    background: 'linear-gradient(135deg, #8b1a1a 0%, #5c1010 100%)',
                    boxShadow: `0 ${2 * scale}px ${4 * scale}px rgba(0,0,0,0.3)`,
                }}
            >
                {/* Diamond pattern overlay */}
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `
                            linear-gradient(45deg, transparent 40%, rgba(212, 165, 116, 0.15) 50%, transparent 60%),
                            linear-gradient(-45deg, transparent 40%, rgba(212, 165, 116, 0.15) 50%, transparent 60%)
                        `,
                        backgroundSize: `${8 * scale}px ${8 * scale}px`,
                    }}
                />
                {/* Center diamond decoration */}
                <div
                    className="absolute inset-0 flex items-center justify-center"
                >
                    <div
                        style={{
                            width: `${16 * scale}px`,
                            height: `${16 * scale}px`,
                            transform: 'rotate(45deg)',
                            border: `${1 * scale}px solid rgba(212, 165, 116, 0.5)`,
                            background: 'rgba(212, 165, 116, 0.1)',
                        }}
                    />
                </div>
            </div>
        );
    }

    const isRed = suit === 'hearts' || suit === 'diamonds' || suit === 'joker_red';
    const isJoker = suit === 'joker_black' || suit === 'joker_red' || rank === 'black_joker' || rank === 'red_joker';

    const suitSymbolMap: Record<string, string> = {
        'spades': '♠',
        'hearts': '♥',
        'clubs': '♣',
        'diamonds': '♦',
        'joker': '🤡',
        'joker_black': '🤡',
        'joker_red': '🤡'
    };
    const suitSymbol = suitSymbolMap[suit] || '♠';

    const textColor = isRed ? 'text-red-500' : (suit === 'joker_black' ? 'text-gray-500' : 'text-black');

    // 显示 rank: Joker 显示 J，其他显示 rank
    const displayRank = isJoker ? 'J' : (rank === '10' ? '10' : (rank || '')[0]?.toUpperCase() || '');

    return (
        <div
            onClick={handleClick}
            className={`
                bg-white border border-gray-300 rounded-lg shadow-xl 
                relative cursor-pointer transition-all duration-200 select-none
                ${isSelected ? '-translate-y-4' : 'hover:-translate-y-2'} 
                hover:brightness-105 hover:shadow-2xl
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
                {displayRank}
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
                {displayRank}
            </div>
        </div>
    );
};

export default Card;
