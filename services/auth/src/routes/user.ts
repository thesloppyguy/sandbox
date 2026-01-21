import type { FastifyInstance } from "fastify";
import { db } from "../core/db";
import { isAuth, type AuthenticatedRequest } from "../core/handler/auth";
import { isOrgMember } from "../core/handler/org";

export async function userRoutes(fastify: FastifyInstance) {
	// Get current user info
	fastify.get(
		"/api/user/me",
		{
			preHandler: [isAuth],
		},
		async (request, reply) => {
			const authenticatedRequest = request as AuthenticatedRequest;

			const user = await db.user.findUnique({
				where: { id: authenticatedRequest.user.id },
				include: {
					members: {
						include: {
							organization: {
								select: {
									id: true,
									name: true,
									slug: true,
									logo: true,
								},
							},
						},
					},
					_count: {
						select: {
							members: true,
							sessions: true,
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

			// Get active organization from session
			let activeOrganizationId: string | null = null;

			try {
				// Get session token from cookies
				const cookies = request.headers.cookie || "";
				const sessionTokenMatch = cookies.match(/auth\.session_token=([^;]+)/);
				
				if (sessionTokenMatch) {
					const sessionToken = decodeURIComponent(sessionTokenMatch[1]);
					const dbSession = await db.session.findFirst({
						where: {
							token: sessionToken,
							userId: user.id,
						},
						select: {
							activeOrganizationId: true,
						},
					});

					activeOrganizationId = dbSession?.activeOrganizationId || null;
				}
			} catch (error) {
				// If session retrieval fails, just continue without active org
				request.log?.warn("Failed to get active organization from session:", error);
			}

			return reply.status(200).send({
				user: {
					id: user.id,
					name: user.name,
					email: user.email,
					emailVerified: user.emailVerified,
					role: user.role,
					image: user.image,
					createdAt: user.createdAt,
					updatedAt: user.updatedAt,
					organizations: user.members.map((m) => ({
						id: m.id,
						role: m.role,
						organization: m.organization,
						createdAt: m.createdAt,
					})),
					activeOrganizationId,
					organizationCount: user._count.members,
					sessionCount: user._count.sessions,
				},
			});
		}
	);

	// Get user's organizations
	fastify.get(
		"/api/user/orgs",
		{
			preHandler: [isAuth],
		},
		async (request, reply) => {
			const authenticatedRequest = request as AuthenticatedRequest;

			const members = await db.member.findMany({
				where: { userId: authenticatedRequest.user.id },
				include: {
					organization: {
						select: {
							id: true,
							name: true,
							slug: true,
							logo: true,
							createdAt: true,
							_count: {
								select: {
									members: true,
								},
							},
						},
					},
				},
				orderBy: { createdAt: "desc" },
			});

			return reply.status(200).send({
				organizations: members.map((m) => ({
					memberId: m.id,
					role: m.role,
					joinedAt: m.createdAt,
					organization: {
						...m.organization,
						memberCount: m.organization._count.members,
					},
				})),
			});
		}
	);

	// Get organization details (if member)
	fastify.get(
		"/api/user/orgs/:orgId",
		{
			preHandler: [isOrgMember()],
		},
		async (request, reply) => {
			const { orgId } = request.params as { orgId: string };

			const organization = await db.organization.findUnique({
				where: { id: orgId },
				include: {
					_count: {
						select: {
							members: true,
							invitations: true,
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
					memberCount: organization._count.members,
					invitationCount: organization._count.invitations,
				},
			});
		}
	);
}
