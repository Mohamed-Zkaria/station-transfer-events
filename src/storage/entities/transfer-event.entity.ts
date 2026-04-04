import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('transfer_events')
export class TransferEventEntity {
  @PrimaryColumn()
  event_id: string;

  @Index()
  @Column()
  station_id: string;

  @Column({ type: 'decimal', precision: 20, scale: 2 })
  amount: number;

  @Column()
  status: string;

  @Column({ type: 'timestamp' })
  created_at: Date;
}
