import { Injectable, Logger } from '@nestjs/common';
import { ActionType, GameAction } from '../../types/game.types';
import { CardConverter } from '../../utils/card-converter';

@Injectable()
export class InputNormalizer {
    private logger = new Logger(InputNormalizer.name);

    /**
     * Normalizes raw input into a trusted GameAction.
     * @param rawInput The raw data from the socket
     * @param socketId The socket ID of the sender (used to resolve playerId)
     * @param playerId The resolved player ID (trusted)
     * @returns A sanitized GameAction
     * @throws Error if input is invalid
     */
    public normalize(rawInput: any, playerId: string): GameAction {
        if (!rawInput || typeof rawInput !== 'object') {
            throw new Error('Invalid input format: Payload must be an object');
        }

        const type = rawInput.type;
        if (!Object.values(ActionType).includes(type)) {
            throw new Error(`Invalid action type: ${type}`);
        }

        // 1. Identity Binding: Force playerId from trusted source
        // We ignore rawInput.playerId if it exists to prevent spoofing

        // 2. Payload Sanitization
        let payload = rawInput.payload;

        // Specific handling based on ActionType
        if (type === ActionType.PLAY) {
            // Expecting cards array
            if (!Array.isArray(payload)) {
                throw new Error('Invalid payload: PLAY action requires an array of cards');
            }
            // Limit payload size to prevent DoS
            if (payload.length > 20) {
                throw new Error('Payload too large: Max 20 cards allowed');
            }
            // Validate card strings? Or just pass them through?
            // The user requirement says: "前端传 cards: ["♠3", "♠3"]，需转换为内部对象 [{suit:0, rank:3}, ...]"
            // But wait, our system currently uses string[] for UserAction payload in PlayingState.
            // However, the prompt says "需转换为内部对象".
            // If I convert them here, I need to make sure the rest of the system (PlayingState) handles Card[] in payload.
            // Currently PlayingState.handleInput expects string[] in payload and converts them using CardConverter.
            // If I change it here, I must update PlayingState.

            // Let's look at the prompt again: "例如前端传 cards: ["♠3", "♠3"]，需转换为内部对象 [{suit:0, rank:3}, ...]."
            // This implies the GameAction.payload should contain Card objects.
            // But UserAction (legacy) used string[].
            // GameAction is the new standard.

            // I will convert them to Card objects here.
            // But I need to be careful about PlayingState.
            // PlayingState.handleInput takes UserAction.
            // If I change the pipeline to produce GameAction with Card[], I need to update PlayingState to accept GameAction or mapped UserAction.

            // For now, let's stick to the prompt's requirement of normalization.
            // I will convert to Card objects.
            try {
                payload = payload.map((cardStr: string) => CardConverter.toCard(cardStr));
            } catch (e) {
                throw new Error(`Invalid card format: ${e.message}`);
            }
        }

        return {
            type: type as ActionType,
            playerId: playerId,
            payload: payload,
            timestamp: Date.now(),
        };
    }
}
