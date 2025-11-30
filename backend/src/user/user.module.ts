import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { MatchModule } from '../game/match/match.module';

import { UserController } from './user.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        MatchModule,
    ],
    controllers: [UserController],
    providers: [UserRepository, UserService],
    exports: [UserService, UserRepository],
})
export class UserModule { }
