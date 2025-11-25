import { init, showSuccess, toUserName } from './utils/base';

init('Leaderboard', false);

const listBody = document.getElementById('lb-body') as HTMLDivElement;
const ROW_HEIGHT = 60; // 与 CSS 中的 height 保持一致

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
    // 1. 如果正在更新，则标记"需要再更新一次"，然后直接返回 (防抖/节流)
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
        // 2. 如果在更新期间又有新请求进来，递归再次执行
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
    // 注意：这里可能会有大量的并发请求，量大时建议后端改为一次性返回所有作品分数的接口
    const results: RankItem[] = await Promise.all(works.map(async (work) =>
    {
        // 为了防止界面卡顿，可以考虑在这里不做网络请求，而是让后端广播时带上分数
        // 但为了兼容现有逻辑，我们继续 fetch
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

        // 如果是新作品，创建 DOM
        if (!row)
        {
            row = document.createElement('div');
            row.className = 'lb-row';
            // 初始位置放在列表最底部，产生"飞入"效果
            row.style.transform = `translateY(${(results.length) * ROW_HEIGHT}px)`;
            row.innerHTML = `
                <div class="text-center font-bold rank-txt"></div>
                <div class="title-txt" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></div>
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

        // === 核心动画逻辑 ===
        // 直接设置 translateY 到目标位置
        // CSS transition 会自动处理平滑移动
        const targetTop = index * ROW_HEIGHT;
        row.style.transform = `translateY(${targetTop}px)`;

        // 确保 z-index 正确，防止遮挡
        row.style.zIndex = '1';
    });

    // 4.2 清理已删除的作品
    domCache.forEach((row, id) =>
    {
        if (!activeIds.has(id))
        {
            // 淡出移除
            row.style.opacity = '0';
            setTimeout(() =>
            {
                row.remove();
                domCache.delete(id);
            }, 600); // 等待动画结束
        }
    });

    // 4.3 设置容器高度
    // 因为子元素是绝对定位，父元素高度会塌陷，必须手动撑开
    listBody.style.height = `${results.length * ROW_HEIGHT}px`;
}


// ==========================================
// 初始化与事件监听
// ==========================================

// 首次加载
triggerUpdate();

// WebSocket
const ws = new WebSocket(`${window.location.protocol == 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/leaderboard`);

ws.onopen = () => console.log('Leaderboard WS Connected');

ws.onmessage = async (event) =>
{
    const data = JSON.parse(event.data) as { type: string, data: string };
    if (data.type == 'vote')
    {
        // 收到消息，触发带锁的更新
        triggerUpdate();

        // 只有当不是正在高频更新时，才弹窗提示，避免弹窗刷屏
        if (!pendingUpdate)
        {
            showSuccess(`用户 ${await toUserName(data.data)} 提交了新的评分！`);
        }
    }
}