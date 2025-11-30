import Elysia from 'elysia';
import { clientApp } from './client';
import { serverApp } from './server';
import { adminApp } from './admin';

const app = new Elysia()
    .use(clientApp)
    .use(serverApp)
    .use(adminApp)

app.listen(44555);
