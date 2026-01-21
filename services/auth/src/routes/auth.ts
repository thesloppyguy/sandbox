import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../core/db";
import { isRoot } from "../core/handler/root";
import { activateAccountSchema } from "./schemas";

export async function authRoutes(fastify: FastifyInstance) {
	// Activate account (ROOT only)
	fastify.post(
		"/api/auth/activate",
		{
			preHandler: [isRoot],
			schema: {
				body: activateAccountSchema,
			},
		},
		async (request, reply) => {
			const { userId } = request.body as z.infer<typeof activateAccountSchema>;

			const user = await db.user.findUnique({
				where: { id: userId },
			});

			if (!user) {
				return reply.status(404).send({
					error: "Not Found",
					message: "User not found",
					code: "USER_NOT_FOUND",
				});
			}

			// Activate the account by removing ban
			const updatedUser = await db.user.update({
				where: { id: userId },
				data: {
					banned: false,
					banReason: null,
					banExpires: null,
				},
				select: {
					id: true,
					email: true,
					name: true,
					banned: true,
				},
			});

			return reply.status(200).send({
				message: "Account activated successfully",
				user: updatedUser,
			});
		}
	);
}
