import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { EVENT_STORE, IEventStore } from '../src/storage/interfaces/event-store.interface';

describe('Transfers (e2e)', () => {
  let app: INestApplication;
  let store: IEventStore;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    store = app.get<IEventStore>(EVENT_STORE);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await store.clear();
  });

  const validBatch = {
    events: [
      { event_id: 'evt-1', station_id: 'station-A', amount: 100.50, status: 'approved', created_at: '2024-01-15T10:00:00Z' },
      { event_id: 'evt-2', station_id: 'station-A', amount: 200.00, status: 'pending', created_at: '2024-01-15T11:00:00Z' },
      { event_id: 'evt-3', station_id: 'station-A', amount: 50.25, status: 'approved', created_at: '2024-01-15T12:00:00Z' },
    ],
  };

  describe('POST /transfers', () => {
    it('should ingest a valid batch and return correct counts', async () => {

      const res = await request(app.getHttpServer())
        .post('/transfers')
        .send(validBatch)
        .expect(201);

      expect(res.body).toEqual({ inserted: 3, duplicates: 0 });
    });

    it('should return all duplicates when resending the same batch', async () => {

      await request(app.getHttpServer())
        .post('/transfers')
        .send(validBatch)
        .expect(201);


      const res = await request(app.getHttpServer())
        .post('/transfers')
        .send(validBatch)
        .expect(201);

      expect(res.body).toEqual({ inserted: 0, duplicates: 3 });
    });

    it('should return 400 for missing event_id', async () => {

      await request(app.getHttpServer())
        .post('/transfers')
        .send({
          events: [
            { station_id: 's1', amount: 100, status: 'approved', created_at: '2024-01-15T10:00:00Z' },
          ],
        })
        .expect(400);
    });

    it('should return 400 for negative amount', async () => {

      await request(app.getHttpServer())
        .post('/transfers')
        .send({
          events: [
            { event_id: 'e1', station_id: 's1', amount: -10, status: 'approved', created_at: '2024-01-15T10:00:00Z' },
          ],
        })
        .expect(400);
    });

    it('should return 400 for invalid created_at', async () => {

      await request(app.getHttpServer())
        .post('/transfers')
        .send({
          events: [
            { event_id: 'e1', station_id: 's1', amount: 100, status: 'approved', created_at: 'not-a-date' },
          ],
        })
        .expect(400);
    });

    it('should return 400 for empty events array', async () => {

      await request(app.getHttpServer())
        .post('/transfers')
        .send({ events: [] })
        .expect(400);
    });
  });

  describe('GET /stations/:station_id/summary', () => {
    it('should return correct totals for approved-only sum and count', async () => {

      await request(app.getHttpServer())
        .post('/transfers')
        .send(validBatch)
        .expect(201);


      const res = await request(app.getHttpServer())
        .get('/stations/station-A/summary')
        .expect(200);

      expect(res.body).toEqual({
        station_id: 'station-A',
        total_approved_amount: 150.75,
        events_count: 2,
      });
    });

    it('should return zeros for unknown station', async () => {

      const res = await request(app.getHttpServer())
        .get('/stations/unknown-station/summary')
        .expect(200);

      expect(res.body).toEqual({
        station_id: 'unknown-station',
        total_approved_amount: 0,
        events_count: 0,
      });
    });
  });

  describe('Concurrency', () => {
    it('should not double-insert when concurrent requests have overlapping event_ids', async () => {
      const batch1 = {
        events: [
          { event_id: 'shared-1', station_id: 'station-B', amount: 100, status: 'approved', created_at: '2024-01-15T10:00:00Z' },
          { event_id: 'unique-1', station_id: 'station-B', amount: 200, status: 'approved', created_at: '2024-01-15T11:00:00Z' },
        ],
      };

      const batch2 = {
        events: [
          { event_id: 'shared-1', station_id: 'station-B', amount: 100, status: 'approved', created_at: '2024-01-15T10:00:00Z' },
          { event_id: 'unique-2', station_id: 'station-B', amount: 300, status: 'approved', created_at: '2024-01-15T12:00:00Z' },
        ],
      };

      const [res1, res2] = await Promise.all([
  
        request(app.getHttpServer()).post('/transfers').send(batch1),
  
        request(app.getHttpServer()).post('/transfers').send(batch2),
      ]);

      const totalInserted = res1.body.inserted + res2.body.inserted;
      expect(totalInserted).toBe(3);
    });
  });
});
