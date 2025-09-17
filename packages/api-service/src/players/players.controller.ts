import { BadRequestException, Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PlayersService } from './players.service';

@ApiTags('Players') // Group under 'Players' in Swagger UI
@Controller('player')
export class PlayerController {
  constructor(private readonly playerService: PlayersService) {}
  @Get('/:address')
  @ApiOperation({ summary: 'Get or create a player by address' })
  @ApiParam({
    name: 'address',
    description: 'Wallet address of the player',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Player data successfully retrieved or created',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getOrCreatePlayer(@Param('address') address: string) {
    try {
      const result = await this.playerService.getOrCreatePlayer(address);
      return result;
    } catch (error) {
      console.log('Error When Get or Create Player');
      throw new BadRequestException(error.message);
    }
  }
}
