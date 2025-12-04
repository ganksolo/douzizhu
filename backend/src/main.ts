import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS (if needed for frontend)
  app.enableCors();

  // Swagger/OpenAPI Setup
  const openApiPath = path.join(process.cwd(), '../docs/openapi.yaml');

  // Function to load OpenAPI spec from YAML file
  const loadOpenApiSpec = () => {
    try {
      const fileContents = fs.readFileSync(openApiPath, 'utf8');
      return yaml.load(fileContents);
    } catch (error) {
      console.error('Failed to load OpenAPI spec:', error.message);
      return null;
    }
  };

  // Initial setup
  let openApiDocument = loadOpenApiSpec();
  if (openApiDocument) {
    SwaggerModule.setup('api-docs', app, openApiDocument as any, {
      swaggerOptions: {
        persistAuthorization: true, // Keep auth tokens across page reloads
      },
    });
    const port = process.env.PORT ?? 3000;
    console.log(`✅ Swagger UI available at: http://localhost:${port}/api-docs`);
  } else {
    console.warn('⚠️  OpenAPI spec not found. Skipping Swagger setup.');
  }

  // Hot reload: Watch for changes in openapi.yaml (development only)
  if (process.env.NODE_ENV !== 'production') {
    fs.watch(openApiPath, (eventType) => {
      if (eventType === 'change') {
        console.log('🔄 OpenAPI spec changed, reloading...');
        openApiDocument = loadOpenApiSpec();
        if (openApiDocument) {
          // Note: SwaggerModule.setup() cannot be called multiple times on the same app
          // For true hot reload, you'd need to restart the server or use advanced techniques
          // This at least logs the change and updates the in-memory spec
          console.log('✅ OpenAPI spec reloaded (server restart required for UI update)');
        }
      }
    });
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
