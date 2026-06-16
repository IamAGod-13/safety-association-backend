import {
    Controller,
    Get,
    Patch,
    Delete,
    UseGuards,
    Req,
    Body,
    Param,
    Query,
} from '@nestjs/common';

import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';

import { ApiBearerAuth } from '@nestjs/swagger';
import { UserQueryDto } from './dto/user-query.dto';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';

@ApiBearerAuth()
@Controller('users')
export class UserController {
    constructor(private userService: UserService) { }
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions(Permission.USER_DELETE)
    @Delete(':id')
    removeUser(@Param('id') id: string) {
        return this.userService.deleteUser(id);
    }

    // 🔐 تست ادمین
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Get('admin-only')
    getAdminData() {
        return {
            message: 'Welcome Admin 🔥',
        };
    }

    // 👥 همه کاربران (ADMIN + pagination/search)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Get()
    findAll(@Query() query: UserQueryDto) {
        return this.userService.findAll(query);
    }

    // 👤 پروفایل من
    @UseGuards(JwtAuthGuard)
    @Get('me')
    getMyProfile(@Req() req) {
        return this.userService.getMyProfile(req.user.id);
    }

    // ✏️ آپدیت پروفایل من
    @UseGuards(JwtAuthGuard)
    @Patch('me')
    updateMe(@Req() req, @Body() body: UpdateUserDto) {
        return this.userService.updateMe(req.user.id, body);
    }

    // 🗑 حذف کاربر (ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Delete(':id')
    deleteUser(@Param('id') id: string) {
        return this.userService.deleteUser(id);
    }

    // 🔥 ارتقا به ادمین
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Patch(':id/promote')
    promoteToAdmin(@Param('id') id: string) {
        return this.userService.promoteToAdmin(id);
    }

    // 🔐 تغییر پسورد
    @UseGuards(JwtAuthGuard)
    @Patch('change-password')
    changePassword(@Req() req, @Body() body: ChangePasswordDto) {
        return this.userService.changePassword(req.user.id, body);
    }
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Patch(':id/restore')
    restoreUser(@Param('id') id: string) {
        return this.userService.restoreUser(id);
    }
}