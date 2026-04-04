import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransferEventEntity } from '../entities/transfer-event.entity';
import {
  IEventStore,
  TransferEventData,
} from '../interfaces/event-store.interface';

@Injectable()
export class PostgresEventStore implements IEventStore {
  constructor(
    @InjectRepository(TransferEventEntity)
    private readonly repo: Repository<TransferEventEntity>,
  ) {}

  async insertIgnoringConflicts(events: TransferEventData[]): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .insert()
      .into(TransferEventEntity)
      .values(events)
      .orIgnore()
      .execute();

    return result.identifiers.filter((id) => id.event_id !== undefined).length;
  }

  async countByStation(stationId: string): Promise<number> {
    return this.repo.count({ where: { station_id: stationId } });
  }

  async sumAmountByStationAndStatus(
    stationId: string,
    status: string,
  ): Promise<number> {
    const result = await this.repo
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.amount), 0)', 'total')
      .where('e.station_id = :stationId', { stationId })
      .andWhere('e.status = :status', { status })
      .getRawOne();

    return parseFloat(result.total);
  }

  async clear(): Promise<void> {
    await this.repo.query('TRUNCATE TABLE transfer_events');
  }
}
