import {
  Controller,
  Post,
  Body,
  Logger,
  Param,
  Delete,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiExtraModels,
} from '@nestjs/swagger';
import { AIEnemyService } from './ai-enemy.service';
import {
  GetBossActionRequestDto,
  GameStateRequestDataDto,
} from './dto/initialize-enemy.dto';
import { BossActionResponse } from './dto/ai-enemy.schema';

@ApiTags('AI Enemy')
@Controller('ai-enemy')
@ApiExtraModels(GetBossActionRequestDto, GameStateRequestDataDto)
export class AIEnemyController {
  private readonly logger = new Logger(AIEnemyController.name);

  constructor(private readonly aiEnemyService: AIEnemyService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start a new game session for the AI boss.' })
  @ApiBody({ type: GetBossActionRequestDto })
  @ApiResponse({
    status: 201,
    description: 'New AI session started successfully.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async start(
    @Body() startGameDto: GetBossActionRequestDto,
  ): Promise<BossActionResponse> {
    this.logger.log(
      `Controller: Received request to START session for game ID: ${startGameDto.gameId}`,
    );

    try {
      // Calls the new 'startSession' method in the service
      const actionResponse = await this.aiEnemyService.startSession(
        startGameDto.gameId,
        startGameDto.currentGameState,
      );

      // Handle potential errors returned from the service
      if ('error' in actionResponse) {
        this.logger.error(
          `Controller: Service failed to start session for game ${startGameDto.gameId}: ${actionResponse.error}`,
        );
        throw new HttpException(
          actionResponse.error,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      this.logger.log(
        `Controller: Session started for game ${startGameDto.gameId}. First Phase: ${actionResponse['next-phase']}`,
      );
      return actionResponse;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error; // Re-throw exceptions we've already handled
      }
      this.logger.error(
        `Controller: Unhandled error starting session for game ${startGameDto.gameId}: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to start session due to an unexpected error.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('action')
  @ApiOperation({ summary: 'Get the next action for the AI boss.' })
  @ApiBody({ type: GetBossActionRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Boss action decided successfully.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async getAction(
    @Body() getActionDto: GetBossActionRequestDto,
  ): Promise<BossActionResponse> {
    this.logger.log(
      `Controller: Received request for next ACTION for game ID: ${getActionDto.gameId}`,
    );

    try {
      // Calls the new 'getAction' method, providing the UPDATED game state
      const actionResponse = await this.aiEnemyService.getAction(
        getActionDto.gameId,
        getActionDto.currentGameState,
      );

      // Handle potential errors returned from the service
      if ('error' in actionResponse) {
        this.logger.error(
          `Controller: Service failed to get action for game ${getActionDto.gameId}: ${actionResponse.error}`,
        );
        throw new HttpException(
          actionResponse.error,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      this.logger.log(
        `Controller: Boss action for game ${getActionDto.gameId} - Phase: ${actionResponse['next-phase']}`,
      );
      return actionResponse;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Controller: Unhandled error getting action for game ${getActionDto.gameId}: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to get boss action due to an unexpected error.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('context/:gameId')
  @ApiOperation({
    summary: 'End a game session and delete the AI context.',
  })
  @ApiParam({
    name: 'gameId',
    description: 'The ID of the game session to end.',
  })
  @ApiResponse({
    status: 200, // Changed to 200 to allow returning a message
    description: 'Game context deleted successfully.',
  })
  @ApiResponse({ status: 500, description: 'Failed to delete game context.' })
  async endSession(
    @Param('gameId') gameId: string,
  ): Promise<{ message: string }> {
    this.logger.log(
      `Controller: Received request to DELETE context for game ID: ${gameId}`,
    );
    try {
      await this.aiEnemyService.endSession(gameId);
      return { message: `Context for game ${gameId} deleted successfully.` };
    } catch (error) {
      this.logger.error(
        `Controller: Error deleting context for game ${gameId}: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to delete game context',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
