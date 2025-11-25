import { MongoClient } from 'mongodb';
import { DatabaseConfig } from '../../config';

const client = await MongoClient.connect(DatabaseConfig.url);
const db = client.db('Contest');

export const usersCollection = db.collection('Users');
export const worksCollection = db.collection('Works');
export const votesCollection = db.collection('Votes');
export const messagesCollection = db.collection('Messages');