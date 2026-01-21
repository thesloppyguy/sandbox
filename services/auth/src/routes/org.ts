import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "crypto";
import { db } from "../core/db";
import { isAuth, type AuthenticatedRequest } from "../core/handler/auth";
import { isOrgMember, isOrgOwnerOrAdmin } from "../core/handler/org";
import { switchOrgSchema, createInvitationSchema } from "./schemas";

export async function orgRoutes(fastify: FastifyInstance) {
	// Switch organization
	fastify.post(
		"/api/org/switch",
		{
			preHandler: [isAuth],
			schema: {
				body: switchOrgSchema,
			},
		},
		async (request, reply) => {
			const authenticatedRequest = request as AuthenticatedRequest;
			const { orgId } = request.body as z.infer<typeof switchOrgSchema>;

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

			// Verify user is a member
			const member = await db.member.findFirst({
				where: {
					organizationId: orgId,
					userId: authenticatedRequest.user.id,
				},
			});

			if (!member) {
				return reply.status(403).send({
					error: "Forbidden",
					message: "You are not a member of this organization",
					code: "NOT_ORG_MEMBER",
				});
			}

			// Get session token from cookies (better-auth uses "auth.session_token" cookie)
			const cookies = request.headers.cookie || "";
			const sessionTokenMatch = cookies.match(/auth\.session_token=([^;]+)/);
			
			if (!sessionTokenMatch) {
				return reply.status(401).send({
					error: "Unauthorized",
					message: "Session token not found",
					code: "SESSION_NOT_FOUND",
				});
			}

			const sessionToken = decodeURIComponent(sessionTokenMatch[1]);

			// Update session with active organization
			const updated = await db.session.updateMany({
				where: {
					token: sessionToken,
					userId: authenticatedRequest.user.id,
				},
				data: {
					activeOrganizationId: orgId,
				},
			});

			if (updated.count === 0) {
				return reply.status(401).send({
					error: "Unauthorized",
					message: "Session not found or invalid",
					code: "SESSION_NOT_FOUND",
				});
			}

			return reply.status(200).send({
				message: "Organization switched successfully",
				organization: {
					id: organization.id,
					name: organization.name,
					slug: organization.slug,
				},
			});
		}
	);

	// Get organization details (Owner/Admin)
	fastify.get(
		"/api/orgs/:orgId",
		{
			preHandler: [isOrgOwnerOrAdmin],
		},
		async (request, reply) => {
			const { orgId } = request.params as { orgId: string };

			const organization = await db.organization.findUnique({
				where: { id: orgId },
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
					invitations: {
						where: {
							status: "pending",
						},
					},
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
					invitations: organization.invitations.map((inv) => ({
						id: inv.id,
						email: inv.email,
						role: inv.role,
						status: inv.status,
						expiresAt: inv.expiresAt,
						createdAt: inv.createdAt,
					})),
				},
			});
		}
	);

	// Update organization (Owner/Admin)
	fastify.put(
		"/api/orgs/:orgId",
		{
			preHandler: [isOrgOwnerOrAdmin],
			schema: {
				body: {
					type: "object",
					properties: {
						name: { type: "string", minLength: 1, maxLength: 255 },
						slug: { type: "string", minLength: 1, maxLength: 255 },
						logo: { type: "string" },
						metadata: { type: "string" },
					},
				},
			},
		},
		async (request, reply) => {
			const { orgId } = request.params as { orgId: string };
			const body = request.body as {
				name?: string;
				slug?: string;
				logo?: string;
				metadata?: string;
			};

			// Check if slug is being updated and if it's already taken
			if (body.slug) {
				const existing = await db.organization.findFirst({
					where: {
						slug: body.slug,
						id: { not: orgId },
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
				where: { id: orgId },
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

	// List invitations (Owner/Admin)
	fastify.get(
		"/api/orgs/:orgId/invites",
		{
			preHandler: [isOrgOwnerOrAdmin],
		},
		async (request, reply) => {
			const { orgId } = request.params as { orgId: string };

			const invitations = await db.invitation.findMany({
				where: { organizationId: orgId },
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
				},
				orderBy: { createdAt: "desc" },
			});

			return reply.status(200).send({
				invitations: invitations.map((inv) => ({
					id: inv.id,
					email: inv.email,
					role: inv.role,
					status: inv.status,
					expiresAt: inv.expiresAt,
					createdAt: inv.createdAt,
					inviter: inv.user,
				})),
			});
		}
	);

	// Create invitation (Owner/Admin)
	fastify.post(
		"/api/orgs/:orgId/invites",
		{
			preHandler: [isOrgOwnerOrAdmin],
			schema: {
				body: createInvitationSchema,
			},
		},
		async (request, reply) => {
			const authenticatedRequest = request as AuthenticatedRequest;
			const { orgId } = request.params as { orgId: string };
			const { email, role } = request.body as z.infer<
				typeof createInvitationSchema
			>;

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
					inviterId: authenticatedRequest.user.id,
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

	// Cancel invitation (Owner/Admin)
	fastify.delete(
		"/api/orgs/:orgId/invites/:inviteId",
		{
			preHandler: [isOrgOwnerOrAdmin],
		},
		async (request, reply) => {
			const { orgId, inviteId } = request.params as {
				orgId: string;
				inviteId: string;
			};

			const invitation = await db.invitation.findFirst({
				where: {
					id: inviteId,
					organizationId: orgId,
				},
			});

			if (!invitation) {
				return reply.status(404).send({
					error: "Not Found",
					message: "Invitation not found",
					code: "INVITATION_NOT_FOUND",
				});
			}

			await db.invitation.delete({
				where: { id: inviteId },
			});

			return reply.status(200).send({
				message: "Invitation cancelled successfully",
			});
		}
	);

	// Resend invitation (Owner/Admin)
	fastify.post(
		"/api/orgs/:orgId/invites/:inviteId/resend",
		{
			preHandler: [isOrgOwnerOrAdmin],
		},
		async (request, reply) => {
			const { orgId, inviteId } = request.params as {
				orgId: string;
				inviteId: string;
			};

			const invitation = await db.invitation.findFirst({
				where: {
					id: inviteId,
					organizationId: orgId,
				},
			});

			if (!invitation) {
				return reply.status(404).send({
					error: "Not Found",
					message: "Invitation not found",
					code: "INVITATION_NOT_FOUND",
				});
			}

			// Update expiration (extend by 7 days)
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + 7);

			const updatedInvitation = await db.invitation.update({
				where: { id: inviteId },
				data: {
					expiresAt,
					status: "pending",
				},
			});

			return reply.status(200).send({
				message: "Invitation resent successfully",
				invitation: {
					id: updatedInvitation.id,
					email: updatedInvitation.email,
					role: updatedInvitation.role,
					status: updatedInvitation.status,
					expiresAt: updatedInvitation.expiresAt,
				},
			});
		}
	);

	// List members (Owner/Admin)
	fastify.get(
		"/api/orgs/:orgId/members",
		{
			preHandler: [isOrgOwnerOrAdmin],
		},
		async (request, reply) => {
			const { orgId } = request.params as { orgId: string };

			const members = await db.member.findMany({
				where: { organizationId: orgId },
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
							emailVerified: true,
						},
					},
				},
				orderBy: { createdAt: "desc" },
			});

			return reply.status(200).send({
				members: members.map((m) => ({
					id: m.id,
					userId: m.userId,
					role: m.role,
					user: m.user,
					createdAt: m.createdAt,
				})),
			});
		}
	);

	// Remove member (Owner/Admin)
	fastify.delete(
		"/api/orgs/:orgId/members/:userId",
		{
			preHandler: [isOrgOwnerOrAdmin],
		},
		async (request, reply) => {
			const { orgId, userId } = request.params as {
				orgId: string;
				userId: string;
			};

			const member = await db.member.findFirst({
				where: {
					organizationId: orgId,
					userId,
				},
			});

			if (!member) {
				return reply.status(404).send({
					error: "Not Found",
					message: "Member not found",
					code: "MEMBER_NOT_FOUND",
				});
			}

			// Prevent removing the last owner
			if (member.role === "OWNER") {
				const ownerCount = await db.member.count({
					where: {
						organizationId: orgId,
						role: "OWNER",
					},
				});

				if (ownerCount <= 1) {
					return reply.status(400).send({
						error: "Bad Request",
						message: "Cannot remove the last owner of the organization",
						code: "LAST_OWNER",
					});
				}
			}

			await db.member.delete({
				where: { id: member.id },
			});

			return reply.status(200).send({
				message: "Member removed successfully",
			});
		}
	);
}
