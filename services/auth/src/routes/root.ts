import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "crypto";
import { hash } from "bcryptjs";
import { db } from "../core/db";
import { isRoot } from "../core/handler/root";
import {
	createOrgSchema,
	updateOrgSchema,
	createUserSchema,
	updateUserSchema,
	createInvitationSchema,
} from "./schemas";

export async function rootRoutes(fastify: FastifyInstance) {
	// ========== ORGANIZATION ROUTES ==========

	// List all organizations
	fastify.get(
		"/api/root/orgs",
		{
			preHandler: [isRoot],
		},
		async (request, reply) => {
			const organizations = await db.organization.findMany({
				include: {
					_count: {
						select: {
							members: true,
							invitations: true,
						},
					},
				},
				orderBy: { createdAt: "desc" },
			});

			return reply.status(200).send({
				organizations: organizations.map((org) => ({
					id: org.id,
					name: org.name,
					slug: org.slug,
					logo: org.logo,
					metadata: org.metadata,
					createdAt: org.createdAt,
					memberCount: org._count.members,
					invitationCount: org._count.invitations,
				})),
			});
		}
	);

	// Create organization
	fastify.post(
		"/api/root/orgs",
		{
			preHandler: [isRoot],
			schema: {
				body: createOrgSchema,
			},
		},
		async (request, reply) => {
			const body = request.body as z.infer<typeof createOrgSchema>;

			// Check if slug already exists
			const existing = await db.organization.findUnique({
				where: { slug: body.slug },
			});

			if (existing) {
				return reply.status(409).send({
					error: "Conflict",
					message: "Slug already exists",
					code: "SLUG_EXISTS",
				});
			}

			const organization = await db.organization.create({
				data: {
					id: randomUUID(),
					name: body.name,
					slug: body.slug,
					logo: body.logo,
					metadata: body.metadata,
					createdAt: new Date(),
				},
			});

			return reply.status(201).send({
				message: "Organization created successfully",
				organization,
			});
		}
	);

	// Get organization details
	fastify.get(
		"/api/root/orgs/:id",
		{
			preHandler: [isRoot],
		},
		async (request, reply) => {
			const { id } = request.params as { id: string };

			const organization = await db.organization.findUnique({
				where: { id },
				include: {
					members: {
						include: {
							user: {
								select: {
									id: true,
									name: true,
									email: true,
								},
							},
						},
					},
					invitations: true,
				},
			});

			if (!organization) {
				return reply.status(404).send({
					error: "Not Found",
					message: "Organization not found",
					code: "ORG_NOT_FOUND",
				});
			}

			return reply.status(200).send({
				organization: {
					id: organization.id,
					name: organization.name,
					slug: organization.slug,
					logo: organization.logo,
					metadata: organization.metadata,
					createdAt: organization.createdAt,
					members: organization.members.map((m) => ({
						id: m.id,
						userId: m.userId,
						role: m.role,
						user: m.user,
						createdAt: m.createdAt,
					})),
					invitations: organization.invitations,
				},
			});
		}
	);

	// Update organization
	fastify.put(
		"/api/root/orgs/:id",
		{
			preHandler: [isRoot],
			schema: {
				body: updateOrgSchema,
			},
		},
		async (request, reply) => {
			const { id } = request.params as { id: string };
			const body = request.body as z.infer<typeof updateOrgSchema>;

			// Check if slug is being updated and if it's already taken
			if (body.slug) {
				const existing = await db.organization.findFirst({
					where: {
						slug: body.slug,
						id: { not: id },
					},
				});

				if (existing) {
					return reply.status(409).send({
						error: "Conflict",
						message: "Slug already exists",
						code: "SLUG_EXISTS",
					});
				}
			}

			const organization = await db.organization.update({
				where: { id },
				data: {
					...(body.name && { name: body.name }),
					...(body.slug && { slug: body.slug }),
					...(body.logo !== undefined && { logo: body.logo }),
					...(body.metadata !== undefined && { metadata: body.metadata }),
				},
			});

			return reply.status(200).send({
				message: "Organization updated successfully",
				organization,
			});
		}
	);

	// Delete organization
	fastify.delete(
		"/api/root/orgs/:id",
		{
			preHandler: [isRoot],
		},
		async (request, reply) => {
			const { id } = request.params as { id: string };

			const organization = await db.organization.findUnique({
				where: { id },
			});

			if (!organization) {
				return reply.status(404).send({
					error: "Not Found",
					message: "Organization not found",
					code: "ORG_NOT_FOUND",
				});
			}

			await db.organization.delete({
				where: { id },
			});

			return reply.status(200).send({
				message: "Organization deleted successfully",
			});
		}
	);

	// ========== USER ROUTES ==========

	// List all users
	fastify.get(
		"/api/root/users",
		{
			preHandler: [isRoot],
		},
		async (request, reply) => {
			const users = await db.user.findMany({
				select: {
					id: true,
					name: true,
					email: true,
					emailVerified: true,
					role: true,
					banned: true,
					banReason: true,
					banExpires: true,
					createdAt: true,
					updatedAt: true,
					_count: {
						select: {
							members: true,
							sessions: true,
						},
					},
				},
				orderBy: { createdAt: "desc" },
			});

			return reply.status(200).send({
				users,
			});
		}
	);

	// Create user
	fastify.post(
		"/api/root/users",
		{
			preHandler: [isRoot],
			schema: {
				body: createUserSchema,
			},
		},
		async (request, reply) => {
			const body = request.body as z.infer<typeof createUserSchema>;

			// Check if email already exists
			const existing = await db.user.findUnique({
				where: { email: body.email },
			});

			if (existing) {
				return reply.status(409).send({
					error: "Conflict",
					message: "User with this email already exists",
					code: "EMAIL_EXISTS",
				});
			}

			const passwordHash = await hash(body.password, 12);
			const userId = randomUUID();
			const accountId = randomUUID();

			const user = await db.user.create({
				data: {
					id: userId,
					name: body.name,
					email: body.email,
					role: body.role || "CLIENT",
					emailVerified: false,
					accounts: {
						create: {
							id: accountId,
							accountId: body.email,
							providerId: "credentials",
							password: passwordHash,
						},
					},
				},
				select: {
					id: true,
					name: true,
					email: true,
					role: true,
					emailVerified: true,
					createdAt: true,
				},
			});

			return reply.status(201).send({
				message: "User created successfully",
				user,
			});
		}
	);

	// Get user details
	fastify.get(
		"/api/root/users/:id",
		{
			preHandler: [isRoot],
		},
		async (request, reply) => {
			const { id } = request.params as { id: string };

			const user = await db.user.findUnique({
				where: { id },
				include: {
					members: {
						include: {
							organization: {
								select: {
									id: true,
									name: true,
									slug: true,
								},
							},
						},
					},
					_count: {
						select: {
							sessions: true,
							accounts: true,
						},
					},
				},
			});

			if (!user) {
				return reply.status(404).send({
					error: "Not Found",
					message: "User not found",
					code: "USER_NOT_FOUND",
				});
			}

			return reply.status(200).send({
				user: {
					id: user.id,
					name: user.name,
					email: user.email,
					emailVerified: user.emailVerified,
					role: user.role,
					banned: user.banned,
					banReason: user.banReason,
					banExpires: user.banExpires,
					createdAt: user.createdAt,
					updatedAt: user.updatedAt,
					organizations: user.members.map((m) => ({
						id: m.id,
						role: m.role,
						organization: m.organization,
						createdAt: m.createdAt,
					})),
					sessionCount: user._count.sessions,
					accountCount: user._count.accounts,
				},
			});
		}
	);

	// Update user
	fastify.put(
		"/api/root/users/:id",
		{
			preHandler: [isRoot],
			schema: {
				body: updateUserSchema,
			},
		},
		async (request, reply) => {
			const { id } = request.params as { id: string };
			const body = request.body as z.infer<typeof updateUserSchema>;

			const user = await db.user.findUnique({
				where: { id },
			});

			if (!user) {
				return reply.status(404).send({
					error: "Not Found",
					message: "User not found",
					code: "USER_NOT_FOUND",
				});
			}

			// Check if email is being updated and if it's already taken
			if (body.email && body.email !== user.email) {
				const existing = await db.user.findUnique({
					where: { email: body.email },
				});

				if (existing) {
					return reply.status(409).send({
						error: "Conflict",
						message: "Email already exists",
						code: "EMAIL_EXISTS",
					});
				}
			}

			const updateData: {
				name?: string;
				email?: string;
				role?: string;
				banned?: boolean;
				banReason?: string | null;
				banExpires?: Date | null;
			} = {};

			if (body.name) updateData.name = body.name;
			if (body.email) updateData.email = body.email;
			if (body.role) updateData.role = body.role;
			if (body.banned !== undefined) updateData.banned = body.banned;
			if (body.banReason !== undefined) updateData.banReason = body.banReason;
			if (body.banExpires !== undefined) {
				updateData.banExpires = body.banExpires
					? new Date(body.banExpires)
					: null;
			}

			const updatedUser = await db.user.update({
				where: { id },
				data: updateData,
				select: {
					id: true,
					name: true,
					email: true,
					role: true,
					emailVerified: true,
					banned: true,
					banReason: true,
					banExpires: true,
					updatedAt: true,
				},
			});

			return reply.status(200).send({
				message: "User updated successfully",
				user: updatedUser,
			});
		}
	);

	// Delete user
	fastify.delete(
		"/api/root/users/:id",
		{
			preHandler: [isRoot],
		},
		async (request, reply) => {
			const { id } = request.params as { id: string };

			const user = await db.user.findUnique({
				where: { id },
			});

			if (!user) {
				return reply.status(404).send({
					error: "Not Found",
					message: "User not found",
					code: "USER_NOT_FOUND",
				});
			}

			await db.user.delete({
				where: { id },
			});

			return reply.status(200).send({
				message: "User deleted successfully",
			});
		}
	);

	// ========== INVITATION ROUTES ==========

	// Invite user to organization
	fastify.post(
		"/api/root/orgs/:orgId/invite",
		{
			preHandler: [isRoot],
			schema: {
				body: createInvitationSchema,
			},
		},
		async (request, reply) => {
			const { orgId } = request.params as { orgId: string };
			const { email, role } = request.body as z.infer<
				typeof createInvitationSchema
			>;

			// Verify organization exists
			const organization = await db.organization.findUnique({
				where: { id: orgId },
			});

			if (!organization) {
				return reply.status(404).send({
					error: "Not Found",
					message: "Organization not found",
					code: "ORG_NOT_FOUND",
				});
			}

			// Check if user is already a member
			const existingUser = await db.user.findUnique({
				where: { email },
				include: {
					members: {
						where: { organizationId: orgId },
					},
				},
			});

			if (existingUser && existingUser.members.length > 0) {
				return reply.status(409).send({
					error: "Conflict",
					message: "User is already a member of this organization",
					code: "ALREADY_MEMBER",
				});
			}

			// Check for existing pending invitation
			const existingInvitation = await db.invitation.findFirst({
				where: {
					organizationId: orgId,
					email,
					status: "pending",
					expiresAt: { gt: new Date() },
				},
			});

			if (existingInvitation) {
				return reply.status(409).send({
					error: "Conflict",
					message: "Pending invitation already exists for this email",
					code: "INVITATION_EXISTS",
				});
			}

			// Get a ROOT user as inviter (or use system user)
			const rootUser = await db.user.findFirst({
				where: { role: "ROOT" },
			});

			if (!rootUser) {
				return reply.status(500).send({
					error: "Internal Server Error",
					message: "No ROOT user found to create invitation",
					code: "NO_ROOT_USER",
				});
			}

			// Create invitation (expires in 7 days)
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + 7);

			const invitation = await db.invitation.create({
				data: {
					id: randomUUID(),
					organizationId: orgId,
					email,
					role: role || "USER",
					status: "pending",
					expiresAt,
					inviterId: rootUser.id,
				},
			});

			return reply.status(201).send({
				message: "Invitation created successfully",
				invitation: {
					id: invitation.id,
					email: invitation.email,
					role: invitation.role,
					status: invitation.status,
					expiresAt: invitation.expiresAt,
				},
			});
		}
	);
}
