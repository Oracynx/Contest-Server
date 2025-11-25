import { randomUUIDv7 } from 'bun';
import { SkipPasswordCheck } from '../../config';
import { usersCollection } from '../database';
import { Fail, Ok } from '../utils/def';

export async function registerUser(user: { username: string, password: string })
{
    if (await usersCollection.findOne({ username: user.username }))
    {
        return Fail('Username already exists');
    }
    const userId = randomUUIDv7();
    await usersCollection.insertOne({ username: user.username, password: user.password, userId });
    return Ok(userId);
}

export async function tryLogin(userinfo: { username: string, password: string })
{
    const user = await usersCollection.findOne({ username: userinfo.username })
    if (!user)
    {
        return Fail('Username does not exist');
    }
    if (!SkipPasswordCheck && user.password !== userinfo.password)
    {
        return Fail('Incorrect password');
    }
    return Ok(user.userId);
}

export async function auth(token: string)
{
    const user = await usersCollection.findOne({ userId: token });
    if (!user)
    {
        return false;
    }
    return true;
}