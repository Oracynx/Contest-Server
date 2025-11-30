import { randomUUIDv7 } from 'bun';
import { SkipPasswordCheck } from '../../config';
import { usersCollection } from '../database';
import { Fail, Ok } from '../utils/def';

export async function registerUser(user: { username: string, password: string, weight: number })
{
    if (await usersCollection.findOne({ username: user.username }))
    {
        return Fail('用户已存在');
    }
    const userId = randomUUIDv7();
    await usersCollection.insertOne({ username: user.username, password: user.password, userId, weight: user.weight });
    return Ok(userId);
}

export async function tryLogin(userinfo: { username: string, password: string })
{
    const user = await usersCollection.findOne({ username: userinfo.username })
    if (!user)
    {
        return Fail('用户未找到');
    }
    if (!SkipPasswordCheck && user.password !== userinfo.password)
    {
        return Fail('密码错误');
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