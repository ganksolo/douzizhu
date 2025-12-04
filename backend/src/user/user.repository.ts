import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

/**
 * Phase 20.1: User Repository
 * 
 * Encapsulates database operations for users.
 */
@Injectable()
export class UserRepository {
    constructor(
        @InjectRepository(User)
        private readonly repository: Repository<User>,
    ) { }

    async create(data: Partial<User>): Promise<User> {
        const user = this.repository.create(data);
        return await this.repository.save(user);
    }

    async findById(id: string): Promise<User | null> {
        return await this.repository.findOne({ where: { id } });
    }

    async findByNickname(nickname: string): Promise<User | null> {
        return await this.repository.findOne({ where: { nickname } });
    }

    async update(id: string, data: Partial<User>): Promise<void> {
        await this.repository.update(id, data);
    }

    async save(user: User): Promise<User> {
        return await this.repository.save(user);
    }
}
