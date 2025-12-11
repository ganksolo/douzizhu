import { Injectable } from '@nestjs/common';
import { RoomData, Player, GameStateEnum } from '../types/game.types';

@Injectable()
export class StateSerializer {
    /**
     * Serialize and sanitize game state for a specific player (Fog of War)
     */
    serializeForPlayer(roomData: RoomData, currentStateName: string, targetPlayerId: string): any {
        // Deep copy to avoid mutating original data
        const sanitizedData = JSON.parse(JSON.stringify(roomData));

        // 1. Sanitize Players' Hands & Ensure handCount
        sanitizedData.players = sanitizedData.players.map((player: Player) => {
            const handCount = player.hand ? player.hand.length : (player.handCount || 0);

            if (player.id === targetPlayerId) {
                // Return full data but ensure handCount is present
                return {
                    ...player,
                    handCount,
                };
            } else {
                // Mask other players' hands
                return {
                    ...player,
                    hand: null, // Hide cards
                    handCount,  // Expose count
                };
            }
        });

        // 2. Inject seatIndex into lastPlayedCards and ensure cards are strings
        if (sanitizedData.lastPlayedCards) {
            const lpPlayer = sanitizedData.players.find((p: Player) => p.id === sanitizedData.lastPlayedCards.playerId);
            if (lpPlayer) {
                sanitizedData.lastPlayedCards.seatIndex = lpPlayer.seatIndex;
            }

            // Issue #33 Fix: cards 可能是 Card 对象数组，需要转回字符串
            // FE parseCardList 期望字符串格式如 "♦3", "♠A", "BlackJoker"
            if (sanitizedData.lastPlayedCards.cards && sanitizedData.lastPlayedCards.cards.length > 0) {
                const originalCards = sanitizedData.lastPlayedCards.cards;
                sanitizedData.lastPlayedCards.cards = sanitizedData.lastPlayedCards.cards.map((card: any) => {
                    if (typeof card === 'string') {
                        return card; // 已经是字符串
                    }
                    // Card 对象: { rank, suit, value }
                    // 转换为字符串格式: "♦3", "♠A", "BlackJoker", "RedJoker"
                    if (card.rank === 16) return 'BlackJoker'; // SMALL_JOKER
                    if (card.rank === 17) return 'RedJoker';   // BIG_JOKER

                    const suitSymbol = card.suit || '♠';
                    const rankStr = this.rankToString(card.rank);
                    return `${suitSymbol}${rankStr}`;
                });
                console.log('[StateSerializer] lastPlayedCards converted:',
                    'original:', JSON.stringify(originalCards[0]),
                    'converted:', sanitizedData.lastPlayedCards.cards,
                    'seatIndex:', sanitizedData.lastPlayedCards.seatIndex);
            }
        }

        // 3. Sanitize Bottom Cards
        // Visible only in PlayingState or GameEndState (or similar post-bidding states)
        const visibleStates = ['PlayingState', 'GameEndState'];
        // Note: In 4-player PvE, we might show bottom cards earlier if specified, but usually strictly after landlord is decided.
        // Assuming 'PlayingState' implies landlord is chosen.
        const isBottomCardsVisible = visibleStates.includes(currentStateName);

        if (!isBottomCardsVisible) {
            sanitizedData.bottomCards = []; // Hide bottom cards
        }

        // Clear archaic 'deck' field if still present to avoid confusion
        sanitizedData.deck = [];

        // 4. Derive phase from currentStateName
        const phaseMap: { [key: string]: string } = {
            'InitState': 'INIT',
            'DealingState': 'DEALING',
            'BiddingState': 'BIDDING',
            'PlayingState': 'PLAYING',
            'GameEndState': 'GAME_END'
        };
        const phase = phaseMap[currentStateName] || 'UNKNOWN';

        // 5. Convert currentTurn from playerId to seatIndex
        let currentTurnSeatIndex: number | null = null;
        if (sanitizedData.currentTurn != null) {
            // Use String() to handle type mismatch (currentTurn may be number or string)
            const currentPlayer = sanitizedData.players.find(
                (p: Player) => String(p.id) === String(sanitizedData.currentTurn)
            );
            if (currentPlayer) {
                currentTurnSeatIndex = currentPlayer.seatIndex;
            }
        }

        // 6. Add metadata with currentTurn (as seatIndex) and phase
        // Phase 35: Include bidding-related fields
        // Issue #34: Include game end fields as gameEnd object

        // Issue #34 Fix: Construct gameEnd object to match FE expectations
        const gameEnd = sanitizedData.winnerId ? {
            winnerId: sanitizedData.winnerId,
            winnerSeatIndex: sanitizedData.winnerSeatIndex ?? null,
            isLandlordWin: sanitizedData.isLandlordWin ?? false,
            multiplier: sanitizedData.multiplier ?? 1,
        } : null;

        return {
            ...sanitizedData,
            currentState: currentStateName,
            currentTurn: currentTurnSeatIndex,  // Now seatIndex (0-3) instead of playerId
            phase: phase,  // Derived phase name
            highestBid: sanitizedData.highestBid ?? 0,
            landlordSeatIndex: sanitizedData.landlordSeatIndex ?? null,
            bidHistory: sanitizedData.bidHistory ?? [],
            // Issue #34: Game end data as object (FE expects data.gameEnd)
            gameEnd: gameEnd,
            multiplier: sanitizedData.multiplier ?? 1,
            timestamp: Date.now(),
        };
    }

    /**
     * Issue #33: Convert CardRank enum to string representation
     */
    private rankToString(rank: number): string {
        const rankMap: Record<number, string> = {
            3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
            11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2',
            16: 'BlackJoker', 17: 'RedJoker'
        };
        return rankMap[rank] || String(rank);
    }
}
