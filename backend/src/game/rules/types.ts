export enum CardRank {
    THREE = 3,
    FOUR = 4,
    FIVE = 5,
    SIX = 6,
    SEVEN = 7,
    EIGHT = 8,
    NINE = 9,
    TEN = 10,
    JACK = 11,
    QUEEN = 12,
    KING = 13,
    ACE = 14,
    TWO = 15,
    SMALL_JOKER = 16,
    BIG_JOKER = 17,
}

export enum CardSuit {
    SPADE = '♠',
    HEART = '♥',
    CLUB = '♣',
    DIAMOND = '♦',
    NONE = '', // For Jokers
}

export interface Card {
    rank: CardRank;
    suit: CardSuit;
    value: number; // For sorting/comparison
}

export enum PatternType {
    SINGLE = 'SINGLE',
    PAIR = 'PAIR',
    TRIO = 'TRIO',
    TRIO_WITH_ONE = 'TRIO_WITH_ONE',
    TRIO_WITH_PAIR = 'TRIO_WITH_PAIR',
    SEQUENCE = 'SEQUENCE', // 顺子 (e.g., 34567)
    SEQUENCE_PAIR = 'SEQUENCE_PAIR', // 连对 (e.g., 334455)
    AIRPLANE = 'AIRPLANE', // 飞机 (e.g., 333444)
    AIRPLANE_WITH_WING = 'AIRPLANE_WITH_WING', // 飞机带翅膀

    // Bombs (Graded)
    BOMB_4 = 'BOMB_4',
    BOMB_5 = 'BOMB_5',
    BOMB_6 = 'BOMB_6',
    BOMB_7 = 'BOMB_7',
    BOMB_8 = 'BOMB_8',

    ROCKET = 'ROCKET', // 天王炸 (4 Jokers)
    INVALID = 'INVALID',
}

export interface AnalysisResult {
    type: PatternType;
    rank: number; // Primary rank for comparison (e.g., rank of the Trio in Trio+1)
    length: number; // Number of cards
    bombCount?: number; // For bombs: 4-8. For Rocket: 4.
    subRank?: number; // Secondary rank (optional)
}
