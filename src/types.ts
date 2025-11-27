export type Suit = 'spades' | 'hearts' | 'clubs' | 'diamonds' | 'joker';

export type Rank =
    | '3'
    | '4'
    | '5'
    | '6'
    | '7'
    | '8'
    | '9'
    | '10'
    | 'J'
    | 'Q'
    | 'K'
    | 'A'
    | '2'
    | 'black_joker'
    | 'red_joker';

export interface Card {
    id: string;
    suit: Suit;
    rank: Rank;
    value: number; // For comparing card strength
    isSelected: boolean;
}

export interface Player {
    id: string;
    name: string;
    hand: Card[];
    role: 'landlord' | 'peasant';
    isAI: boolean;
}

export type GamePhase = 'DEALING' | 'BIDDING' | 'PLAYING' | 'GAME_OVER';
