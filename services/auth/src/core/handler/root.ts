import type { FastifyRequest, FastifyReply } from "fastify";
import { isAuth, type AuthenticatedRequest } from "./auth";

/**
 * Prehandler to check if user has ROOT role
 */
export async function isRoot(
	request: FastifyRequest,
	reply: FastifyReply
): Promise<void> {
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

	const userRole = authenticatedRequest.user.role.toUpperCase();

	if (userRole !== "ROOT") {
		reply.status(403).send({
			error: "Forbidden",
			message: "Access denied. ROOT role required",
			code: "FORBIDDEN",
		});
		return;
	}
}
