import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchRecord } from './match.entity';
import { MatchRepository } from './match.repository';

/**
 * Phase 19.1: Match Module
 * 
 * Provides match persistence functionality.
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([MatchRecord]),
    ],
    providers: [MatchRepository],
    exports: [MatchRepository, TypeOrmModule],
})
export class MatchModule { }
