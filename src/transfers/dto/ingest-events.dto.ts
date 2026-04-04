import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class TransferEventDto {
  @ApiProperty({ example: 'evt-001' })
  @IsString()
  @IsNotEmpty()
  event_id: string;

  @ApiProperty({ example: 'station-A' })
  @IsString()
  @IsNotEmpty()
  station_id: string;

  @ApiProperty({ example: 100.5 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'approved' })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  @IsISO8601({ strict: true })
  created_at: string;
}

export class IngestEventsDto {
  @ApiProperty({ type: [TransferEventDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => TransferEventDto)
  events: TransferEventDto[];
}
