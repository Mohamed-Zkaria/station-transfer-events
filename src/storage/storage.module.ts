import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransferEventEntity } from './entities/transfer-event.entity';
import { EVENT_STORE } from './interfaces/event-store.interface';
import { PostgresEventStore } from './postgres/postgres-event-store';

@Module({
  imports: [TypeOrmModule.forFeature([TransferEventEntity])],
  providers: [
    {
      provide: EVENT_STORE,
      useClass: PostgresEventStore,
    },
  ],
  exports: [EVENT_STORE],
})
export class StorageModule {}
