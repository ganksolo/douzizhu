export const parseCardString = (cardStr: string): number => {
    if (cardStr === 'BlackJoker') return 52;
    if (cardStr === 'RedJoker') return 53;

    const suitChar = cardStr.charAt(0);
    const rankStr = cardStr.substring(1);

    // Suits: Diamonds(0), Clubs(1), Hearts(2), Spades(3)
    let suitIndex = 0;
    switch (suitChar) {
        case '♦': suitIndex = 0; break;
        case '♣': suitIndex = 1; break;
        case '♥': suitIndex = 2; break;
        case '♠': suitIndex = 3; break;
        default: console.warn('Unknown suit:', suitChar); return -1;
    }

    // Ranks: 3(0) ... 2(12)
    const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
    const rankIndex = ranks.indexOf(rankStr);

    if (rankIndex === -1) {
        console.warn('Unknown rank:', rankStr);
        return -1;
    }

    return suitIndex * 13 + rankIndex;
};

export const parseCardList = (cards: string[]): number[] => {
    if (!cards) return [];
    return cards.map(parseCardString).filter(n => n !== -1);
};
