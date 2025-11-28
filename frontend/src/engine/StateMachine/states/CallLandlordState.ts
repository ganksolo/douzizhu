/**
 * CallLandlordState - Bidding phase to determine landlord
 * Players bid in sequence until landlord is determined
 */

import { BaseState } from '../BaseState';
import { GameStateEnum } from '../../GameStateEnum';
import type { AnyGameAction, BidAction } from '../../GameAction';
import { GameActionType } from '../../GameAction';
import { eventBus, GameEvent } from '../../EventBus';

export class CallLandlordState extends BaseState {
    private currentBidder = 0;
    private passCount = 0;
    private highestBid = 0;
    private highestBidder: number | null = null;

    enter(_data?: any): void {
        this.log('Entering CALL_LANDLORD state');

        // Reset bidding state
        this.currentBidder = 0;
        this.passCount = 0;
        this.highestBid = 0;
        this.highestBidder = null;
        this.context.data.bids = {};

        // Emit turn change
        eventBus.emit(GameEvent.TURN_CHANGE, {
            playerId: this.context.data.players[this.currentBidder].id,
        });
    }

    update(_deltaTime: number): void {
        // Auto-bid for AI players after a short delay
        // This could be enhanced with a timer system
    }

    exit(): void {
        this.log('Exiting CALL_LANDLORD state');
    }

    validate(action: AnyGameAction): boolean {
        // Only accept BID actions from current bidder
        if (action.type !== GameActionType.BID) {
            return false;
        }

        const bidAction = action as BidAction;
        const currentPlayer = this.context.data.players[this.currentBidder];

        if (bidAction.playerId !== currentPlayer.id) {
            this.error('Not current bidder\'s turn', bidAction);
            return false;
        }

        // Validate bid value
        const bidValue = bidAction.payload.bidValue;
        if (bidValue < 0 || bidValue > 3) {
            this.error('Invalid bid value', bidValue);
            return false;
        }

        // Must bid higher than current highest
        if (bidValue > 0 && bidValue <= this.highestBid) {
            this.error('Bid must be higher than current highest', bidValue, this.highestBid);
            return false;
        }

        return true;
    }

    handleAction(action: AnyGameAction): void {
        const bidAction = action as BidAction;
        const bidValue = bidAction.payload.bidValue;

        // Record bid
        this.context.data.bids[bidAction.playerId] = bidValue;

        if (bidValue === 0) {
            // Pass
            this.log(`Player ${bidAction.playerId} passed`);
            this.passCount++;
        } else {
            // Valid bid
            this.log(`Player ${bidAction.playerId} bid ${bidValue}`);
            this.highestBid = bidValue;
            this.highestBidder = this.currentBidder;
            this.passCount = 0;

            // If bid is 3, immediately assign landlord
            if (bidValue === 3) {
                this.assignLandlord();
                return;
            }
        }

        // Check if bidding is complete
        if (this.passCount === 4) {
            // All passed, re-deal
            this.log('All players passed, restarting');
            this.context.changeState(GameStateEnum.INIT);
            return;
        }

        if (this.passCount === 3 && this.highestBidder !== null) {
            // Three passes after a bid, assign landlord
            this.assignLandlord();
            return;
        }

        // Move to next bidder
        this.currentBidder = (this.currentBidder + 1) % 4;
        eventBus.emit(GameEvent.TURN_CHANGE, {
            playerId: this.context.data.players[this.currentBidder].id,
        });
    }

    private assignLandlord(): void {
        if (this.highestBidder === null) {
            this.error('No highest bidder');
            return;
        }

        const landlord = this.context.data.players[this.highestBidder];
        this.context.data.landlordId = landlord.id;

        // Update roles
        this.context.data.players.forEach((player: any, index: number) => {
            player.role = index === this.highestBidder ? 'landlord' : 'peasant';
        });

        this.log(`Landlord assigned: ${landlord.id} with bid ${this.highestBid}`);
        this.context.changeState(GameStateEnum.SHOW_BOTTOM);
    }

    getStateName(): string {
        return 'CallLandlordState';
    }
}
