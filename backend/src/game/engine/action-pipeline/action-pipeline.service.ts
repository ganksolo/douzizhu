import { Injectable, Logger } from '@nestjs/common';
import { InputNormalizer } from './input-normalizer';
import { GameAction } from '../../types/game.types';

@Injectable()
export class ActionPipelineService {
    private logger = new Logger(ActionPipelineService.name);

    constructor(
        private inputNormalizer: InputNormalizer
    ) { }

    /**
     * Entry point for all external actions.
     * @param rawInput Raw data from socket
     * @param playerId Trusted player ID
     */
    public handleInput(rawInput: any, playerId: string): GameAction {
        try {
            // 1. Normalize & Sanitize
            const action = this.inputNormalizer.normalize(rawInput, playerId);

            this.logger.log(`Action Pipeline: Processed ${action.type} from ${action.playerId}`);

            // TODO: Forward to State Machine or Event Bus
            // For now, we just return it, but in integration we will call gameService.handleAction

            return action;
        } catch (error) {
            this.logger.error(`Action Pipeline Error: ${error.message}`);
            throw error; // Re-throw to let caller handle (e.g. send error to client)
        }
    }
}
