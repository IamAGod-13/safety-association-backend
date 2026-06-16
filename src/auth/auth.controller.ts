import {
    Controller,
    Post,
    Body,
    Get,
    UseGuards,
    Req,
} from '@nestjs/common';

import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto'; // ✅ اضافه شد
import { Role } from './roles.enum';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    // 🟢 Register
    @Post('register')
    register(@Body() body: RegisterDto) {
        return this.authService.register(body.email, body.password);
    }

    // 🟢 Login
    @Post('login')
    login(@Body() body: LoginDto) {
        return this.authService.login(body.email, body.password);
    }

    // 🟢 Refresh Token (FIXED)
    @Post('refresh')
    refresh(@Body() body: RefreshTokenDto) {
        return this.authService.refresh(body.refreshToken);
    }

    // 🟢 Logout
    @Post('logout')
    logout(@Body() body: { userId: string }) {
        return this.authService.logout(body.userId);
    }

    // 🔐 Profile
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get('profile')
    getProfile(@Req() req) {
        return req.user;
    }

    // 🔥 Admin only
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @Get('admin')
    getAdminData() {
        return { message: 'Welcome Admin 🔥' };
    }

    // 🔑 Forgot Password
    @Post('forgot-password')
    forgotPassword(@Body() body: ForgotPasswordDto) {
        return this.authService.forgotPassword(body);
    }

    // 🔑 Reset Password
    @Post('reset-password')
    resetPassword(@Body() body: ResetPasswordDto) {
        return this.authService.resetPassword(body);
    }

    // ✉️ Verify Email
    @Post('verify-email')
    verifyEmail(@Body() body: VerifyEmailDto) {
        return this.authService.verifyEmail(body.token);
    }
}