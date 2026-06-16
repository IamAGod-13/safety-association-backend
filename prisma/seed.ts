import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('123456', 10);

    await prisma.user.create({
        data: {
            email: 'admin@test.com',
            password: hashedPassword,
            role: 'ADMIN',
            permissions: [
                'USER_READ',
                'USER_DELETE',
                'AUDIT_READ',
            ],
        },
    });

    console.log('Admin created');
}

main()
    .catch((e) => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });