// lucky.ts

import { init } from './utils/base';

// 1. 获取 DOM 元素
const rollerList = document.getElementById('rollerList') as HTMLUListElement;
const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const resultText = document.getElementById('result-text') as HTMLDivElement;

// 2. 配置参数
let sourceNames: string[] = []; // 原始名单池
let sequenceCache: string[] = []; // 已生成的随机序列缓存
const ITEM_HEIGHT = 60;
const VIEWPORT_HEIGHT = 240;
// 视口能容纳 4 个，我们在上下各加 1-2 个缓冲区，防止快速滚动时出现白边
const RENDER_COUNT = Math.ceil(VIEWPORT_HEIGHT / ITEM_HEIGHT) + 4;

// 滚动状态
let isRolling = false;
let animationId: number;

// currentOffset 定义为：列表顶部距离视口顶部的逻辑像素距离
// 初始状态下，为了让第0个元素居中：
// 视口中线(120) - 元素一半(30) = 90。
// 意味着第0个元素在 y=90 的位置。
// 我们的坐标系：ItemY = Index * Height - currentOffset.
// 所以 90 = 0 * 60 - currentOffset  =>  currentOffset = -90.
const CENTER_OFFSET = (VIEWPORT_HEIGHT / 2) - (ITEM_HEIGHT / 2);
let currentOffset = -CENTER_OFFSET; 

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
            sourceNames = json.data;
        } else
        {
            sourceNames = ['虚位以待', '暂无名单', '请添加'];
        }
    } catch (e)
    {
        console.error(e);
        sourceNames = ['网络错误', '请重试'];
    }

    // 初始化 DOM 结构（对象池模式）
    initDomPool();
    // 初始渲染
    renderVirtual();
});

/**
 * 初始化 DOM 对象池
 * 我们只需要创建固定数量(RENDER_COUNT)的 li 元素
 * 之后滚动时只改变它们的位置和文字，不再增删 DOM
 */
function initDomPool()
{
    rollerList.innerHTML = '';
    // 强制设置容器样式以支持绝对定位
    rollerList.style.position = 'relative';
    rollerList.style.height = `${VIEWPORT_HEIGHT}px`;
    rollerList.style.overflow = 'hidden';

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < RENDER_COUNT; i++)
    {
        const li = document.createElement('li');
        li.className = 'roller-item';
        // 关键：使用绝对定位
        li.style.position = 'absolute';
        li.style.width = '100%';
        li.style.height = `${ITEM_HEIGHT}px`;
        li.style.left = '0';
        li.style.top = '0';
        // 初始移除视口外，避免闪烁
        li.style.transform = `translateY(-999px)`;
        fragment.appendChild(li);
    }
    rollerList.appendChild(fragment);
}

/**
 * 获取序列中指定索引的名字（惰性生成）
 * 保证无限且随机，同时如果在同一轮次中回看（虽然抽奖只往前滚）能保持一致
 */
function getNameAt(index: number): string
{
    // 负数索引处理（初始居中时可能会用到负索引位置的渲染，显示为空或占位）
    if (index < 0) return ''; 

    // 如果缓存不够，生成新的随机序列补充进去
    while (index >= sequenceCache.length)
    {
        // 纯随机选取，不依赖上一项
        const randomIndex = Math.floor(Math.random() * sourceNames.length);
        sequenceCache.push(sourceNames[randomIndex]!);
    }
    return sequenceCache[index]!;
}

/**
 * 核心：虚拟滚动渲染器
 * 每一帧调用，根据 currentOffset 计算哪些 item 可见，并更新 DOM 池
 */
