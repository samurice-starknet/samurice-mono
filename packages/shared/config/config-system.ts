import { config } from 'dotenv';

config();
config({ path: '../../.env' });

interface AppConfig {
  MONGODB_URI: string;
  AI_PORT: number;
  API_PORT: number;
  GAME_SOCKET_GATEWAY_PORT: number;
  JWT_SECRET: string;
  JWT_EXPIRE: string;
  RPC_URL: string;
  VALIDATOR: {
    ADDRESS: string;
    PRIVATE_KEY: string;
  };
  CONTRACT_ADDRESSES: {
    GAME: string;
  };
}

const configSystem = (): AppConfig => ({
  MONGODB_URI: String(process.env.MONGODB_URI),
  API_PORT: Number(process.env.API_PORT),
  AI_PORT: Number(process.env.AI_PORT),
  GAME_SOCKET_GATEWAY_PORT: Number(process.env.GAME_SOCKET_GATEWAY_PORT),
  JWT_SECRET: String(process.env.JWT_SECRET),
  JWT_EXPIRE: String(process.env.JWT_EXPIRE),
  RPC_URL: String(process.env.RPC_URL),
  VALIDATOR: {
    ADDRESS: String(process.env.VALIDATOR_ADDRESS),
    PRIVATE_KEY: String(process.env.VALIDATOR_PRIVATE_KEY),
  },
  CONTRACT_ADDRESSES: {
    GAME: String(process.env.CONTRACT_ADDRESS_GAME),
  },
});

export default configSystem;
