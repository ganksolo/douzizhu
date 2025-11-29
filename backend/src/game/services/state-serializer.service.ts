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

        // 1. Sanitize Players' Hands
        sanitizedData.players = sanitizedData.players.map((player: Player) => {
            if (player.id === targetPlayerId) {
                // Return full data for the target player
                return player;
            } else {
                // Mask other players' hands
                return {
                    ...player,
                    hand: null, // Hide cards
                    handCount: player.hand ? player.hand.length : 0, // Expose count only
                };
            }
        });

        // 2. Sanitize Deck / Bottom Cards
        // Bottom cards are only visible after LANDLORD is determined (usually in SHOW_BOTTOM or PLAYING state)
        // Assuming 'deck' here holds the bottom cards (3 cards) after dealing is done.
        // In DealingState, deck might be the full deck.

        // Logic: If state is INIT, SHUFFLING, DEALING, CALL_LANDLORD -> Hide Bottom Cards
        // If state is SHOW_BOTTOM, PLAYING, ROUND_END -> Show Bottom Cards (usually stored in deck or separate field)

        // For simplicity, let's assume roomData.deck holds the bottom cards after dealing.
        // And during dealing, it holds remaining cards.

        const visibleStates = ['ShowBottomState', 'PlayingState', 'RoundEndState', 'GameEndState'];
        const isBottomCardsVisible = visibleStates.includes(currentStateName);

        if (!isBottomCardsVisible) {
            // Hide deck/bottom cards
            sanitizedData.deck = [];
            // Or if we want to show count: sanitizedData.deckCount = roomData.deck.length;
        }

        // 3. Add metadata
        return {
            ...sanitizedData,
            currentState: currentStateName,
            timestamp: Date.now(),
        };
    }
}
