import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';

import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AISenseiService } from './ai-sensei.service';
import { InitializeSenseiDto } from './dto/initialize-sensei.dto';
import { ChatDto, WalletDto } from '../dto/chat.dto';
@ApiTags('AI Sensei')
@Controller('ai-sensei')
export class AISenseiController {
  private readonly logger = new Logger(AISenseiController.name);

  constructor(private readonly senseiAgentService: AISenseiService) {}
  @Post('start')
  @ApiOperation({ summary: 'Chat session with the Sensei.' })
  @ApiResponse({
    status: 201,
    description: 'Session initialized and Sensei greeting returned.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({
    status: 500,
    description: 'Internal server error during initialization.',
  })
  async initializeInteraction(@Body() initializeDto: InitializeSenseiDto) {
    this.logger.log(
      `Initializing Sensei interaction ${initializeDto.walletAddress} for wallet ${initializeDto.walletAddress}`,
    );
    try {
      const senseiResponse =
        await this.senseiAgentService.initializeInteraction(
          initializeDto.walletAddress,
          initializeDto.initialPlayerSkills,
        );

      return senseiResponse;
    } catch (error) {
      this.logger.error(
        `Failed to initialize Sensei interaction for wallet ${initializeDto.walletAddress}: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.message || 'Failed to initialize Sensei interaction.', // Use error message from service if available
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  
  @Post('chat')
  @ApiOperation({ summary: 'Chat session with the Sensei.' })
  @ApiResponse({
    status: 201,
    description: 'Session initialized and Sensei greeting returned.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({
    status: 500,
    description: 'Internal server error during initialization.',
  })
  async chat(@Body() chatDto: ChatDto) {
    this.logger.log(
      `Initializing Sensei interaction ${chatDto.walletAddress} for wallet ${chatDto.walletAddress}`,
    );
    try {
      const senseiResponse =
        await this.senseiAgentService.handlePlayerMessage(
          chatDto.walletAddress,
          chatDto.message,
        );

      return senseiResponse;
    } catch (error) {
      this.logger.error(
        `Failed to initialize Sensei interaction for wallet ${chatDto.walletAddress}: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.message || 'Failed to chat Sensei interaction.', // Use error message from service if available
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  
  @Post('end')
  @ApiOperation({ summary: 'Chat session with the Sensei.' })
  @ApiResponse({
    status: 201,
    description: 'Session initialized and Sensei greeting returned.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({
    status: 500,
    description: 'Internal server error during initialization.',
  })
  async end(@Body() walletDto: WalletDto) {
    this.logger.log(
      `Initializing Sensei interaction ${walletDto.walletAddress} for wallet ${walletDto.walletAddress}`,
    );
    try {
      const senseiResponse =
        await this.senseiAgentService.reset(
          walletDto.walletAddress,
        );

      return senseiResponse;
    } catch (error) {
      this.logger.error(
        `Failed to initialize Sensei interaction for wallet ${walletDto.walletAddress}: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.message || 'Failed to reset Sensei interaction.', // Use error message from service if available
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
