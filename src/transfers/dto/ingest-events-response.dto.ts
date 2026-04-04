import { ApiProperty } from '@nestjs/swagger';

export class IngestEventsResponseDto {
  @ApiProperty({ example: 3 })
  inserted: number;

  @ApiProperty({ example: 0 })
  duplicates: number;
}
