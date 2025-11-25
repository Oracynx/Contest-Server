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
                return Fail('身份验证失败');
            }
            if (Math.floor(data.points) !== data.points)
            {
                return Fail('评分必须为整数');
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
                return Fail('作品未找到');
            }
            return { success: true, data: await queryVote(workId) };
        })
        .post('/message', async (ctx) =>
        {
            const data = ctx.body as { userId: string, workdId: string, message: string };
            const userId = data.userId;
            if (!await auth(userId))
            {
                return Fail('身份验证失败');
            }
            if (data.message.length > 500)
            {
                return Fail('消息过长');
            }
            await messagesCollection.insertOne({ userId: data.userId, workId: data.workdId, message: data.message });
            return Ok('消息已记录');
        })
        .get('/user_info', async (ctx) =>
        {
            const data = ctx.query as { userId: string };
            const userId = data.userId;
            if (!await auth(userId))
            {
                return Fail('用户未找到');
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