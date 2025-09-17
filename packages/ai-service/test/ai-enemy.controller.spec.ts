import { Test, TestingModule } from '@nestjs/testing';

import {
  mockGameStatePayload,
  mockBossActionResponse,
  mockGameId,
} from './mock-game.payload';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { BossActionResponse } from '../src/agents/ai-enemy/dto/ai-enemy.schema';
import { AIEnemyController } from '../src/agents/ai-enemy/ai-enemy.controller';
import { AIEnemyService } from '../src/agents/ai-enemy/ai-enemy.service';

const mockAIBossService = {
  getBossAction: jest.fn(),
  deleteGameContext: jest.fn(),
};

describe('AIEnemyController', () => {
  let app: INestApplication;
  let controller: AIEnemyController;
  let service: AIEnemyService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AIEnemyController],
      providers: [
        {
          provide: AIEnemyService,
          useValue: mockAIBossService, // Use the mock
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Apply the same validation pipe as in main.ts for realistic testing
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    controller = moduleFixture.get<AIEnemyController>(AIEnemyController);
    service = moduleFixture.get<AIEnemyService>(AIEnemyService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks after each test
  });

  afterAll(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /v2/ai-boss/action', () => {
    it('should call AIBossService.getBossAction and return boss action', async () => {
      // Arrange
      const expectedResponse: BossActionResponse =
        mockBossActionResponse as unknown as BossActionResponse; // Cast for test type
      mockAIBossService.getBossAction.mockResolvedValue(expectedResponse);

      // Act: Use supertest to make an HTTP request to the controller endpoint
      const response = await request(app.getHttpServer())
        .post('/v2/ai-boss/action')
        .send(mockGameStatePayload)
        .expect(HttpStatus.OK);

      // Assert
      expect(service.initialize).toHaveBeenCalledTimes(1);
      expect(service.initialize).toHaveBeenCalledWith(
        mockGameStatePayload.gameId,
        mockGameStatePayload.currentGameState, // DTO transformation happens before service call
      );
      expect(response.body).toEqual(expectedResponse);
    });

    it('should return 400 if request body is invalid (e.g., missing gameId)', async () => {
      const invalidPayload = { ...mockGameStatePayload, gameId: undefined };

      await request(app.getHttpServer())
        .post('/v2/ai-boss/action')
        .send(invalidPayload)
        .expect(HttpStatus.BAD_REQUEST)
        .then((response) => {
          expect(response.body.message).toEqual(
            expect.arrayContaining([
              'gameId should not be empty',
              'gameId must be a string',
            ]),
          );
        });

      expect(service.initialize).not.toHaveBeenCalled();
    });

    it('should return 400 if nested currentGameState is invalid (e.g., player health is not a number)', async () => {
      const invalidGameStatePayload = JSON.parse(
        JSON.stringify(mockGameStatePayload),
      ); // Deep clone
      invalidGameStatePayload.currentGameState.player['player-state'][
        'current-health'
      ] = 'not-a-number';

      await request(app.getHttpServer())
        .post('/v2/ai-boss/action')
        .send(invalidGameStatePayload)
        .expect(HttpStatus.BAD_REQUEST)
        .then((response) => {
          // class-validator will report errors on the deepest invalid field
          expect(response.body.message).toEqual(
            expect.arrayContaining([
              'currentGameState.player.player-state.current-health must be a number conforming to the specified constraints',
            ]),
          );
        });
      expect(service.initialize).not.toHaveBeenCalled();
    });

    it('should return 500 if AIBossService.getBossAction throws an unhandled error', async () => {
      const errorMessage = 'Internal AI Service Error';
      mockAIBossService.getBossAction.mockRejectedValue(
        new Error(errorMessage),
      );

      await request(app.getHttpServer())
        .post('/v2/ai-boss/action')
        .send(mockGameStatePayload)
        .expect(HttpStatus.INTERNAL_SERVER_ERROR)
        .then((response) => {
          expect(response.body.message).toContain(
            'Failed to get boss action (V2) due to an unexpected internal error.',
          );
        });
      expect(service.initialize).toHaveBeenCalledTimes(1);
    });

    it('should return 400 if AIBossService.getBossAction returns a known error (e.g., invalid game state format from service)', async () => {
      const serviceError = {
        error: 'Invalid game state format.',
        details: { someField: 'is wrong' },
      };
      mockAIBossService.getBossAction.mockResolvedValue(serviceError);

      await request(app.getHttpServer())
        .post('/v2/ai-boss/action')
        .send(mockGameStatePayload)
        .expect(HttpStatus.BAD_REQUEST)
        .then((response) => {
          expect(response.body.message).toEqual(serviceError.error);
          expect(response.body.details).toEqual(serviceError.details);
        });
      expect(service.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('DELETE /v2/ai-boss/context/:gameId', () => {
    it('should call AIBossService.deleteGameContext and return 204 No Content', async () => {
      mockAIBossService.deleteGameContext.mockResolvedValue(undefined); // deleteGameContext returns Promise<void>

      await request(app.getHttpServer())
        .delete(`/v2/ai-boss/context/${mockGameId}`)
        .expect(HttpStatus.NO_CONTENT);

      expect(service.deleteGameContext).toHaveBeenCalledTimes(1);
      expect(service.deleteGameContext).toHaveBeenCalledWith(mockGameId);
    });

    it('should return 500 if AIBossService.deleteGameContext throws an error', async () => {
      const errorMessage = 'Failed to delete context';
      mockAIBossService.deleteGameContext.mockRejectedValue(
        new Error(errorMessage),
      );

      await request(app.getHttpServer())
        .delete(`/v2/ai-boss/context/${mockGameId}`)
        .expect(HttpStatus.INTERNAL_SERVER_ERROR)
        .then((response) => {
          expect(response.body.message).toEqual(
            'Failed to delete game context (V2).',
          );
        });
      expect(service.deleteGameContext).toHaveBeenCalledTimes(1);
    });
  });
});
