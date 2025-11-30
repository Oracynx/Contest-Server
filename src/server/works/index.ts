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
    // 1. 获取该作品的所有投票
    const votes = await votesCollection.find({ workId }).toArray();

    // 2. 筛选每个用户的最新投票 (去重)
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

    // 3. 获取参与投票的用户信息以得到权重
    const userIds = detail.map(v => v.userId);
    const users = await usersCollection.find({ userId: { $in: userIds } }).toArray();

    // 创建 userId -> weight 的映射
    const userWeightMap = new Map<string, number>();
    for (const u of users)
    {
        // 强制转为 Number，防止数据库里存的是字符串 "0.7" 导致计算错误
        const w = Number(u.weight);
        userWeightMap.set(u.userId, isNaN(w) ? 1 : w); // 默认权重设为 1 或 0，视需求而定
    }

    // 4. 按权重分组 (Map<权重值, 分数列表>)
    const groups = new Map<number, number[]>();

    for (const v of detail)
    {
        // 获取该用户的权重
        const weight = userWeightMap.get(v.userId) ?? 1; // 如果找不到用户，默认权重

        if (!groups.has(weight))
        {
            groups.set(weight, []);
        }
        groups.get(weight)!.push(Number(v.points));
    }

    // 5. 计算最终得分
    // 公式: sum(GroupAvg_i * Weight_i) / sum(Weight_i)
    let weightedSum = 0;   // 分子
    let totalUniqueWeight = 0; // 分母 (注意：这里是所有存在的组的权重之和，不是所有人的权重和)

    for (const [weight, pointsArray] of groups)
    {
        // 计算当前权重组的平均分 (GroupAvg_i)
        // 例如 0.7 组: (70 + 75) / 2 = 72.5
        const groupSum = pointsArray.reduce((sum, p) => sum + p, 0);
        const groupAvg = groupSum / pointsArray.length;

        // 累加分子: 72.5 * 0.7
        weightedSum += groupAvg * weight;

        // 累加分母: 0.7
        totalUniqueWeight += weight;
    }

    // 防止除以 0
    const avg = totalUniqueWeight > 0 ? weightedSum / totalUniqueWeight : 0;

    // 6. 计算方差和标准差
    // 依然基于所有原始票数计算统计学方差，反映数据的真实离散程度
    const rawAvg = detail.reduce((sum, v) => sum + v.points, 0) / detail.length;
    const vari = detail.reduce((sum, v) => sum + Math.pow(v.points - rawAvg, 2), 0) / detail.length;
    const std = Math.sqrt(vari);
    const count = detail.length;

    return { avg, vari, std, count, detail };
}