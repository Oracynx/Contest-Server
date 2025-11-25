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
