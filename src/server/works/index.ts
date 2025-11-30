import { MaxiumPoints, MiniumPoints } from '../../config';
import { usersCollection, votesCollection } from '../database';
import { Fail, Ok } from '../utils/def';

export async function vote(workId: string, points: number, userId: string)
{
    if (points < MiniumPoints || points > MaxiumPoints)
    {
        return Fail(`评分必须在 ${MiniumPoints} 到 ${MaxiumPoints} 之间`);
    }
    votesCollection.insertOne({
        workId: workId,
        points: points,
        userId: userId,
        timestamp: Math.floor(Date.now() / 1000),
    });
    return Ok('评分已记录');
}

export async function queryVote(workId: string)
{
    const votes = await votesCollection.find({ workId }).toArray();
    const latestVotesMap = new Map<string, any>();
    for (const v of votes)
    {
        const existing = latestVotesMap.get(v.userId);
        if (!existing || v.timestamp > existing.timestamp)
        {
            latestVotesMap.set(v.userId, v);
        }
    }
    const detail = Array.from(latestVotesMap.values());
    if (detail.length === 0)
    {
        return { avg: 0, vari: 0, std: 0, count: 0, detail: [] };
    }
    const userIds = detail.map(v => v.userId);
    const users = await usersCollection.find({ userId: { $in: userIds } }).toArray();
    const userWeightMap = new Map<string, number>();
    for (const u of users)
    {
        userWeightMap.set(u.userId, u.weight);
    }
    const groups = new Map<number, number[]>();
    for (const v of detail)
    {
        const weight = userWeightMap.get(v.userId) ?? 0;
        if (!groups.has(weight))
        {
            groups.set(weight, []);
        }
        groups.get(weight)!.push(v.points);
    }
    let numerator = 0;
    let totalWeight = 0;
    for (const [weight, pointsArray] of groups)
    {
        const groupSum = pointsArray.reduce((sum, p) => sum + p, 0);
        const p_i = groupSum / pointsArray.length;
        const w_i = weight;
        numerator += p_i * w_i;
        totalWeight += w_i;
    }
    const avg = totalWeight > 0 ? numerator / totalWeight : 0;
    const rawAvg = detail.reduce((sum, v) => sum + v.points, 0) / detail.length;
    const vari = detail.reduce((sum, v) => sum + Math.pow(v.points - rawAvg, 2), 0) / detail.length;
    const std = Math.sqrt(vari);
    const count = detail.length;
    return { avg, vari, std, count, detail };
}