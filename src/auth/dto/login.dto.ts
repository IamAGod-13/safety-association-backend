import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';

export class LoginDto {
    @ApiProperty({
        example: 'test@test.com',
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        example: '123456',
    })
    @IsString()
    @MinLength(6)
    password: string;

    // (اختیاری - برای آینده: remember me)
    @ApiProperty({
        example: false,
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    rememberMe?: boolean;
}