import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Card as CardType } from '../types';

interface CardProps {
    card: CardType;
    onClick?: (card: CardType) => void;
    isBack?: boolean;
    small?: boolean;
}

const suitColors: Record<string, string> = {
    spades: 'text-black',
    hearts: 'text-red-600',
    clubs: 'text-black',
    diamonds: 'text-red-600',
    joker: 'text-purple-600',
};

const suitSymbols: Record<string, string> = {
    spades: '♠',
    hearts: '♥',
    clubs: '♣',
    diamonds: '♦',
    joker: '🤡',
};

export function Card({ card, onClick, isBack, small }: CardProps) {
    const colorClass = suitColors[card.suit] || 'text-black';
    const symbol = suitSymbols[card.suit];

    return (
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
                scale: 1,
                opacity: 1,
                y: card.isSelected ? -24 : 0
            }}
            whileHover={{ y: card.isSelected ? -34 : -10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={() => onClick?.(card)}
            className={twMerge(
                clsx(
                    'relative bg-white rounded-lg shadow-md border border-gray-300 select-none flex flex-col items-center justify-between overflow-hidden transition-transform duration-200 ease-out',
                    small ? 'w-10 h-14 text-xs' : 'w-24 h-36 text-xl',
                    onClick ? 'cursor-pointer hover:shadow-lg' : '',
                    isBack ? 'bg-blue-800 border-blue-900' : ''
                )
            )}
        >
            {isBack ? (
                <div className="w-full h-full flex items-center justify-center bg-blue-600">
                    <div className="w-full h-full opacity-20 bg-[radial-gradient(circle,_#ffffff_1px,_transparent_1px)] bg-[length:8px_8px]"></div>
                </div>
            ) : (
                <>
                    {/* Top Left */}
                    <div className={clsx('absolute top-1 left-1 flex flex-col items-center leading-none', colorClass)}>
                        <span className="font-bold">{card.rank === 'black_joker' ? 'J' : card.rank === 'red_joker' ? 'J' : card.rank === '10' ? '10' : card.rank[0].toUpperCase()}</span>
                        <span className="text-sm">{symbol}</span>
                    </div>

                    {/* Center Big Symbol */}
                    <div className={clsx('text-4xl', colorClass)}>
                        {symbol}
                    </div>

                    {/* Bottom Right (Rotated) */}
                    <div className={clsx('absolute bottom-1 right-1 flex flex-col items-center leading-none rotate-180', colorClass)}>
                        <span className="font-bold">{card.rank === 'black_joker' ? 'J' : card.rank === 'red_joker' ? 'J' : card.rank === '10' ? '10' : card.rank[0].toUpperCase()}</span>
                        <span className="text-sm">{symbol}</span>
                    </div>
                </>
            )}
        </motion.div>
    );
}
