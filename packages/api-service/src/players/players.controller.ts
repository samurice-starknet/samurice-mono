import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PlayersService } from './players.service';
import { AddressDto } from './dto/address.dto';
import { BaseResult } from '@app/shared/utils/types';
import { TypedData } from 'starknet';
import { VerifySignatureDto } from './dto/verifySignature.dto';

@ApiTags('Players') // Group under 'Players' in Swagger UI
@Controller('player')
export class PlayerController {
  constructor(private readonly playerService: PlayersService) {}

  @Get('auth/get-message')
  @ApiOperation({ summary: 'Get message for authentication' })
  @ApiResponse({
    status: 200,
    description: 'Return message with new nonce for authentication',
  })
  async getAuthMessage(
    @Query() query: AddressDto,
  ): Promise<BaseResult<TypedData>> {
    const message = await this.playerService.getAuthMessage(query.address);
    return new BaseResult(message);
  }

  @Post('auth/verify-signature')
  @ApiOperation({ summary: 'Verify signature for authentication' })
  @ApiResponse({
    status: 200,
    description: 'Return access token if signature is valid or error message',
  })
  async verifySignature(
    @Body() query: VerifySignatureDto,
  ): Promise<BaseResult<string>> {
    const result = await this.playerService.verifySignature(query);
    return new BaseResult(result);
  }

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
