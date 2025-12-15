import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { BaseState } from './base-state';
import { RoomData, UserAction } from '../types/game.types';
import { GameRedisService } from '../services/game-redis.service';
import { InitState } from './states/init.state';
import { DealingState } from './states/dealing.state';
import { PlayingState } from './states/playing.state';
import { GameEndState } from './states/game-end.state';
import { BiddingState } from './states/bidding.state';

@Injectable()
export class GameContext {
    public currentState: BaseState | null = null;
    private logger = new Logger(GameContext.name);

    // Temporary in-memory data
    public roomData: RoomData;

    constructor(
        private redisService: GameRedisService,
        @Inject(forwardRef(() => InitState)) private initState: InitState,
        @Inject(forwardRef(() => DealingState)) private dealingState: DealingState,
        @Inject(forwardRef(() => BiddingState)) private biddingState: BiddingState,
        @Inject(forwardRef(() => PlayingState)) private playingState: PlayingState,
        @Inject(forwardRef(() => GameEndState)) private gameEndState: GameEndState,
    ) {
        // Initialize with empty data, will be set up properly in InitState
        this.roomData = {
            roomId: '',
            players: [],
            deck: [],
            bottomCards: [],
            multiplier: 1,
        };
    }

    public initialize() {
        this.setState(this.initState);
    }

    public setState(state: BaseState) {
        this.currentState = state;
        this.logger.log(`State initialized to ${state.constructor.name}`);
        this.currentState.enter(this);
        this.saveSnapshot();

        // Notify listener
        if (this.onStateChange && this.roomData.roomId) {
            this.onStateChange(this.roomData.roomId);
        }
    }

    // Callback for state changes
    public onStateChange: ((roomId: string) => void) | null = null;

    public async transitionTo(newState: BaseState) {
        this.logger.log(`Transitioning from ${this.currentState?.constructor.name} to ${newState.constructor.name}`);

        if (this.currentState) {
            this.currentState.exit(this);
        }

        this.currentState = newState;
        this.currentState.enter(this);

        // Atomic save on transition
        await this.saveSnapshot();

        // Notify listener
        if (this.onStateChange && this.roomData.roomId) {
            this.onStateChange(this.roomData.roomId);
        }
    }

    public async saveSnapshot() {
        if (!this.roomData.roomId || !this.currentState) return;

        try {
            await this.redisService.saveSnapshot(
                this.roomData.roomId,
                this.currentState.constructor.name,
                this.roomData
            );
        } catch (error) {
            this.logger.error(`Failed to save snapshot: ${error.message}`);
        }
    }

    public async loadSnapshot(roomId: string) {
        const snapshot = await this.redisService.loadSnapshot(roomId);
        if (!snapshot) {
            this.logger.warn(`No snapshot found for room ${roomId}`);
            return;
        }

        this.roomData = snapshot.data;

        // Restore state instance based on name
        switch (snapshot.stateName) {
            case 'InitState':
                this.currentState = this.initState;
                break;
            case 'DealingState':
                this.currentState = this.dealingState;
                break;
            case 'BiddingState':
                this.currentState = this.biddingState;
                break;
            case 'PlayingState':
                this.currentState = this.playingState;
                break;
            case 'GameEndState':
                this.currentState = this.gameEndState;
                break;
            default:
                this.logger.error(`Unknown state name: ${snapshot.stateName}`);
                this.currentState = this.initState;
        }

        this.logger.log(`Restored state to ${this.currentState.constructor.name} for room ${roomId}`);
    }

    public async handleInput(action: UserAction) {
        if (this.currentState) {
            this.currentState.handleInput(this, action);

            // Save snapshot and notify listeners after any input handling
            await this.saveSnapshot();
            if (this.onStateChange && this.roomData.roomId) {
                this.onStateChange(this.roomData.roomId);
            }
        }
    }

    public update(deltaTime: number) {
        if (this.currentState) {
            this.currentState.update(this, deltaTime);
        }
    }

    public getCurrentStateName(): string {
        return this.currentState ? this.currentState.constructor.name : 'None';
    }
}
