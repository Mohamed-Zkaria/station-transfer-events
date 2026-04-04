export const EVENT_STORE = Symbol('EVENT_STORE');

export interface TransferEventData {
  event_id: string;
  station_id: string;
  amount: number;
  status: string;
  created_at: Date;
}

export interface IEventStore {
  /** Insert events, skip conflicts on event_id. Returns count of rows actually inserted. */
  insertIgnoringConflicts(events: TransferEventData[]): Promise<number>;

  /** Count all events for a station (all statuses). */
  countByStation(stationId: string): Promise<number>;

  /** Sum the amount field for events matching a station and status. */
  sumAmountByStationAndStatus(
    stationId: string,
    status: string,
  ): Promise<number>;

  /** Clear all data (testing only). */
  clear(): Promise<void>;
}
