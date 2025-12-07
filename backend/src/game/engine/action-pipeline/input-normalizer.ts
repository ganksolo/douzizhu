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

            // Conversion: String[] -> Card[]
            try {
                payload = payload.map((item: any) => {
                    if (typeof item === 'string') {
                        return CardConverter.toCard(item);
                    } else if (typeof item === 'object' && item.suit !== undefined && item.rank !== undefined) {
                        return item; // Already an object (trusted internal or meticulous client)
                    } else {
                        throw new Error('Invalid card format');
                    }
                });
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
