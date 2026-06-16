import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';

@Injectable()
export class UserService {
    constructor(private prisma: PrismaService) { }

    // 👥 همه کاربران (pagination + search)
    async findAll(query: UserQueryDto) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const search = query.search || '';

        const skip = (page - 1) * limit;

        const users = await this.prisma.user.findMany({
            where: {
                isDeleted: false,
                email: {
                    contains: search,
                    mode: 'insensitive',
                },
            },
            skip,
            take: limit,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
        });

        const total = await this.prisma.user.count({
            where: {
                isDeleted: false,
                email: {
                    contains: search,
                    mode: 'insensitive',
                },
            },
        });

        return {
            data: users,
            meta: {
                total,
                page,
                lastPage: Math.ceil(total / limit),
            },
        };
    }

    // 👤 کاربر لاگین شده
    findMe(userId: string) {
        return this.prisma.user.findFirst({
            where: {
                id: userId,
                isDeleted: false,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        });
    }

    // ✏️ آپدیت پروفایل
    async updateMe(userId: string, data: UpdateUserDto) {
        const updateData = { ...data };

        delete (updateData as any).role;

        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 10);
        }

        return this.prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        });
    }

    // 🗑 حذف کاربر
    async deleteUser(id: string) {
        return this.prisma.user.update({
            where: { id },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isDeleted: true,
                deletedAt: true,
            },
        });
    }

    // 🔥 ارتقا به ادمین
    async promoteToAdmin(id: string) {
        return this.prisma.user.update({
            where: { id },
            data: { role: 'ADMIN' },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        });
    }

    // 👤 پروفایل من (duplicate safe)
    getMyProfile(userId: string) {
        return this.prisma.user.findUnique({
            where: {
                id: userId,
                isDeleted: false,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        });
    }

    // 🔐 تغییر پسورد
    async changePassword(
        userId: string,
        body: { oldPassword: string; newPassword: string },
    ) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const isMatch = await bcrypt.compare(
            body.oldPassword,
            user.password,
        );

        if (!isMatch) {
            throw new BadRequestException('Old password is wrong');
        }

        const hashedPassword = await bcrypt.hash(
            body.newPassword,
            10,
        );

        return this.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        });
    }
    async restoreUser(id: string) {
        return this.prisma.user.update({
            where: { id },
            data: {
                isDeleted: false,
                deletedAt: null,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isDeleted: true,
            },
        });
    }
}