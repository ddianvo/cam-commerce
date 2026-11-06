import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
export enum Role {
  ADMIN = 'admin',
  STAFF = 'staff',
  CUSTOMER = 'customer',
}
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) email!: string;
  @Column({ select: false }) passwordHash!: string;
  @Column({ type: 'enum', enum: Role, default: Role.CUSTOMER }) role!: Role;
  @Column({ default: 0 }) tokenVersion!: number;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date;
}
