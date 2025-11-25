import Elysia from 'elysia';
import { SecretKey } from '../config';
import { registerUser } from '../server/auth/utils';
import { messagesCollection, usersCollection, votesCollection, worksCollection } from '../server/database';
import { randomUUIDv7 } from 'bun';
import { Ok } from '../server/utils/def';
import { broadcastVoteDefaultUpdate } from '../server';

export let defaultWork = 'none';

export const adminApp = new Elysia()
    .group('/admin', (app) => app
        .post('/register', async (ctx) =>
        {
            const token = ctx.headers['x-api-key'];
            if (token != SecretKey)
            {
                return { success: false, data: '未授权的密钥' };
            }
            const data = ctx.body as { username: string; password: string };
            return await registerUser({ username: data.username, password: data.password });
        })
        .post('/new_work', async (ctx) =>
        {
            const token = ctx.headers['x-api-key'];
            if (token != SecretKey)
            {
                return { success: false, data: '未授权的密钥' };
            }
            const data = ctx.body as { title: string };
            await worksCollection.insertOne({ title: data.title, workId: randomUUIDv7() });
            return Ok('新的作品被创建');
        })
        .post('/remove_users', async (ctx) =>
        {
            const token = ctx.headers['x-api-key'];
            if (token != SecretKey)
            {
                return { success: false, data: '未授权的密钥' };
            }
            await usersCollection.deleteMany({});
            return Ok('已删除所有用户');
        })
        .post('/remove_works', async (ctx) =>
        {
            const token = ctx.headers['x-api-key'];
            if (token != SecretKey)
            {
                return { success: false, data: '未授权的密钥' };
            }
            await worksCollection.deleteMany({});
            return Ok('已删除所有作品');
        })
        .post('/remove_votes', async (ctx) =>
        {
            const token = ctx.headers['x-api-key'];
            if (token != SecretKey)
            {
                return { success: false, data: '未授权的密钥' };
            }
            const { votesCollection } = await import('../server/database');
            await votesCollection.deleteMany({});
            return Ok('已删除所有投票');
        })
        .post('/remove_messages', async (ctx) =>
        {
            const token = ctx.headers['x-api-key'];
            if (token != SecretKey)
            {
                return { success: false, data: '未授权的密钥' };
            }
            const { messagesCollection } = await import('../server/database');
            await messagesCollection.deleteMany({});
            return Ok('已删除所有留言');
        })
        .get('/list_users', async (ctx) =>
        {
            const token = ctx.headers['x-api-key'];
            if (token != SecretKey)
            {
                return { success: false, data: '未授权的密钥' };
            }
            const users = await usersCollection.find({}).toArray() as Array<{ username: string, password?: string; userId: string; _id?: unknown }>;
            users.forEach(item =>
            {
                delete item.password;
                delete item._id;
            })
            return { success: true, data: users };
        })
        .get('/list_works', async (ctx) =>
        {
            const token = ctx.headers['x-api-key'];
            if (token != SecretKey)
            {
                return { success: false, data: '未授权的密钥' };
            }
            const works = await worksCollection.find({}).toArray() as Array<{ title: string; workId: string; _id?: unknown }>;
            works.forEach(item =>
            {
                delete item._id;
            })
            return { success: true, data: works };
        })
        .get('/list_votes', async (ctx) =>
        {
            const token = ctx.headers['x-api-key'];
            if (token != SecretKey)
            {
                return { success: false, data: '未授权的密钥' };
            }
            const votes = await votesCollection.find({}).toArray() as Array<{ workId: string; userId: string; points: number; _id?: unknown }>;
            votes.forEach(item =>
            {
                delete item._id;
            })
            return { success: true, data: votes };
        })
        .get('/list_messages', async (ctx) =>
        {
            const token = ctx.headers['x-api-key'];
            if (token != SecretKey)
            {
                return { success: false, data: '未授权的密钥' };
            }
            const messages = await messagesCollection.find({}).toArray() as Array<{ workId: string; userId: string; message: string; _id?: unknown }>;
            messages.forEach(item =>
            {
                delete item._id;
            })
            return { success: true, data: messages };
        })
        .post('/set_default_work', async (ctx) =>
        {
            const token = ctx.headers['x-api-key'];
            if (token != SecretKey)
            {
                return { success: false, data: '未授权的密钥' };
            }
            const data = ctx.body as { workId: string };
            await broadcastVoteDefaultUpdate(data.workId);
            defaultWork = data.workId;
            return Ok('已将所有用户的作品切换到' + data.workId);
        })
    );