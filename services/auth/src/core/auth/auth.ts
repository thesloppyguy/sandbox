import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma";
import { env } from "../../config/env";
import { db } from "../db";

export const auth: ReturnType<typeof betterAuth> = betterAuth({
    baseUrl: env.APP_URL,
    database: prismaAdapter(db, {
        provider: "postgresql",
    }),
    trustedOrigins: [env.APP_URL],
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: true,
          input: true,
        },
      },
    },
    rateLimit: {
      enabled: true,
      window: 10,
      max: 100,
      storage: "memory",
      modelName: "rateLimit",
    },
    session: {
      expiresIn: env.EXPIRATION_TIME,
      updateAge: env.UPDATE_AGE,
      freshAge: env.FRESH_AGE,
      cookieCache: {
        enabled: true,
        maxAge: env.MAX_AGE,
        strategy: "compact" as const,
      },
    },
    useSecureCookies: true,
    disableCSRFCheck: false,
    defaultCookieAttributes: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    },
    cookiePrefix: "auth",
    emailAndPassword: {
      enabled: true,
      disableSignUp: false,
      requireEmailVerification: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
      resetPasswordTokenExpiresIn: 3600,
    },
  });

export type Session = typeof auth.$Infer.Session;