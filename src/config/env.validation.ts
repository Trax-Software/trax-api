import * as Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  
  // Database
  DATABASE_URL: Joi.string().required(),
  
  // Redis (para BullMQ e Cache)
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  
  // Security
  JWT_SECRET: Joi.string().required().min(32), // Força segredo forte
  API_KEY_OPENAI: Joi.string().required(), // Já preparando terreno
});