import { MaxiumPoints, MiniumPoints, IgnoreMin, IgnoreMax } from '../../config';
import { votesCollection } from '../database';
import { Fail, Ok } from '../utils/def';

export async function vote(workId: string, points: number, userId: string)
{
    if (points < MiniumPoints || points > MaxiumPoints)
    {
        return Fail(`Points must be between ${MiniumPoints} and ${MaxiumPoints}`);
    }
    votesCollection.insertOne({
        workId: workId,
        points: points,
        userId: userId,
        timestamp: Math.floor(Date.now() / 1000),
    });
    return Ok('Vote recorded');
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
    const sorted = [...detail].sort((a, b) => a.points - b.points);
    const trimmed = sorted.slice(IgnoreMin, sorted.length - IgnoreMax);
    const avg =
        trimmed.length > 0
            ? trimmed.reduce((sum, v) => sum + v.points, 0) / trimmed.length
            : 0;
    const vari =
        trimmed.length > 0
            ? trimmed.reduce((sum, v) => sum + Math.pow(v.points - avg, 2), 0) / trimmed.length
            : 0;
    const std = Math.sqrt(vari);
    const count = detail.length;
    return { avg, vari, std, count, detail };
}