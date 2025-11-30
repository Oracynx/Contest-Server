// lucky.ts

import { init } from './utils/base';

// 1. 获取 DOM 元素
const rollerList = document.getElementById('rollerList') as HTMLUListElement;
const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const resultText = document.getElementById('result-text') as HTMLDivElement;

// 2. 配置参数
let names: string[] = [];
const ITEM_HEIGHT = 60; // 必须与 CSS .roller-item 的 height 一致
let isRolling = false;
let animationId: number;

// 滚动状态
let currentOffset = 0;
let speed = 0;
const MAX_SPEED = 50;
const MIN_SPEED = 0.5;

init('Lucky', false).then(async () =>
{
    try
    {
        const res = await fetch('/api/luckys');
        const json = await res.json() as { success: boolean, data: string[] };

        if (json.success && Array.isArray(json.data) && json.data.length > 0)
        {
            names = json.data;
        } else
        {
            names = ['虚位以待', '暂无名单', '请添加'];
        }
    } catch (e)
    {
        console.error(e);
        names = ['网络错误', '请重试'];
    }

    renderList();
});

/**
 * 辅助函数：生成纯随机序列
 * 真正的“每一次的下一个元素都是在所有元素中等量选取”
 */
function generateRandomSequence(source: string[], count: number): string[]
{
    const result: string[] = [];
    for (let i = 0; i < count; i++)
    {
        const randomIndex = Math.floor(Math.random() * source.length);
        result.push(source[randomIndex]!);
    }
    return result;
}

/**
 * 渲染列表
 */
function renderList()
{
    rollerList.innerHTML = '';
    const safeNames = names.length > 0 ? names : ['?'];

    // --- 关键修改：动态计算序列长度 ---
    // 1. 基础长度：至少要跟名单一样长，保证样本空间足够大。
    // 2. 最小长度：如果是小名单（如3个人），至少生成50个，保证滚动不重复感。
    // 3. 最大长度：(可选) 防止由 DOM 过多导致的性能问题，例如限制在 1000。
    //    对于 500 人的名单，这里会生成 500 个 DOM 节点作为一组。
    let batchSize = Math.max(safeNames.length * 3, 50);

    // 如果你担心名单有 1万个人导致卡顿，可以加个上限，比如：
    // batchSize = Math.min(batchSize, 2000);

    // 生成随机序列
    const randomBatch = generateRandomSequence(safeNames, batchSize);

    // 复制一份用于无缝循环：[随机序列] + [随机序列的克隆]
    const finalRenderData = [...randomBatch, ...randomBatch];

    // 使用 DocumentFragment 优化批量插入性能
    const fragment = document.createDocumentFragment();
    finalRenderData.forEach(name =>
    {
        const li = document.createElement('li');
        li.className = 'roller-item';
        li.textContent = name;
        fragment.appendChild(li);
    });
    rollerList.appendChild(fragment);

    // 初始居中调整 (让第1个元素在视口中间)
    // 视口高度 240px，中间点 120px，Item高 60px
    const centerOffset = (240 / 2) - (ITEM_HEIGHT / 2);
    currentOffset = -centerOffset;

    // 立即更新位置
    rollerList.style.transform = `translateY(${-currentOffset}px)`;
}

// 3. 开始滚动
function startRoll()
{
    if (isRolling) return;
    isRolling = true;
    startBtn.disabled = true;
    startBtn.innerText = "抽奖中...";
    resultText.innerText = "好运降临中...";

    speed = 0;
    let state = 'accelerate';
    let startTime = Date.now();
    let constantDuration = Math.random() * 2000 + 2000;

    const loop = () =>
    {
        const now = Date.now();
        const timePassed = now - startTime;

        // 状态机：加速 -> 匀速 -> 减速
        if (state === 'accelerate')
        {
            speed += 1.5;
            if (speed >= MAX_SPEED)
            {
                speed = MAX_SPEED;
                state = 'constant';
                startTime = Date.now();
            }
        } else if (state === 'constant')
        {
            if (timePassed > constantDuration)
            {
                state = 'decelerate';
            }
        } else if (state === 'decelerate')
        {
            speed *= 0.95;
            if (speed <= MIN_SPEED)
            {
                stopRoll();
                return;
            }
        }

        currentOffset += speed;

        // --- 无缝循环逻辑 ---
        // 这里的 children.length 可能是 1000 (500*2)
        const singleSetCount = rollerList.children.length / 2;
        const singleSetHeight = singleSetCount * ITEM_HEIGHT;

        // 当卷去高度超过单组高度时，重置
        if (currentOffset >= singleSetHeight)
        {
            currentOffset = currentOffset % singleSetHeight;
        }

        rollerList.style.transform = `translateY(${-currentOffset}px)`;

        animationId = requestAnimationFrame(loop);
    };

    loop();
}

/**
 * 停止并吸附
 */
function stopRoll()
{
    cancelAnimationFrame(animationId);
    isRolling = false;
    startBtn.disabled = false;
    startBtn.innerText = "再次开始";

    const centerOffset = (240 / 2) - (ITEM_HEIGHT / 2);
    const pureOffset = currentOffset + centerOffset;

    const indexFloat = pureOffset / ITEM_HEIGHT;
    let targetIndex = Math.round(indexFloat);

    // 计算目标位置
    const targetOffset = targetIndex * ITEM_HEIGHT - centerOffset;

    // 动画吸附
    rollerList.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.3, 1)';
    rollerList.style.transform = `translateY(${-targetOffset}px)`;

    // 获取获奖者
    const totalItems = rollerList.children.length;
    const validIndex = (targetIndex % totalItems + totalItems) % totalItems;

    const winnerName = rollerList.children[validIndex]!.textContent;

    setTimeout(() =>
    {
        rollerList.style.transition = 'none';

        // 修正 offset：将其映射回第一组的范围内
        const singleSetCount = totalItems / 2;
        const singleSetHeight = singleSetCount * ITEM_HEIGHT;

        // 无论停在第一组还是第二组，都算回相对于第一组开头的位置
        // 这样下次开始滚动时，坐标数值不会过大
        let normalizedOffset = targetOffset;

        // 简单的修正逻辑：只要大于单组高度，就减掉单组高度
        // 因为两组内容完全一样，位置是等价的
        if (normalizedOffset >= singleSetHeight - centerOffset)
        {
            normalizedOffset -= singleSetHeight;
        }

        // 双重保险：取模
        // 注意：由于 centerOffset 是负的偏移，简单的取模可能不准确，
        // 这里最稳妥的是：(Offset + centerOffset) % height - centerOffset
        // 但上面的 if 减法逻辑在视觉上通常足够平滑。

        currentOffset = normalizedOffset;
        rollerList.style.transform = `translateY(${-currentOffset}px)`;

        resultText.innerText = `🎉 恭喜：${winnerName} 🎉`;
    }, 500);
}

startBtn.addEventListener('click', startRoll);