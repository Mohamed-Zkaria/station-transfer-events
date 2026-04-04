import { Test, TestingModule } from '@nestjs/testing';
import {
  EVENT_STORE,
  IEventStore,
} from '../storage/interfaces/event-store.interface';
import { TransfersService } from './transfers.service';

describe('TransfersService', () => {
  let service: TransfersService;
  let store: jest.Mocked<IEventStore>;

  beforeEach(async () => {
    store = {
      insertIgnoringConflicts: jest.fn(),
      countByStationAndStatus: jest.fn(),
      sumAmountByStationAndStatus: jest.fn(),
      clear: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TransfersService, { provide: EVENT_STORE, useValue: store }],
    }).compile();

    service = module.get<TransfersService>(TransfersService);
  });

  describe('ingestEvents', () => {
    it('should return correct inserted and duplicates counts', async () => {
      store.insertIgnoringConflicts.mockResolvedValue(2);

      const events = [
        {
          event_id: 'e1',
          station_id: 's1',
          amount: 100,
          status: 'approved',
          created_at: '2024-01-15T10:00:00Z',
        },
        {
          event_id: 'e2',
          station_id: 's1',
          amount: 200,
          status: 'approved',
          created_at: '2024-01-15T11:00:00Z',
        },
        {
          event_id: 'e3',
          station_id: 's1',
          amount: 300,
          status: 'approved',
          created_at: '2024-01-15T12:00:00Z',
        },
      ];

      const result = await service.ingestEvents(events);

      expect(result).toEqual({ inserted: 2, duplicates: 1 });
      expect(store.insertIgnoringConflicts).toHaveBeenCalledTimes(1);
    });

    it('should map DTOs to TransferEventData with Date conversion', async () => {
      store.insertIgnoringConflicts.mockResolvedValue(1);

      const events = [
        {
          event_id: 'e1',
          station_id: 's1',
          amount: 50,
          status: 'pending',
          created_at: '2024-06-01T08:00:00Z',
        },
      ];

      await service.ingestEvents(events);

      const passedData = store.insertIgnoringConflicts.mock.calls[0][0];
      expect(passedData[0].created_at).toBeInstanceOf(Date);
      expect(passedData[0].event_id).toBe('e1');
    });
  });

  describe('getStationSummary', () => {
    it('should return correct summary with approved count and amount', async () => {
      store.countByStationAndStatus.mockResolvedValue(5);
      store.sumAmountByStationAndStatus.mockResolvedValue(1500.5);

      const result = await service.getStationSummary('station-A');

      expect(result).toEqual({
        station_id: 'station-A',
        total_approved_amount: 1500.5,
        events_count: 5,
      });
      expect(store.countByStationAndStatus).toHaveBeenCalledWith(
        'station-A',
        'approved',
      );
      expect(store.sumAmountByStationAndStatus).toHaveBeenCalledWith(
        'station-A',
        'approved',
      );
    });

    it('should return zeros for unknown station', async () => {
      store.countByStationAndStatus.mockResolvedValue(0);
      store.sumAmountByStationAndStatus.mockResolvedValue(0);

      const result = await service.getStationSummary('unknown');

      expect(result).toEqual({
        station_id: 'unknown',
        total_approved_amount: 0,
        events_count: 0,
      });
    });
  });
});
