import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            generateToken: jest.fn(),
          },
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should return a token and username when login is successful', () => {
      const loginDto = { username: 'testuser' };
      const token = 'mockedToken';
      jest.spyOn(authService, 'generateToken').mockReturnValue(token);

      const result = authController.login(loginDto);

      expect(authService.generateToken).toHaveBeenCalledWith({ username: loginDto.username });
      expect(result).toEqual({
        token,
        username: loginDto.username,
      });
    });
  });
});
