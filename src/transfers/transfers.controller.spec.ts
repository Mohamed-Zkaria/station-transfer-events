import { Test, TestingModule } from '@nestjs/testing';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';

describe('TransfersController', () => {
  let controller: TransfersController;
  let service: jest.Mocked<TransfersService>;

  beforeEach(async () => {
    service = {
      ingestEvents: jest.fn(),
      getStationSummary: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransfersController],
      providers: [{ provide: TransfersService, useValue: service }],
    }).compile();

    controller = module.get<TransfersController>(TransfersController);
  });

  describe('POST /transfers', () => {
    it('should delegate to service and return result', async () => {
      const response = { inserted: 3, duplicates: 0 };
      service.ingestEvents.mockResolvedValue(response);

      const dto = {
        events: [
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
            status: 'pending',
            created_at: '2024-01-15T11:00:00Z',
          },
          {
            event_id: 'e3',
            station_id: 's1',
            amount: 300,
            status: 'approved',
            created_at: '2024-01-15T12:00:00Z',
          },
        ],
      };

      const result = await controller.ingestEvents(dto);

      expect(result).toEqual(response);
      expect(service.ingestEvents).toHaveBeenCalledWith(dto.events);
    });
  });

  describe('GET /stations/:station_id/summary', () => {
    it('should delegate to service and return summary', async () => {
      const summary = {
        station_id: 'station-A',
        total_approved_amount: 500,
        events_count: 3,
      };
      service.getStationSummary.mockResolvedValue(summary);

      const result = await controller.getStationSummary('station-A');

      expect(result).toEqual(summary);
      expect(service.getStationSummary).toHaveBeenCalledWith('station-A');
    });
  });
});
