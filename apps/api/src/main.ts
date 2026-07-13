import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import type { ApiConfiguration } from '@local-wellness/config';

import { AppModule } from './app.module.js';
import { configureApiApplication } from './application.js';
import { API_CONFIGURATION } from './configuration.js';

const application = await NestFactory.create(AppModule);
const configuration = application.get<ApiConfiguration>(API_CONFIGURATION);

configureApiApplication(application);

await application.listen(configuration.port);
