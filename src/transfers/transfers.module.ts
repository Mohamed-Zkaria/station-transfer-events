import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';

@Module({
  imports: [StorageModule],
  controllers: [TransfersController],
  providers: [TransfersService],
})
export class TransfersModule {}
