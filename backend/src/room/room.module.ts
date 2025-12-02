import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomGateway } from './room.gateway';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
    imports: [CacheModule.register()],
    providers: [RoomService, RoomGateway],
    exports: [RoomService],
})
export class RoomModule { }
