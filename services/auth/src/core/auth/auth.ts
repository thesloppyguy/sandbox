import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins"
import { organization } from "better-auth/plugins"
import { captcha } from "better-auth/plugins";
import { haveIBeenPwned } from "better-auth/plugins";
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
        input: false,
        defaultValue: "CLIENT", // ROOT is assigned manually
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
  emailVerification: {
    sendOnSignUp: true
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    resetPasswordTokenExpiresIn: 3600,
  },
  plugins: [admin(), organization(), captcha({
    provider: "google-recaptcha",
    secretKey: env.GOOGLE_RECAPTCHA_SECRET_KEY!,
  }), haveIBeenPwned({
    customPasswordCompromisedMessage: "Please choose a more secure password."
  })],
});

export type Session = typeof auth.$Infer.Session;