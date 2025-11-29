import { Card, CardRank, CardSuit } from '../rules/types';

export class CardConverter {
    static toCard(cardStr: string): Card {
        if (cardStr === 'BlackJoker') {
            return { rank: CardRank.SMALL_JOKER, suit: CardSuit.NONE, value: CardRank.SMALL_JOKER };
        }
        if (cardStr === 'RedJoker') {
            return { rank: CardRank.BIG_JOKER, suit: CardSuit.NONE, value: CardRank.BIG_JOKER };
        }

        const suitStr = cardStr.charAt(0);
        const rankStr = cardStr.substring(1);

        let suit: CardSuit;
        switch (suitStr) {
            case '♠': suit = CardSuit.SPADE; break;
            case '♥': suit = CardSuit.HEART; break;
            case '♣': suit = CardSuit.CLUB; break;
            case '♦': suit = CardSuit.DIAMOND; break;
            default: suit = CardSuit.NONE;
        }

        let rank: CardRank;
        switch (rankStr) {
            case '3': rank = CardRank.THREE; break;
            case '4': rank = CardRank.FOUR; break;
            case '5': rank = CardRank.FIVE; break;
            case '6': rank = CardRank.SIX; break;
            case '7': rank = CardRank.SEVEN; break;
            case '8': rank = CardRank.EIGHT; break;
            case '9': rank = CardRank.NINE; break;
            case '10': rank = CardRank.TEN; break;
            case 'J': rank = CardRank.JACK; break;
            case 'Q': rank = CardRank.QUEEN; break;
            case 'K': rank = CardRank.KING; break;
            case 'A': rank = CardRank.ACE; break;
            case '2': rank = CardRank.TWO; break;
            default: rank = CardRank.THREE; // Fallback
        }

        return { rank, suit, value: rank };
    }

    static toString(card: Card): string {
        if (card.rank === CardRank.SMALL_JOKER) return 'BlackJoker';
        if (card.rank === CardRank.BIG_JOKER) return 'RedJoker';

        let rankStr: string;
        switch (card.rank) {
            case CardRank.THREE: rankStr = '3'; break;
            case CardRank.FOUR: rankStr = '4'; break;
            case CardRank.FIVE: rankStr = '5'; break;
            case CardRank.SIX: rankStr = '6'; break;
            case CardRank.SEVEN: rankStr = '7'; break;
            case CardRank.EIGHT: rankStr = '8'; break;
            case CardRank.NINE: rankStr = '9'; break;
            case CardRank.TEN: rankStr = '10'; break;
            case CardRank.JACK: rankStr = 'J'; break;
            case CardRank.QUEEN: rankStr = 'Q'; break;
            case CardRank.KING: rankStr = 'K'; break;
            case CardRank.ACE: rankStr = 'A'; break;
            case CardRank.TWO: rankStr = '2'; break;
            default: rankStr = '';
        }

        return `${card.suit}${rankStr}`;
    }
}
