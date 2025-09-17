import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AIDealerService } from './ai-dealer.service';
import { DealerInitDto as InitDealerDto } from './dto/intialize-dealer.dto';
import { ChatDealerDto } from './dto/chat-dealer.dto';
@ApiTags('AI Agent')
@Controller('ai-dealer')
export class AIDealerController {
  constructor(private readonly aiAgentService: AIDealerService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start chatting with dealer agent' })
  @ApiResponse({
    status: 200,
    description: 'Dealer agent greets',
  })
  async startChatting(@Body() body: InitDealerDto): Promise<any> {
    try {
      const result = await this.aiAgentService.initializeInteraction(
        body.walletAddress,
        body.playerInitialMoney,
        body.playerInitialCurrentHealth,
        body.playerInitialMaxHealth,
      );
      console.log(result);
      return result;
    } catch (error) {
      console.error('Error running dealer example:', error);
      throw new HttpException(
        'An error occurred while processing your request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('chat')
  @ApiOperation({ summary: 'Chat with dealer agent' })
  @ApiResponse({
    status: 200,
    description: 'Response from the agent',
  })
  async normalChat(@Body() body: ChatDealerDto): Promise<any> {
    try {
      const result = await this.aiAgentService.handlePlayerMessage(
        body.walletAddress,
        body.message,
        body.playerCurrentMoney,
        body.playerCurrentHealth,
        body.playerMaxHealth,
      );
      return result;
    } catch (error) {
      console.error('Error handling dealer chat:', error);
      throw new HttpException(
        'An error occurred while processing your request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('end')
  @ApiOperation({ summary: 'End chat with dealer agent' })
  @ApiResponse({
    status: 200,
    description: 'Chat session ended successfully',
  })
  async endChatting(@Body() body: { walletAddress: string }): Promise<any> {
    try {
      const result = await this.aiAgentService.reset(body.walletAddress);
      return result;
    } catch (error) {
      console.error('Error ending dealer chat:', error);
      throw new HttpException(
        'An error occurred while processing your request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
