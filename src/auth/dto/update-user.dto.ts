import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
    @ApiPropertyOptional({ example: 'newEmail@test.com' })
    @IsOptional()
    @IsString()
    email?: string;

    @ApiPropertyOptional({ example: 'John Doe' })
    @IsOptional()
    @IsString()
    name?: string;
}