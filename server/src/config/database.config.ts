import { registerAs } from '@nestjs/config';
export default registerAs('database', () => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    return {
      type: 'postgres' as const,
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      ssl: true,
      extra: {
        ssl: {
          rejectUnauthorized: false,
        },
      },
    };
  }

  // Development: use SQLite
  return {
    type: 'sqlite' as const,
    database: 'unit_game.db',
    synchronize: true,
  };
});
