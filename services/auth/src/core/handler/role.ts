import type { FastifyRequest, FastifyReply } from "fastify";
import { isAuth, type AuthenticatedRequest } from "./auth";

export type UserRole = "OWNER" | "ADMIN" | "USER";

/**
 * Role hierarchy for permission checking
 * Higher roles inherit permissions from lower roles
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
    USER: 1,
    ADMIN: 2,
    OWNER: 3,
};

/**
 * Prehandler factory to check if user has required role(s)
 * @param allowedRoles - Array of roles that are allowed to access the route
 * @returns Fastify preHandler function
 */
export function hasRole(...allowedRoles: UserRole[]) {
    return async (
        request: FastifyRequest,
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

        const userRole = authenticatedRequest.user.role.toUpperCase() as UserRole;

        // Check if user's role is in the allowed roles
        if (!allowedRoles.includes(userRole)) {
            reply.status(403).send({
                error: "Forbidden",
                message: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
                code: "FORBIDDEN",
            });
            return;
        }
    };
}

/**
 * Prehandler to check if user is an Admin
 */
export const isAdmin = hasRole("ADMIN");

/**
 * Prehandler to check if user is a Manager or higher
 */
export const isManager = hasRole("OWNER", "ADMIN");

/**
 * Prehandler to check if user is an Owner or higher
 */
export const isOwner = hasRole("OWNER", "ADMIN");

/**
 * Prehandler to check if user is a User or higher (essentially just authenticated)
 * This is useful for routes that require any authenticated user
 */
export const isUser = hasRole("USER", "OWNER", "ADMIN");

/**
 * Prehandler factory that checks if user has minimum role level
 * @param minimumRole - Minimum role required (hierarchy-based)
 * @returns Fastify preHandler function
 */
export function hasMinimumRole(minimumRole: UserRole) {
    return async (
        request: FastifyRequest,
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

        const userRole = authenticatedRequest.user.role.toUpperCase() as UserRole;
        const userRoleLevel = ROLE_HIERARCHY[userRole] || 0;
        const minimumRoleLevel = ROLE_HIERARCHY[minimumRole];

        if (userRoleLevel < minimumRoleLevel) {
            reply.status(403).send({
                error: "Forbidden",
                message: `Access denied. Minimum role required: ${minimumRole}`,
                code: "FORBIDDEN",
            });
            return;
        }
    };
}
