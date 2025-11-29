import { Test, TestingModule } from '@nestjs/testing';
import { InputNormalizer } from './input-normalizer';
import { ActionType } from '../../types/game.types';

describe('InputNormalizer (Phase 18.1 Security)', () => {
    let normalizer: InputNormalizer;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [InputNormalizer],
        }).compile();

        normalizer = module.get<InputNormalizer>(InputNormalizer);
    });

    it('SEC-IN-001: Should override spoofed playerId with trusted ID', () => {
        const raw = { type: ActionType.PLAY, playerId: 'admin', payload: ['♠3'] };
        const result = normalizer.normalize(raw, 'user-123');
        expect(result.playerId).toBe('user-123');
    });

    it('SEC-IN-002: Should reject huge payload', () => {
        const hugePayload = new Array(100).fill('♠3');
        const raw = { type: ActionType.PLAY, payload: hugePayload };
        expect(() => normalizer.normalize(raw, 'user-123')).toThrow('Payload too large');
    });

    it('SEC-IN-003: Should reject invalid action type', () => {
        const raw = { type: 'HACK_SERVER', payload: [] };
        expect(() => normalizer.normalize(raw, 'user-123')).toThrow('Invalid action type');
    });

    it('SEC-IN-004: Should reject null payload for PLAY', () => {
        const raw = { type: ActionType.PLAY, payload: null };
        expect(() => normalizer.normalize(raw, 'user-123')).toThrow('Invalid payload');
    });

    it('SEC-IN-005: Should reject bad card format', () => {
        const raw = { type: ActionType.PLAY, payload: ['INVALID_CARD'] };
        expect(() => normalizer.normalize(raw, 'user-123')).toThrow('Invalid card format');
    });

    it('Should normalize valid input correctly', () => {
        const raw = { type: ActionType.PLAY, payload: ['♠3', '♠4'] };
        const result = normalizer.normalize(raw, 'user-123');
        expect(result.type).toBe(ActionType.PLAY);
        expect(result.playerId).toBe('user-123');
        expect(result.payload).toHaveLength(2);
        // Expect payload to be converted to Card objects
        expect(result.payload[0]).toHaveProperty('rank');
        expect(result.payload[0]).toHaveProperty('suit');
    });
});
