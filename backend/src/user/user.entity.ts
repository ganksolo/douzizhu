import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum AuthType {
    GUEST = 'guest',
    PASSWORD = 'password',
}

/**
 * Phase 20.1: User Entity
 * 
 * Represents a user in the system.
 */
@Entity('user')
export class User {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: string; // TypeORM handles bigint as string in JS to avoid precision loss

    @Column({ length: 50 })
    nickname: string;

    @Column({ length: 255, default: 'https://via.placeholder.com/150' })
    avatar: string;

    @Column({ type: 'int', default: 1000 })
    coins: number; // Phase 21.3: Game Currency (Score)

    @Column({ length: 255, nullable: true })
    email: string;

    @Column({
        type: 'enum',
        enum: AuthType,
        default: AuthType.GUEST,
    })
    auth_type: AuthType;

    @Column({ name: 'password_hash', nullable: true, select: false })
    passwordHash: string; // Exclude from default selection for security

    @Column({ name: 'last_login', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    lastLogin: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
