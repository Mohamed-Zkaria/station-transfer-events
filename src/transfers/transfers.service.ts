import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  EVENT_STORE,
  IEventStore,
} from '../storage/interfaces/event-store.interface';
import { TransferEventDto } from './dto/ingest-events.dto';
import { IngestEventsResponseDto } from './dto/ingest-events-response.dto';
import { StationSummaryResponseDto } from './dto/station-summary-response.dto';

@Injectable()
export class TransfersService {
  private readonly logger = new Logger(TransfersService.name);

  constructor(
    @Inject(EVENT_STORE)
    private readonly store: IEventStore,
  ) {}

  async ingestEvents(
    events: TransferEventDto[],
  ): Promise<IngestEventsResponseDto> {
    const data = events.map((e) => ({
      event_id: e.event_id,
      station_id: e.station_id,
      amount: e.amount,
      status: e.status,
      created_at: new Date(e.created_at),
    }));

    const inserted = await this.store.insertIgnoringConflicts(data);
    const duplicates = events.length - inserted;

    this.logger.log(
      `Ingested ${inserted} events, ${duplicates} duplicates skipped`,
    );

    return { inserted, duplicates };
  }

  async getStationSummary(
    stationId: string,
  ): Promise<StationSummaryResponseDto> {
    const [eventsCount, totalApprovedAmount] = await Promise.all([
      this.store.countByStationAndStatus(stationId, 'approved'),
      this.store.sumAmountByStationAndStatus(stationId, 'approved'),
    ]);

    return {
      station_id: stationId,
      total_approved_amount: totalApprovedAmount,
      events_count: eventsCount,
    };
  }
}
