import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyPrisma from '@joggr/fastify-prisma';
import helmet from "@fastify/helmet";
import { env } from "./config/env";
import { loggingConfig } from "./config/logging";
import { auth } from "./core/auth";
import { db } from "./core/db";
import { authRoutes } from "./routes/auth";
import { orgRoutes } from "./routes/org";
import { rootRoutes } from "./routes/root";
import { userRoutes } from "./routes/user";


const fastify = Fastify({
	logger: loggingConfig[env.NODE_ENV],
});

fastify.register(helmet)

fastify.register(fastifyCors, {
	origin: env.APP_URL,
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allowedHeaders: [
		"Content-Type",
		"Authorization",
		"X-Requested-With"
	],
	credentials: true,
	maxAge: 86400
});



fastify.register(fastifyPrisma, { client: db });

// Register custom routes
fastify.register(authRoutes);
fastify.register(orgRoutes);
fastify.register(rootRoutes);
fastify.register(userRoutes);

fastify.route({
	method: ["GET", "POST"],
	url: "/api/auth/*",
	async handler(request, reply) {
		try {
			const url = new URL(request.url, `http://${request.headers.host}`);

			const headers = new Headers();
			Object.entries(request.headers).forEach(([key, value]) => {
				if (value) headers.append(key, value.toString());
			});
			const req = new Request(url.toString(), {
				method: request.method,
				headers,
				...(request.body ? { body: JSON.stringify(request.body) } : {}),
			});
			const response = await auth.handler(req);

			reply.status(response.status);
			response.headers.forEach((value, key) => reply.header(key, value));
			reply.send(response.body ? await response.text() : null);

		} catch (error) {
			fastify.log.error("Authentication Error: " + error);
			reply.status(500).send({
				error: "Internal authentication error",
				code: "AUTH_FAILURE"
			});
		}
	}
});

fastify.get("/ping", (_request, reply) => {
	reply.send({ message: "pong" });
});


fastify.listen({ port: 3000, host: "0.0.0.0" }, (err, address) => {
	if (err) {
		fastify.log.error(err);
		process.exit(1);
	}
	fastify.log.info(`server listening on ${address}`);
});
