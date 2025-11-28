/**
 * ShowBottomState - Reveal bottom cards to landlord
 * Brief animation state before playing begins
 */

import { BaseState } from '../BaseState';
import { GameStateEnum } from '../../GameStateEnum';
import type { AnyGameAction } from '../../GameAction';

export class ShowBottomState extends BaseState {
    private showDuration = 1500; // Show bottom cards for 1.5 seconds
    private elapsedTime = 0;

    enter(_data?: any): void {
        this.log('Entering SHOW_BOTTOM state');

        // Add bottom cards to landlord's hand
        const landlordIndex = this.context.data.players.findIndex(
            (p: any) => p.id === this.context.data.landlordId
        );

        if (landlordIndex !== -1) {
            const landlord = this.context.data.players[landlordIndex];
            landlord.hand = [...landlord.hand, ...this.context.data.bottomCards];
            this.log(`Added ${this.context.data.bottomCards.length} cards to landlord`);
        }

        this.elapsedTime = 0;
    }

    update(deltaTime: number): void {
        this.elapsedTime += deltaTime;

        // Auto-transition after showing bottom cards
        if (this.elapsedTime >= this.showDuration) {
            this.log('Bottom cards shown, starting game');

            // Set landlord as first player
            const landlordIndex = this.context.data.players.findIndex(
                (p: any) => p.id === this.context.data.landlordId
            );
            this.context.data.currentTurn = landlordIndex;

            this.context.changeState(GameStateEnum.PLAYING);
        }
    }

    exit(): void {
        this.log('Exiting SHOW_BOTTOM state');
    }

    validate(_action: AnyGameAction): boolean {
        // No actions allowed during this brief animation
        return false;
    }

    handleAction(action: AnyGameAction): void {
        this.error('No actions allowed during show bottom', action);
    }

    getStateName(): string {
        return 'ShowBottomState';
    }
}
