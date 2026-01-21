import { hash } from "bcryptjs"
import { randomUUID } from "crypto"
import { db } from "@/core/db"
import { env } from "@/config/env"

async function main() {
    console.log("Seeding database...")

    /**
     * -----------------------
     * MANAGER USER
     * -----------------------
     */
    const managerEmail = env.MANAGER_EMAIL

    let manager = await db.user.findUnique({
        where: { email: managerEmail },
    })

    if (!manager) {
        const passwordHash = await hash(env.MANAGER_PASSWORD, 12)
        const userId = randomUUID()
        const accountId = randomUUID()

        manager = await db.user.create({
            data: {
                id: userId,
                name: "Manager",
                email: managerEmail,
                emailVerified: true,
                role: "MANAGER",
                accounts: {
                    create: {
                        id: accountId,
                        accountId: managerEmail,
                        providerId: "credentials",
                        password: passwordHash,
                    },
                },
            },
        })

        console.log("Manager user created")
    } else {
        console.log("Manager already exists")
    }

    const org = await db.organization.upsert({
        where: { slug: "root-organization" },
        update: {},
        create: {
            id: randomUUID(),
            name: "Root Organization",
            slug: "root-organization",
            createdAt: new Date(),
        },
    })

    const existingMember = await db.member.findFirst({
        where: {
            userId: manager.id,
            organizationId: org.id,
        },
    })

    if (existingMember) {
        await db.member.update({
            where: { id: existingMember.id },
            data: { role: "OWNER" },
        })
    } else {
        await db.member.create({
            data: {
                id: randomUUID(),
                userId: manager.id,
                organizationId: org.id,
                role: "OWNER",
                createdAt: new Date(),
            },
        })
    }

    console.log("Root organization seeded")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await db.$disconnect()
    })
