import { Module, forwardRef } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomGateway } from './room.gateway';
import { RoomController } from './room.controller';
import { CacheModule } from '@nestjs/cache-manager';
import { GameModule } from '../game/game.module';
import { ReconnectService } from './services/reconnect.service';
import { AFKService } from './services/afk.service';
import { RoomCleanerService } from './services/room-cleaner.service';

@Module({
    imports: [
        CacheModule.register(),
        forwardRef(() => GameModule),
    ],
    controllers: [RoomController],
    providers: [
        RoomService,
        RoomGateway,
        ReconnectService,
        AFKService,
        RoomCleanerService,
    ],
    exports: [RoomService, ReconnectService, AFKService],
})
export class RoomModule { }
