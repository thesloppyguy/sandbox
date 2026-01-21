import { z } from "zod";

// Organization schemas
export const createOrgSchema = z.object({
	name: z.string().min(1).max(255),
	slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
	logo: z.string().url().optional(),
	metadata: z.string().optional(),
});

export const updateOrgSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/).optional(),
	logo: z.string().url().optional(),
	metadata: z.string().optional(),
});

// User schemas
export const createUserSchema = z.object({
	name: z.string().min(1).max(255),
	email: z.string().email(),
	password: z.string().min(8).max(128),
	role: z.enum(["ROOT", "CLIENT"]).optional(),
});

export const updateUserSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	email: z.string().email().optional(),
	role: z.enum(["ROOT", "CLIENT"]).optional(),
	banned: z.boolean().optional(),
	banReason: z.string().optional(),
	banExpires: z.string().datetime().optional(),
});

// Invitation schemas
export const createInvitationSchema = z.object({
	email: z.string().email(),
	role: z.enum(["OWNER", "ADMIN", "USER"]).default("USER"),
});

// Switch org schema
export const switchOrgSchema = z.object({
	orgId: z.string().uuid(),
});

// Activate account schema
export const activateAccountSchema = z.object({
	userId: z.string().uuid(),
});
