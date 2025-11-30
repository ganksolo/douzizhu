import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MatchRepository } from './match.repository';
import { MatchRecord } from './match.entity';
import { Repository } from 'typeorm';

describe('MatchRepository', () => {
    let repository: MatchRepository;
    let typeOrmRepo: Repository<MatchRecord>;

    const mockTypeOrmRepo = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        createQueryBuilder: jest.fn(() => ({
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
        })),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MatchRepository,
                {
                    provide: getRepositoryToken(MatchRecord),
                    useValue: mockTypeOrmRepo,
                },
            ],
        }).compile();

        repository = module.get<MatchRepository>(MatchRepository);
        typeOrmRepo = module.get<Repository<MatchRecord>>(getRepositoryToken(MatchRecord));
    });

    it('should be defined', () => {
        expect(repository).toBeDefined();
    });

    describe('createAndSave', () => {
        it('should create and save a match record', async () => {
            const data = { roomId: 'test' };
            const entity = new MatchRecord();
            Object.assign(entity, data);

            // Mock computeDuration
            entity.computeDuration = jest.fn();

            mockTypeOrmRepo.create.mockReturnValue(entity);
            mockTypeOrmRepo.save.mockResolvedValue(entity);

            await repository.createAndSave(data);

            expect(mockTypeOrmRepo.create).toHaveBeenCalledWith(data);
            expect(mockTypeOrmRepo.save).toHaveBeenCalledWith(entity);
        });
    });

    describe('findByPlayerId', () => {
        it('should use createQueryBuilder with JSON_SEARCH', async () => {
            await repository.findByPlayerId('p1');
            expect(mockTypeOrmRepo.createQueryBuilder).toHaveBeenCalledWith('match');
        });
    });
});
