import { Controller, Get, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) { }

    /**
     * Get user statistics
     * GET /user/:id/stats
     */
    @UseGuards(AuthGuard('jwt'))
    @Get(':id/stats')
    async getUserStats(@Param('id') id: string) {
        try {
            return await this.userService.getUserStats(id);
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new NotFoundException(`User with ID ${id} not found`);
        }
    }
}
