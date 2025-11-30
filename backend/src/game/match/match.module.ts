import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchRecord } from './match.entity';
import { MatchRepository } from './match.repository';
import { MatchController } from './match.controller';

/**
 * Phase 19.1: Match Module
 * 
 * Provides match persistence functionality.
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([MatchRecord]),
    ],
    controllers: [MatchController],
    providers: [MatchRepository],
    exports: [MatchRepository, TypeOrmModule],
})
export class MatchModule { }
