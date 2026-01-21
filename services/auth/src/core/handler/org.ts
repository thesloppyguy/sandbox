import type { FastifyRequest, FastifyReply } from "fastify";
import { isAuth, type AuthenticatedRequest } from "./auth";
import { db } from "../db";

export type OrgMemberRole = "OWNER" | "ADMIN" | "USER";

/**
 * Prehandler factory to check if user is a member of an organization
 * @param requiredRoles - Optional array of roles that are allowed (default: any role)
 * @returns Fastify preHandler function
 */
export function isOrgMember(...requiredRoles: OrgMemberRole[]) {
	return async (
		request: FastifyRequest<{ Params: { orgId: string } }>,
		reply: FastifyReply
	): Promise<void> => {
		// First ensure user is authenticated
		await isAuth(request, reply);

		// If isAuth already sent a response, stop here
		if (reply.sent) {
			return;
		}

		const authenticatedRequest = request as AuthenticatedRequest;

		if (!authenticatedRequest.user) {
			reply.status(401).send({
				error: "Unauthorized",
				message: "Authentication required",
				code: "UNAUTHORIZED",
			});
			return;
		}

		const { orgId } = request.params;

		if (!orgId) {
			reply.status(400).send({
				error: "Bad Request",
				message: "Organization ID is required",
				code: "MISSING_ORG_ID",
			});
			return;
		}

		// Check if organization exists
		const organization = await db.organization.findUnique({
			where: { id: orgId },
		});

		if (!organization) {
			reply.status(404).send({
				error: "Not Found",
				message: "Organization not found",
				code: "ORG_NOT_FOUND",
			});
			return;
		}

		// Check if user is a member
		const member = await db.member.findFirst({
			where: {
				organizationId: orgId,
				userId: authenticatedRequest.user.id,
			},
		});

		if (!member) {
			reply.status(403).send({
				error: "Forbidden",
				message: "You are not a member of this organization",
				code: "NOT_ORG_MEMBER",
			});
			return;
		}

		// If specific roles are required, check them
		if (requiredRoles.length > 0) {
			const memberRole = member.role.toUpperCase() as OrgMemberRole;
			if (!requiredRoles.includes(memberRole)) {
				reply.status(403).send({
					error: "Forbidden",
					message: `Access denied. Required roles: ${requiredRoles.join(", ")}`,
					code: "INSUFFICIENT_ROLE",
				});
				return;
			}
		}

		// Attach member info to request for use in handlers
		(request as AuthenticatedRequest & { member: typeof member }).member = member;
	};
}

/**
 * Prehandler to check if user is an Owner or Admin of an organization
 */
export const isOrgOwnerOrAdmin = isOrgMember("OWNER", "ADMIN");

/**
 * Prehandler to check if user is an Owner of an organization
 */
export const isOrgOwner = isOrgMember("OWNER");
