import type { Card, Rank, Suit } from '../types';

const SUITS: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds'];
const RANKS: Rank[] = [
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
    'J',
    'Q',
    'K',
    'A',
    '2',
];

const RANK_VALUES: Record<Rank, number> = {
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14,
    '2': 15,
    black_joker: 16,
    red_joker: 17,
};

export const createDeck = (): Card[] => {
    const deck: Card[] = [];
    let idCounter = 0;

    // Create 2 decks
    for (let i = 0; i < 2; i++) {
        // Standard cards
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                deck.push({
                    id: `card-${idCounter++}`,
                    suit,
                    rank,
                    value: RANK_VALUES[rank],
                    isSelected: false,
                });
            }
        }

        // Jokers
        deck.push({
            id: `card-${idCounter++}`,
            suit: 'joker',
            rank: 'black_joker',
            value: RANK_VALUES['black_joker'],
            isSelected: false,
        });
        deck.push({
            id: `card-${idCounter++}`,
            suit: 'joker',
            rank: 'red_joker',
            value: RANK_VALUES['red_joker'],
            isSelected: false,
        });
    }

    return deck;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
    const newDeck = [...deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
};

export const dealCards = (
    deck: Card[]
): {
    hands: Card[][];
    bottomCards: Card[];
} => {
    const bottomCardsCount = 8;
    const totalCards = deck.length;
    const playerCardsCount = (totalCards - bottomCardsCount) / 4; // Should be 25

    const hands: Card[][] = [[], [], [], []];
    let currentCardIndex = 0;

    // Deal cards to 4 players
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < playerCardsCount; j++) {
            hands[i].push(deck[currentCardIndex++]);
        }
        // Sort hand by value (descending)
        hands[i].sort((a, b) => b.value - a.value);
    }

    const bottomCards = deck.slice(currentCardIndex, currentCardIndex + bottomCardsCount);

    return { hands, bottomCards };
};
