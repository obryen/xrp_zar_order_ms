import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  constructor() { }
  home() {
    return {
      message:
        'Welcome to the the XRP<->Zar order management API',
    };
  }
}
