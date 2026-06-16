import {
    Injectable,
    UnauthorizedException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwt: JwtService,
        private config: ConfigService,
        private auditService: AuditService,
        private mailService: MailService,
        // اگر AuditService داری بعداً اینو اضافه کن:
        // private auditService: AuditService,
    ) { }

    // =========================
    // TOKENS
    // =========================
    private generateTokens(user: any) {
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
        };

        const accessToken = this.jwt.sign(payload, {
            secret: this.config.get('JWT_ACCESS_SECRET'),
            expiresIn: '15m',
        });

        const refreshToken = this.jwt.sign(payload, {
            secret: this.config.get('JWT_REFRESH_SECRET'),
            expiresIn: '7d',
        });

        return { accessToken, refreshToken };
    }

    // =========================
    // REGISTER
    // =========================
    async register(email: string, password: string) {
        const exists = await this.prisma.user.findUnique({
            where: { email },
        });

        if (exists) {
            throw new ConflictException('Email already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await this.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
            },
        });

        const emailToken = crypto.randomBytes(32).toString('hex');

        const expires = new Date(Date.now() + 60 * 60 * 1000);

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerifyToken: emailToken,
                emailVerifyExpires: expires,
            },
        });
        await this.mailService.sendEmail(
            email,
            'Verify your email',
            'Your verification token: ${ emailToken }',
        );
        await this.auditService.log({
            userId: user.id,
            action: 'REGISTER',
            entity: 'AUTH',
        });

        return {
            message: 'User created. Verify email.',
            verifyToken: emailToken,
        };
    }

    // =========================
    // LOGIN
    // =========================
    async login(email: string, password: string) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user || user.isDeleted) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.emailVerified) {
            throw new UnauthorizedException('Email not verified');
        }

        // 🔐 check lock
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            throw new UnauthorizedException('Account is locked. Try later');
        }

        const isMatch = await bcrypt.compare(password, user.password);

        // ❌ password wrong
        if (!isMatch) {
            const attempts = user.loginAttempts + 1;

            if (attempts >= 5) {
                await this.prisma.user.update({
                    where: { id: user.id },
                    data: {
                        lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
                        loginAttempts: 0,
                    },
                });

                throw new UnauthorizedException(
                    'Too many attempts. Account locked for 15 minutes',
                );
            }

            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    loginAttempts: attempts,
                },
            });

            throw new UnauthorizedException('Invalid credentials');
        }

        // ✅ success login
        const tokens = this.generateTokens(user);

        const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                refreshTokenHash,
                loginAttempts: 0,
                lockedUntil: null,
                lastLoginAt: new Date(),
            },
        });
        await this.auditService.log({
            userId: user.id,
            action: 'LOGIN_SUCCESS',
            entity: 'AUTH',
        });

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name,
            },
        };
    }

    // =========================
    // REFRESH TOKEN
    // =========================
    async refresh(refreshToken: string) {
        try {
            const payload = this.jwt.verify(refreshToken, {
                secret: this.config.get('JWT_REFRESH_SECRET'),
            });

            const user = await this.prisma.user.findUnique({
                where: { id: payload.id },
            });
            if (!user || !user.refreshTokenHash) {
                throw new UnauthorizedException('Login again');
            }

            const isValid = await bcrypt.compare(
                refreshToken,
                user.refreshTokenHash,
            );

            if (!isValid) {
                throw new UnauthorizedException('Invalid token');
            }

            const tokens = this.generateTokens(user);

            const newHash = await bcrypt.hash(tokens.refreshToken, 10);

            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    refreshTokenHash: newHash,
                },
            });

            return {
                ...tokens,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                },
            };
        } catch {
            throw new UnauthorizedException('Refresh token expired or invalid');
        }
    }

    // =========================
    // LOGOUT
    // =========================
    async logout(userId: string) {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                refreshTokenHash: null,
            },
        });

        return {
            message: 'Logged out successfully',
        };
    }

    // =========================
    // FORGOT PASSWORD
    // =========================
    async forgotPassword(body: ForgotPasswordDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: body.email },
        });

        if (!user) {
            return {
                message: 'If user exists, reset link sent',
            };
        }

        const token = crypto.randomBytes(32).toString('hex');

        const expires = new Date(Date.now() + 15 * 60 * 1000);

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: token,
                resetPasswordExpires: expires,
            },
        });

        return {
            token,
            expires,
        };
    }

    // =========================
    // RESET PASSWORD
    // =========================
    async resetPassword(body: ResetPasswordDto) {
        const user = await this.prisma.user.findFirst({
            where: {
                resetPasswordToken: body.token,
            },
        });

        if (!user) {
            throw new BadRequestException('Invalid token');
        }

        if (
            !user.resetPasswordExpires ||
            user.resetPasswordExpires < new Date()
        ) {
            throw new BadRequestException('Token expired');
        }

        const hashedPassword = await bcrypt.hash(body.password, 10);

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null,
            },
        });

        return {
            message: 'Password reset successful',
        };
    }

    // =========================
    // VERIFY EMAIL
    // =========================
    async verifyEmail(token: string) {
        const user = await this.prisma.user.findFirst({
            where: { emailVerifyToken: token },
        });

        if (!user) {
            throw new BadRequestException('Invalid token');
        }

        if (
            !user.emailVerifyExpires ||
            user.emailVerifyExpires < new Date()
        ) {
            throw new BadRequestException('Token expired');
        }

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                emailVerifyToken: null,
                emailVerifyExpires: null,
            },
        });

        return {
            message: 'Email verified successfully',
        };
    }
    async deleteUser(targetUserId: string, adminId: string) {
        const user = await this.prisma.user.update({
            where: { id: targetUserId },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
            },
        });

        await this.auditService.log({
            userId: adminId,
            action: 'DELETE_USER',
            entity: 'USER',
            entityId: targetUserId,
        });

        return user;
    }
}