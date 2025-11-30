import { MongoClient } from 'mongodb';
import { DatabaseConfig } from '../../config';

const client = await MongoClient.connect(DatabaseConfig.url);
const db = client.db('Contest');

export type userSchema = {
    username: string,
    password: string,
    weight: number,
    userId: string,
}

export type workSchema = {
    title: string,
    workId: string,
}

export type voteSchema = {
    workId: string,
    points: number,
    userId: string,
    timestamp: number,
}

export type messageSchema = {
    workId: string,
    message: string,
    userId: string,
    timestamp: number,
}

export type luckySchema = {
    name: string,
}

export const usersCollection = db.collection<userSchema>('Users');
export const worksCollection = db.collection<workSchema>('Works');
export const votesCollection = db.collection<voteSchema>('Votes');
export const messagesCollection = db.collection<messageSchema>('Messages');
export const luckysCollection = db.collection<luckySchema>('Luckys');