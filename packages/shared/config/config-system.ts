import { config } from 'dotenv';

config();
config({ path: '../../.env' });

interface AppConfig {
  MONGODB_URI: string;
  AI_PORT: number;
  API_PORT: number;

  JWT_SECRET: string;
  JWT_EXPIRE: string;
}

const configSystem = (): AppConfig => ({
  MONGODB_URI: String(process.env.MONGODB_URI),
  API_PORT: Number(process.env.API_PORT),
  AI_PORT: Number(process.env.AI_PORT),

  JWT_SECRET: String(process.env.JWT_SECRET),
  JWT_EXPIRE: String(process.env.JWT_EXPIRE),
});

export default configSystem;
