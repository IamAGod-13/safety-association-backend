import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
    constructor(private prisma: PrismaService) { }

    async log(data: {
        userId?: string;
        action: string;
        entity?: string;
        entityId?: string;
        metadata?: any;
        ip?: string;
    }) {
        return this.prisma.auditLog.create({
            data: {
                userId: data.userId,
                action: data.action,
                entity: data.entity,
                entityId: data.entityId,
                metadata: data.metadata,
                ip: data.ip,
            },
        });
    }
    async findAll(query: any) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;

        const skip = (page - 1) * limit;

        const logs = await this.prisma.auditLog.findMany({
            skip,
            take: limit,
            orderBy: {
                createdAt: 'desc',
            },
        });

        const total = await this.prisma.auditLog.count();

        return {
            data: logs,
            pagination: {
                total,
                page,
                lastPage: Math.ceil(total / limit),
            },
        };
    }
}