import { init, showSuccess, toUserName, type Res } from './utils/base';

init('Leaderboard', false);

const tbody = document.getElementById('leaderboard-body') as HTMLTableSectionElement;

interface Work
{
    title: string;
    workId: string;
}

interface VoteData
{
    avg: number;
    vari: number;
    std: number;
    count: number;
    detail: any[];
}

async function updateLeaderboard()
{
    const usersCount = await fetch('/api/user_count').then(res => res.json()).then((data: Res) =>
    {
        if (!data.success)
        {
            console.error('Failed to fetch user count:', data.data);
            return 0;
        }
        return parseInt(data.data as string, 10);
    })
    const worksRes = await fetch('/api/list_works').then(res => res.json()) as Res;
    if (!worksRes.success)
    {
        console.error('Failed to fetch works:', worksRes.data);
        return;
    }
    const works = worksRes.data as unknown as Work[];
    const results = await Promise.all(works.map(async (work) =>
    {
        const voteRes = await fetch('/api/query_vote?workId=' + work.workId).then(res => res.json()) as { success: boolean, data: VoteData };
        if (!voteRes.success)
        {
            return { title: work.title, score: 0, vari: 0, std: 0, count: 0 };
        }
        return { title: work.title, score: voteRes.data.avg, vari: voteRes.data.vari, std: voteRes.data.std, count: voteRes.data.count };
    }));
    results.sort((a, b) => b.score - a.score);
    if (tbody)
    {
        tbody.innerHTML = '';
        results.forEach((item, index) =>
        {
            const row = document.createElement('tr');

            const rankCell = document.createElement('td');
            rankCell.textContent = (index + 1).toString();
            row.appendChild(rankCell);

            const titleCell = document.createElement('td');
            titleCell.textContent = item.title;
            row.appendChild(titleCell);

            const scoreCell = document.createElement('td');
            scoreCell.textContent = item.score.toFixed(2);
            row.appendChild(scoreCell);

            /* const variCell = document.createElement('td');
            variCell.textContent = item.vari.toFixed(2);
            row.appendChild(variCell); */

            const countCell = document.createElement('td');
            countCell.textContent = `${item.count} / ${usersCount} (${((item.count / usersCount) * 100).toFixed(2)}%)`;
            row.appendChild(countCell);

            tbody.appendChild(row);
        });
    }
}

updateLeaderboard();

const ws = new WebSocket(`${window.location.protocol == 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/leaderboard`);

ws.onmessage = async (event) =>
{
    const data = JSON.parse(event.data) as { type: string, data: string };
    if (data.type == 'vote')
    {
        updateLeaderboard();
        showSuccess(`用户 ${await toUserName(data.data)} 提交了新的评分！`);
    }
}