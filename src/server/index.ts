import Elysia from 'elysia';
import { auth, tryLogin } from './auth/utils';
import { messagesCollection, worksCollection } from './database';
import { Fail, Ok } from './utils/def';
import { queryVote, vote } from './works';

export const serverApp = new Elysia()
    .group('/api', (app) => app
        .post('/login', async (ctx) =>
        {
            const data = ctx.body as { username: string; password: string };
            return await tryLogin({ username: data.username, password: data.password });
        })
        .get('/list_works', async () =>
        {
            const works = await worksCollection.find({}).toArray() as Array<{ title: string; workId: string; _id?: unknown }>;
            works.forEach(item =>
            {
                delete item._id;
            })
            return { success: true, data: works };
        })
        .post('/vote', async (ctx) =>
        {
            const data = ctx.body as { workId: string, points: number, userId: string };
            const userId = data.userId;
            if (!auth(userId))
            {
                return Fail('Authentication failed');
            }
            if (Math.floor(data.points) !== data.points)
            {
                return Fail('Points must be an integer');
            }
            return await vote(data.workId, data.points, data.userId);
        })
        .get('/query_vote', async (ctx) =>
        {
            const data = ctx.query as { workId: string };
            const workId = data.workId;
            const work = await worksCollection.findOne({ workId });
            if (!work)
            {
                return Fail('Work not found');
            }
            return { success: true, data: await queryVote(workId) };
        })
        .post('/message', async (ctx) =>
        {
            const data = ctx.body as { userId: string, workdId: string, message: string };
            const userId = data.userId;
            if (!auth(userId))
            {
                return Fail('Authentication failed');
            }
            if (data.message.length > 500)
            {
                return Fail('Message too long');
            }
            await messagesCollection.insertOne({ userId: data.userId, workId: data.workdId, message: data.message });
            return Ok('Message recorded');
        })
    )