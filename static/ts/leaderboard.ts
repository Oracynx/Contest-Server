import { init, showSuccess, toUserName } from './utils/base';

init('Leaderboard', false);

const listBody = document.getElementById('lb-body') as HTMLDivElement;
const ROW_HEIGHT = 60; // 必须与 CSS 中的 .lb-row height 保持一致

interface Work
{
    title: string;
    workId: string;
}

interface VoteData
{
    avg: number;
    count: number;
}

interface RankItem
{
    workId: string;
    title: string;
    score: number;
    count: number;
}

// ==========================================
// 状态管理
// ==========================================
const domCache = new Map<string, HTMLDivElement>(); // 复用 DOM
let isUpdating = false;   // 锁：当前是否正在更新
let pendingUpdate = false; // 信号：是否有一个新的更新请求在排队

// ==========================================
// 核心更新逻辑
// ==========================================

// 对外暴露的触发器（加锁入口）
async function triggerUpdate()
{
    if (isUpdating)
    {
        pendingUpdate = true;
        return;
    }
    isUpdating = true;

    try
    {
        await performUpdate();
    } catch (e)
    {
        console.error("Update failed", e);
    } finally
    {
        isUpdating = false;
        if (pendingUpdate)
        {
            pendingUpdate = false;
            triggerUpdate();
        }
    }
}

// 实际执行更新的逻辑
async function performUpdate()
{
    // --- Step 1: 并行获取数据 ---
    const usersCountReq = fetch('/api/user_count').then(res => res.json());
    const worksReq = fetch('/api/list_works').then(res => res.json());

    const [userRes, worksRes] = await Promise.all([usersCountReq, worksReq]);

    let usersCount = 0;
    if (userRes.success) usersCount = parseInt(userRes.data as string, 10);

    if (!worksRes.success) return;
    const works = worksRes.data as unknown as Work[];

    // --- Step 2: 获取所有分数 (并行) ---
    const results: RankItem[] = await Promise.all(works.map(async (work) =>
    {
        try
        {
            const voteRes = await fetch('/api/query_vote?workId=' + work.workId).then(res => res.json()) as { success: boolean, data: VoteData };
            if (!voteRes.success)
            {
                return { workId: work.workId, title: work.title, score: 0, count: 0 };
            }
            return {
                workId: work.workId,
                title: work.title,
                score: voteRes.data.avg,
                count: voteRes.data.count
            };
        } catch (e)
        {
            return { workId: work.workId, title: work.title, score: 0, count: 0 };
        }
    }));

    // --- Step 3: 排序 ---
    results.sort((a, b) => b.score - a.score);

    if (!listBody) return;

    // --- Step 4: 更新 DOM (绝对定位策略) ---

    // 4.1 标记当前活跃的 ID
    const activeIds = new Set<string>();

    results.forEach((item, index) =>
    {
        activeIds.add(item.workId);

        let row = domCache.get(item.workId);
        if (!row)
        {
            row = document.createElement('div');
            row.className = 'lb-row';
            // 初始位置
            row.style.transform = `translateY(${(results.length) * ROW_HEIGHT}px)`;

            // [核心] 构建 HTML 结构
            // 注意：onerror 确保如果没有图片，图片框变透明但占位符还在，防止布局塌陷
            row.innerHTML = `
                <div class="text-center font-bold rank-txt"></div>

                <div class="work-info">
                    <img class="work-thumb"
                         src="/work_images/${item.workId}.png?v=${Date.now()}" 
                         onerror="this.style.opacity='0'" 
                         alt="cover">
                    <div class="title-txt"></div>
                </div>

                <div class="text-center font-bold score-txt"></div>
                <div class="text-center col-hide-mobile count-txt"></div>
            `;

            listBody.appendChild(row);
            domCache.set(item.workId, row);
        }

        // 更新内容
        const rankTxt = row.querySelector('.rank-txt');
        if (rankTxt) rankTxt.textContent = (index + 1).toString();

        const titleTxt = row.querySelector('.title-txt');
        if (titleTxt) titleTxt.textContent = item.title;

        const scoreTxt = row.querySelector('.score-txt');
        if (scoreTxt) scoreTxt.textContent = item.score.toFixed(2);

        const countTxt = row.querySelector('.count-txt');
        if (countTxt) countTxt.textContent = `${item.count} / ${usersCount}`;

        // === 动画 ===
        const targetTop = index * ROW_HEIGHT;
        row.style.transform = `translateY(${targetTop}px)`;
        row.style.zIndex = '1';
    });

    // 4.2 清理
    domCache.forEach((row, id) =>
    {
        if (!activeIds.has(id))
        {
            row.style.opacity = '0';
            setTimeout(() =>
            {
                row.remove();
                domCache.delete(id);
            }, 600);
        }
    });

    // 4.3 设置容器高度
    listBody.style.height = `${results.length * ROW_HEIGHT}px`;
}


// ==========================================
// 初始化与事件监听
// ==========================================
triggerUpdate();

const ws = new WebSocket(`${window.location.protocol == 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/leaderboard`);

ws.onopen = () => console.log('Leaderboard WS Connected');

ws.onmessage = async (event) =>
{
    const data = JSON.parse(event.data) as { type: string, data: string };
    if (data.type == 'vote')
    {
        triggerUpdate();
        if (!pendingUpdate)
        {
            showSuccess(`用户 ${await toUserName(data.data)} 提交了新的评分！`);
        }
    }
}