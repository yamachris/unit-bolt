import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let authService: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('generateToken', () => {
    it('should generate a token using JwtService', () => {
      const payload = { id: 1, username: 'test' };
      const token = 'mockToken';
      jest.spyOn(jwtService, 'sign').mockReturnValue(token);

      const result = authService.generateToken(payload);

      expect(result).toBe(token);
      expect(jwtService.sign).toHaveBeenCalledWith(payload);
    });
  });

  describe('verifyToken', () => {
    it('should return the decoded payload when the token is valid', () => {
      const token = 'validToken';
      const payload = { id: 1, username: 'test' };
      jest.spyOn(jwtService, 'verify').mockReturnValue(payload);

      const result = authService.verifyToken(token);

      expect(result).toBe(payload);
      expect(jwtService.verify).toHaveBeenCalledWith(token);
    });

    it('should return null when the token is invalid', () => {
      const token = 'invalidToken';
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = authService.verifyToken(token);

      expect(result).toBeNull();
      expect(jwtService.verify).toHaveBeenCalledWith(token);
    });
  });
});
