import Elysia from 'elysia';
import { SecretKey } from '../config';
import { registerUser } from '../server/auth/utils';
import { messagesCollection, usersCollection, votesCollection, worksCollection } from '../server/database';
import { randomUUIDv7 } from 'bun';
import { Ok } from '../server/utils/def';
import { broadcastVoteDefaultUpdate } from '../server';
import { mkdir } from 'fs/promises';
import sharp from 'sharp';

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
            return Ok('已将所有用户的作品切换到 ' + data.workId);
        })
        .post('/upload_work_image', async (ctx) =>
        {
            const token = ctx.headers['x-api-key'];
            if (token != SecretKey)
            {
                return { success: false, data: '未授权的密钥' };
            }

            const body = ctx.body as any;
            const image = body.image as File; // 获取上传的文件对象
            const workId = body.workId as string;

            if (!image || !workId)
            {
                return { success: false, data: '缺少图片或作品ID' };
            }

            try
            {
                const dir = 'static/work_images';
                await mkdir(dir, { recursive: true });

                // 1. 将 File 转为 ArrayBuffer
                const arrayBuffer = await image.arrayBuffer();

                // 2. 使用 sharp 处理图片
                // resize(200, 200): 缩放到 200x200 像素
                // fit: 'cover': 保持比例，裁掉多余部分（居中裁剪），确保填满正方形
                const processedBuffer = await sharp(arrayBuffer)
                    .resize(200, 200, {
                        fit: 'cover',
                        position: 'center'
                    })
                    .png({ quality: 80 }) // 转为 PNG，质量 80% (兼顾透明通道和体积)
                    .toBuffer();

                // 3. 保存处理后的 Buffer
                await Bun.write(`${dir}/${workId}.png`, processedBuffer);

                return Ok('图片上传并压缩成功');
            } catch (e)
            {
                console.error('Image processing failed:', e);
                return { success: false, data: '图片处理或保存失败' };
            }
        })
    );