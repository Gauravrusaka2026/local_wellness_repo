import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser, Device, RevokedDevice } from '@local-wellness/types';
import {
  deviceIdParametersSchema,
  registerDeviceSchema,
  type DeviceIdParameters,
  type RegisterDeviceRequest,
} from '@local-wellness/validation';

import { BearerAuthGuard } from '../auth/bearer-auth.guard.js';
import { Authenticated } from '../common/authenticated-user.decorator.js';
import { RateLimit, rateLimitPolicies } from '../common/rate-limit.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { DevicesService } from './devices.service.js';

@Controller('me/devices')
@UseGuards(BearerAuthGuard)
export class DevicesController {
  public constructor(@Inject(DevicesService) private readonly devicesService: DevicesService) {}

  @Get()
  public listDevices(@Authenticated() user: AuthenticatedUser): Promise<Device[]> {
    return this.devicesService.listDevices(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RateLimit(rateLimitPolicies.deviceMutation)
  public registerDevice(
    @Authenticated() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(registerDeviceSchema)) input: RegisterDeviceRequest,
  ): Promise<Device> {
    return this.devicesService.registerDevice(user.id, input);
  }

  @Delete(':deviceId')
  @RateLimit(rateLimitPolicies.deviceMutation)
  public revokeDevice(
    @Authenticated() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(deviceIdParametersSchema)) parameters: DeviceIdParameters,
  ): Promise<RevokedDevice> {
    return this.devicesService.revokeDevice(user.id, parameters.deviceId);
  }
}