function renderVirtual()
{
    // 1. 计算当前视口可见的起始索引
    // ItemY = Index * 60 - Offset
    // 可见意味着 ItemY > -ITEM_HEIGHT (比如 -60) 且 ItemY < VIEWPORT_HEIGHT
    // 即：Index * 60 > Offset - 60  =>  Index > (Offset/60) - 1
    const firstVisibleIndex = Math.floor(currentOffset / ITEM_HEIGHT) - 1;

    // 2. 循环更新 DOM 池中的元素
    const domItems = rollerList.children;

    for (let i = 0; i < RENDER_COUNT; i++)
    {
        // 逻辑索引：从可见区域的上方一点开始
        const logicalIndex = firstVisibleIndex + i;

        // 计算该元素应该在屏幕上的位置
        const translateY = logicalIndex * ITEM_HEIGHT - currentOffset;

        // 获取对应的 DOM 元素
        // 使用取模运算循环利用 DOM 节点，防止节点闪烁
        // 例如：逻辑索引 100 对应 DOM[100 % count]
        // 注意：这里取模要处理负数逻辑索引的情况，虽然滚动起来后都是正数
        const domIndex = ((logicalIndex % RENDER_COUNT) + RENDER_COUNT) % RENDER_COUNT;
        const li = domItems[domIndex] as HTMLElement;

        // 优化：只有当内容在缓冲区范围内才显示，否则移出
        // (实际上我们的 RENDER_COUNT 已经限制在这个范围了，这里直接更新即可)

        li.style.transform = `translateY(${translateY}px)`;

        // 更新文字
        // 只有当索引变化时才更新 innerText，虽然浏览器对纯文本更新优化得很好，但加个判断更保险
        const text = getNameAt(logicalIndex);
        if (li.textContent !== text)
        {
            li.textContent = text;
        }
    }
}

// 3. 开始滚动
function startRoll()
{
    if (isRolling) return;

    // 每次开始前，如果希望完全重置随机性，可以清空 cache 并重置 offset
    // 但为了视觉连贯性，我们通常接着当前位置继续跑

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

        // 状态机逻辑不变
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
            speed *= 0.96;
            if (speed <= MIN_SPEED)
            {
                stopRoll();
                return;
            }
        }

        // 更新逻辑位置
        currentOffset += speed;

        // 渲染虚拟列表
        renderVirtual();

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

    // 1. 计算应该停在哪个索引 (吸附逻辑)
    // 目标是让某个 Item 居中
    // 居中公式：ItemY = VIEWPORT/2 - ITEM/2 = CENTER_OFFSET (90px)
    // ItemY = Index * H - Offset
    // 所以：Index * H - Offset = CENTER_OFFSET
    // => Offset = Index * H - CENTER_OFFSET

    // 当前的“纯列表索引偏移” (反推 float index)
    // currentOffset + CENTER_OFFSET = Index * H
    const indexFloat = (currentOffset + CENTER_OFFSET) / ITEM_HEIGHT;
    const targetIndex = Math.round(indexFloat);

    // 计算精准的目标 Offset
    const targetOffset = targetIndex * ITEM_HEIGHT - CENTER_OFFSET;

    // 2. 手动实现简易的惯性回弹动画 (因为 renderVirtual 依赖 currentOffset)
    // 这里简单的用 requestAnimationFrame 模拟一个 easeOut 过程
    // 不再使用 CSS transition，因为虚拟滚动的 DOM 是动态跳变的，CSS transition 可能会导致错位

    const startOffset = currentOffset;
    const distance = targetOffset - startOffset;
    const duration = 500; // ms
    let startAnimTime = Date.now();

    const snapLoop = () =>
    {
        const now = Date.now();
        const progress = Math.min((now - startAnimTime) / duration, 1);

        // EaseOutCubic
        const ease = 1 - Math.pow(1 - progress, 3);

        currentOffset = startOffset + (distance * ease);
        renderVirtual();

        if (progress < 1)
        {
            requestAnimationFrame(snapLoop);
        } else
        {
            // 动画结束，公布结果
            const winnerName = getNameAt(targetIndex);
            resultText.innerText = `🎉 恭喜：${winnerName} 🎉`;
        }
    };

    snapLoop();
}

startBtn.addEventListener('click', startRoll);