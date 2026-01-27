import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  // test function
  getHello(): string {
    return 'Hello World!';
  }
}
