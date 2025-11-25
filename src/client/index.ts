import staticPlugin from '@elysiajs/static';
import Elysia from 'elysia';

export const clientApp = new Elysia()
    .use(
        staticPlugin({
            prefix: '',
            assets: './static',
        })
    )
    .get('/', () =>
    {
        return Bun.file('./static/index.html');
    })
    .get('/leaderboard', () =>
    {
        return Bun.file('./static/leaderboard.html');
    })
    .get('/login', () =>
    {
        return Bun.file('./static/login.html');
    })
    .get('/vote', () =>
    {
        return Bun.file('./static/vote.html');
    })
    .get('/admin', () =>
    {
        return Bun.file('./static/admin.html');
    })
