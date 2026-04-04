import { ApiProperty } from '@nestjs/swagger';

export class StationSummaryResponseDto {
  @ApiProperty({ example: 'station-A' })
  station_id: string;

  @ApiProperty({ example: 250.75 })
  total_approved_amount: number;

  @ApiProperty({ example: 5 })
  events_count: number;
}
