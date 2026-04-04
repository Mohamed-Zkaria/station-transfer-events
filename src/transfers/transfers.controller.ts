import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IngestEventsDto } from './dto/ingest-events.dto';
import { IngestEventsResponseDto } from './dto/ingest-events-response.dto';
import { StationSummaryResponseDto } from './dto/station-summary-response.dto';
import { TransfersService } from './transfers.service';

@ApiTags('Transfers')
@Controller()
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post('transfers')
  @ApiOperation({ summary: 'Ingest a batch of transfer events' })
  @ApiResponse({ status: 201, type: IngestEventsResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async ingestEvents(
    @Body() dto: IngestEventsDto,
  ): Promise<IngestEventsResponseDto> {
    return this.transfersService.ingestEvents(dto.events);
  }

  @Get('stations/:station_id/summary')
  @ApiOperation({ summary: 'Get summary for a station' })
  @ApiParam({ name: 'station_id', type: String })
  @ApiResponse({ status: 200, type: StationSummaryResponseDto })
  async getStationSummary(
    @Param('station_id') stationId: string,
  ): Promise<StationSummaryResponseDto> {
    return this.transfersService.getStationSummary(stationId);
  }
}
