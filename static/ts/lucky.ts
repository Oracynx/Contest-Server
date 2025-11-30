// lucky.ts

import { init } from './utils/base';

const canvas = document.getElementById('wheelCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const resultText = document.getElementById('result-text') as HTMLDivElement;

// 配置
let names: string[] = []; // 从 API 获取
const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#F1948A'];

// 状态
let startAngle = 0;
let arc = 0;
let spinAngleStart = 0; // 初始旋转速度
let spinTime = 0;       // 当前旋转时间
let spinTimeTotal = 0;  // 总旋转时间
let isSpinning = false;

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
            names = ['暂无名单', '请联系管理员', '添加名单'];
        }
    } catch (e)
    {
        console.error(e);
        names = ['网络错误'];
    }

    // 计算每个扇形的弧度
    arc = Math.PI * 2 / names.length;
    drawWheel();
});

// 2. 绘制转盘
function drawWheel()
{
    if (!ctx) return;

    const outsideRadius = 380; // 大圆半径 (Canvas 800x800)
    const textRadius = 300;    // 文字半径
    const insideRadius = 50;   // 内圆半径

    ctx.clearRect(0, 0, 800, 800);

    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;

    ctx.font = 'bold 32px Helvetica, Arial';

    for (let i = 0; i < names.length; i++)
    {
        const angle = startAngle + i * arc;

        // 绘制扇形
        ctx.fillStyle = colors[i % colors.length]!;

        ctx.beginPath();
        // arc(x, y, radius, startAngle, endAngle, anticlockwise)
        ctx.arc(400, 400, outsideRadius, angle, angle + arc, false);
        ctx.arc(400, 400, insideRadius, angle + arc, angle, true);
        ctx.stroke();
        ctx.fill();

        // 绘制文字
        ctx.save();
        ctx.fillStyle = "white";

        // 将画布原点移动到中心，并旋转到对应扇形中间
        ctx.translate(400 + Math.cos(angle + arc / 2) * textRadius,
            400 + Math.sin(angle + arc / 2) * textRadius);

        // 调整文字角度
        ctx.rotate(angle + arc / 2 + Math.PI / 2);

        const text = names[i];
        // 简单的文字居中
        ctx.fillText(text!, -ctx.measureText(text!).width / 2, 0);
        ctx.restore();
    }
}

// 3. 旋转逻辑
function spin()
{
    if (isSpinning) return;
    isSpinning = true;
    resultText.innerText = "好运降临中...";

    // 随机设定旋转参数
    spinAngleStart = Math.random() * 10 + 10; // 初始速度
    spinTime = 0;
    spinTimeTotal = Math.random() * 3000 + 4000; // 旋转时长 4-7秒

    rotateWheel();
}

// 缓动动画
function rotateWheel()
{
    spinTime += 30; // 每帧增加的时间 (ms)

    if (spinTime >= spinTimeTotal)
    {
        stopRotateWheel();
        return;
    }

    // 缓动公式 (Ease Out): 速度随时间递减
    const spinAngle = spinAngleStart - (easeOut(spinTime, 0, spinAngleStart, spinTimeTotal));

    startAngle += (spinAngle * Math.PI / 180);
    drawWheel();

    requestAnimationFrame(rotateWheel);
}

// Ease Out Cubic 公式
function easeOut(t: number, b: number, c: number, d: number)
{
    const ts = (t /= d) * t;
    const tc = ts * t;
    return b + c * (tc + -3 * ts + 3 * t);
}

// 4. 停止并计算获奖者
function stopRotateWheel()
{
    isSpinning = false;

    // 计算角度对应的索引
    // 指针在正上方 (-PI/2 或 270度)。
    // 我们的扇形是从 startAngle 开始绘制的。
    const degrees = startAngle * 180 / Math.PI + 90;
    const arcd = arc * 180 / Math.PI;

    // 修正角度到 0-360 范围，并反向计算索引（因为转盘是顺时针转，索引相当于逆时针扫过指针）
    const index = Math.floor((360 - degrees % 360) % 360 / arcd);

    ctx.save();
    const text = names[index];
    resultText.innerText = `🎉 恭喜：${text} 🎉`;

    // 简单的高亮效果（重绘一次文字为黄色）
    // 实际项目中可以在 names[index] 处绘制特殊边框
    ctx.restore();
}


// 事件监听
canvas.addEventListener('click', spin);