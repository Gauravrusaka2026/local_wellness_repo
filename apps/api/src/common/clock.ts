import { Injectable } from '@nestjs/common';

export abstract class Clock {
  public abstract now(): Date;
}

@Injectable()
export class SystemClock implements Clock {
  public now(): Date {
    return new Date();
  }
}
