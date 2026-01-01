import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'ai_tutor_db',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [path.join(__dirname, '../entities/**/*.{ts,js}')],
  migrations: [path.join(__dirname, '../database/migrations/**/*.{ts,js}')],
  subscribers: [],
});
