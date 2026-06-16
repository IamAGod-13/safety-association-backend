import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
    @ApiPropertyOptional({ example: 'new@test.com' })
    @IsOptional()
    @IsString()
    email?: string;

    @ApiPropertyOptional({ example: 'John Doe' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: '1234567' })
    @IsOptional()
    @IsString()
    @MinLength(6)
    password?: string;
}