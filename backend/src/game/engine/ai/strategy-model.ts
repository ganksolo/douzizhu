import { Card } from '../../rules/types';
import { GameContext } from '../../engine/game-context';
import { StrategyProfile } from './types';

export class StrategyModel {
    /**
     * Determines the current strategy profile based on hand and game state.
     */
    static determineStrategy(hand: Card[], context: GameContext): StrategyProfile {
        const handCount = hand.length;

        // Determine Game Phase
        let mode: "early" | "mid" | "late";
        if (handCount > 15) {
            mode = "early";
        } else if (handCount >= 8) {
            mode = "mid";
        } else {
            mode = "late";
        }

        // Check opponent status for emergency override
        const opponents = context.roomData.players.filter(p => p.id !== context.roomData.currentTurn);
        const minOpponentHand = Math.min(...opponents.map(p => p.hand.length));

        if (minOpponentHand <= 5) {
            mode = "late"; // Force late game mentality if opponent is close to winning
        }

        // Define Profile based on Mode
        switch (mode) {
            case "early":
                return {
                    mode,
                    shouldHoardBombs: true,
                    aggressiveLevel: 0.2 // Conservative, build structure
                };
            case "mid":
                return {
                    mode,
                    shouldHoardBombs: false, // Start using bombs if necessary
                    aggressiveLevel: 0.5 // Balanced
                };
            case "late":
                return {
                    mode,
                    shouldHoardBombs: false,
                    aggressiveLevel: 1.0 // All out attack
                };
        }
    }
}
