import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    APP_URL: z.string().url().default("http://localhost:3000"),
    EXPIRATION_TIME: z.number().default(60 * 60 * 24 * 7),
    UPDATE_AGE: z.number().default(60 * 60 * 24),
    FRESH_AGE: z.number().default(60 * 60 * 24),
    MAX_AGE: z.number().default(5 * 60),
    GOOGLE_RECAPTCHA_SECRET_KEY: z.string().min(32),
    MANAGER_EMAIL: z.string().email(),
    MANAGER_PASSWORD: z.string().min(8),
});

export const env = envSchema.parse(process.env);