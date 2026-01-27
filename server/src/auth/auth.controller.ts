import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() loginDto: { username: string }) {
    // For this simple implementation, we're just generating a token based on the username
    // In a real application, you would validate credentials against a database
    return {
      token: this.authService.generateToken({ username: loginDto.username }),
      username: loginDto.username,
    };
  }
}
