import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransferEventEntity } from '../entities/transfer-event.entity';
import {
  IEventStore,
  TransferEventData,
} from '../interfaces/event-store.interface';
import { TransactionService } from '../transaction.service';

@Injectable()
export class PostgresEventStore implements IEventStore {
  constructor(
    @InjectRepository(TransferEventEntity)
    private readonly repo: Repository<TransferEventEntity>,
    private readonly transaction: TransactionService,
  ) {}

  async insertIgnoringConflicts(events: TransferEventData[]): Promise<number> {
    return this.transaction.run(async (manager) => {
      const params: any[] = [];
      const valuePlaceholders = events.map((e, i) => {
        const offset = i * 5;
        params.push(e.event_id, e.station_id, e.amount, e.status, e.created_at);
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
      });

      const rows = await manager.query(
        `INSERT INTO transfer_events (event_id, station_id, amount, status, created_at)
         VALUES ${valuePlaceholders.join(', ')}
         ON CONFLICT (event_id) DO NOTHING
         RETURNING event_id`,
        params,
      );

      return rows.length;
    });
  }

  async countByStationAndStatus(
    stationId: string,
    status: string,
  ): Promise<number> {
    return this.repo.count({
      where: { station_id: stationId, status },
    });
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
