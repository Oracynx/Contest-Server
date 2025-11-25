import Elysia from 'elysia';
import { SecretKey } from '../config';
import { registerUser } from '../server/auth/utils';
import { usersCollection, worksCollection } from '../server/database';
import { randomUUIDv7 } from 'bun';
import { Ok } from '../server/utils/def';

export const adminApp = new Elysia()
    .group('/admin', (app) => app
        .post('/register', async (ctx) =>
        {
            const token = ctx.headers['x-api-key'];
            if (token != SecretKey)
            {
                return { success: false, data: 'Invalid API Key' };
            }
            const data = ctx.body as { username: string; password: string };
            return await registerUser({ username: data.username, password: data.password });
        })
        .post('/new_work', async (ctx) =>
        {
            const token = ctx.headers['x-api-key'];
            if (token != SecretKey)
            {
                return { success: false, data: 'Invalid API Key' };
            }
            const data = ctx.body as { title: string };
            await worksCollection.insertOne({ title: data.title, workId: randomUUIDv7() });
            return Ok('New work created');
        })
        .post('/remove_users', async (ctx) =>
        {
            const token = ctx.headers['x-api-key'];
            if (token != SecretKey)
            {
                return { success: false, data: 'Invalid API Key' };
            }
            await usersCollection.deleteMany({});
            return Ok('All users removed');
        })
        .post('/remove_works', async (ctx) =>
        {
            const token = ctx.headers['x-api-key'];
            if (token != SecretKey)
            {
                return { success: false, data: 'Invalid API Key' };
            }
            await worksCollection.deleteMany({});
            return Ok('All works removed');
        })
        .get('/list_users', async (ctx) =>
        {
            const token = ctx.headers['x-api-key'];
            if (token != SecretKey)
            {
                return { success: false, data: 'Invalid API Key' };
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
                return { success: false, data: 'Invalid API Key' };
            }
            const works = await worksCollection.find({}).toArray() as Array<{ title: string; workId: string; _id?: unknown }>;
            works.forEach(item =>
            {
                delete item._id;
            })
            return { success: true, data: works };
        })
    );