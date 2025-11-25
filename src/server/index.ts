import Elysia from 'elysia';
import { auth, tryLogin } from './auth/utils';
import { messagesCollection, usersCollection, worksCollection } from './database';
import { Fail, Ok } from './utils/def';
import { queryVote, vote } from './works';
import type { ServerWebSocket } from 'bun';

const ClientSet = new Set<ServerWebSocket<any>>();

async function broadcastLeaderboardUpdate()
{
    const message = JSON.stringify({ type: 'vote', data: '' });
    for (const client of ClientSet)
    {
        client.send(message);
    }
}

export const serverApp = new Elysia()
    .group('/ws', (app) => app
        .ws('/leaderboard', {
            open(ws)
            {
                ClientSet.add(ws.raw as ServerWebSocket<any>);
            },
            close(ws)
            {
                ClientSet.delete(ws.raw as ServerWebSocket<any>);
            }
        })
    )
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
            if (!await auth(userId))
            {
                return Fail('Authentication failed');
            }
            if (Math.floor(data.points) !== data.points)
            {
                return Fail('Points must be an integer');
            }
            broadcastLeaderboardUpdate();
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
            if (!await auth(userId))
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
        .get('/user_info', async (ctx) =>
        {
            const data = ctx.query as { userId: string };
            const userId = data.userId;
            if (!await auth(userId))
            {
                return Fail('User not found');
            }
            const user = await usersCollection.findOne({ userId }) as { username: string, password: string, userId: string, _id?: unknown };
            return Ok(user.username);
        })
        .get('/user_count', async () =>
        {
            const users = await usersCollection.countDocuments();
            return Ok(users.toString());
        })
    )