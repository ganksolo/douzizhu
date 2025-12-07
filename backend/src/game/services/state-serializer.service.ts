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

        // 2. Inject seatIndex into lastPlayedCards
        if (sanitizedData.lastPlayedCards) {
            const lpPlayer = sanitizedData.players.find((p: Player) => p.id === sanitizedData.lastPlayedCards.playerId);
            if (lpPlayer) {
                sanitizedData.lastPlayedCards.seatIndex = lpPlayer.seatIndex;
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

        // 5. Add metadata with currentTurn and phase
        return {
            ...sanitizedData,
            currentState: currentStateName,
            currentTurn: sanitizedData.currentTurn || null,  // Expose currentTurn from roomData
            phase: phase,  // Derived phase name
            timestamp: Date.now(),
        };
    }
}
