import type { FastifyRequest, FastifyReply } from "fastify";
import { auth } from "../auth";
import { db } from "../db";

export type AuthenticatedRequest = FastifyRequest & {
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
        emailVerified: boolean;
    };
};

/**
 * Prehandler to check if user is authenticated
 * Attaches user information to request.user if authenticated
 */
export async function isAuth(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    try {
        // Convert Fastify request to Web API Request for better-auth
        const url = new URL(request.url, `http://${request.headers.host}`);
        const headers = new Headers();
        Object.entries(request.headers).forEach(([key, value]) => {
            if (value) headers.append(key, value.toString());
        });

        const req = new Request(url.toString(), {
            method: request.method,
            headers,
        });

        // Get session from better-auth
        const session = await auth.api.getSession({ headers: req.headers });

        if (!session || !session.user) {
            reply.status(401).send({
                error: "Unauthorized",
                message: "Authentication required",
                code: "UNAUTHORIZED",
            });
            return;
        }

        // Fetch user from database to get role (additional field)
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                emailVerified: true,
            },
        });

        if (!user) {
            reply.status(401).send({
                error: "Unauthorized",
                message: "User not found",
                code: "UNAUTHORIZED",
            });
            return;
        }

        // Attach user to request
        (request as AuthenticatedRequest).user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role || "USER",
            emailVerified: user.emailVerified || false,
        };
    } catch (error) {
        reply.status(401).send({
            error: "Unauthorized",
            message: "Invalid or expired session",
            code: "UNAUTHORIZED",
        });
    }
}
