import { MaxiumPoints, MiniumPoints } from '../../src/config';
import { init, showError, showSuccess, toWorkTitle, type Res } from './utils/base';

let serverCurrentWorkId = '';

const pointsInput = document.getElementById('points-input') as HTMLInputElement;
const voteButton = document.getElementById('vote-button') as HTMLButtonElement;

const messageInput = document.getElementById('message-input') as HTMLInputElement;
const messageButton = document.getElementById('message-button') as HTMLButtonElement;

async function switchToWork(workId: string, isFromWs: boolean = false)
{
    serverCurrentWorkId = workId;
    const select = document.getElementById('work-select') as HTMLSelectElement;
    if (!select)
    {
        return;
    }
    if (select.value !== workId)
    {
        select.value = workId;
        if (isFromWs)
        {
            showSuccess(`管理员已切换作品：${await toWorkTitle(workId)}`);
        } else
        {
            console.log('Initial work loaded: ' + workId);
        }
    }
}

async function updateList()
{
    fetch('/api/list_works').then(res => res.json()).then((data: Res) =>
    {
        if (!data.success)
        {
            showError('获取作品列表失败：' + data.data);
            return;
        }
        const works = data.data as any as Array<{ title: string; workId: string }>;
        const container = document.getElementById('select-div');
        if (!container) return;
        container.innerHTML = '';
        const select = document.createElement('select');
        select.id = 'work-select';
        works.forEach(work =>
        {
            const option = document.createElement('option');
            option.value = work.workId;
            option.textContent = work.title;
            if (work.workId === serverCurrentWorkId)
            {
                option.selected = true;
            }
            select.appendChild(option);
        });
        select.addEventListener('change', async () =>
        {
            showSuccess(`已选择作品：${await toWorkTitle(select.value)}`);
        });
        container.appendChild(select);
    });
}

async function fetchInitialStatus()
{
    const res = await fetch('/api/default_work');
    const data: Res = await res.json();
    if (data.success)
    {
        switchToWork(data.data, false);
    }
}

async function initWebSocket()
{
    const wsUrl = `${window.location.protocol == 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/vote_default_work`;
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => console.log('WebSocket connected');
    ws.onmessage = (event) =>
    {
        const msg = JSON.parse(event.data);
        if (msg.type === 'default_work' && msg.data)
        {
            console.log('WS command received: switch to ' + msg.data);
            switchToWork(msg.data, true);
        }
    };
    ws.onclose = () =>
    {
        console.log('WebSocket disconnected, retrying in 3s...');
        setTimeout(initWebSocket, 3000);
    };
}

async function takeVote()
{
    const userId = localStorage.getItem('userId');
    const select = document.getElementById('work-select') as HTMLSelectElement;
    const points = parseInt(pointsInput.value);
    fetch('/api/vote', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            userId: userId,
            workId: select.value,
            points: points,
        }),
    }).then(res => res.json()).then(async (data: Res) =>
    {
        if (data.success)
        {
            showSuccess('打分成功！');
        }
        else
        {
            showError('打分失败：' + data.data);
        }
    })
}

async function takeMessage()
{
    const userId = localStorage.getItem('userId');
    const select = document.getElementById('work-select') as HTMLSelectElement;
    const message = messageInput.value;
    fetch('/api/message', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            userId: userId,
            workId: select.value,
            message: message,
        }),
    }).then(res => res.json()).then(async (data: Res) =>
    {
        if (data.success)
        {
            showSuccess('提交成功！');
        }
        else
        {
            showError('提交失败：' + data.data);
        }
    })
}

init('Vote', true).then(
    async () =>
    {
        await fetchInitialStatus();
        updateList();
        initWebSocket();
        pointsInput.min = MiniumPoints.toString();
        pointsInput.max = MaxiumPoints.toString();
        pointsInput.placeholder = `请输入评分 [${MiniumPoints}, ${MaxiumPoints}]`;
    }
);

pointsInput.addEventListener('keydown', (e) =>
{
    if (e.key == 'Enter')
    {
        takeVote();
    }
});

voteButton.addEventListener('click', async () => takeVote());

messageInput.addEventListener('keydown', (e) =>
{
    if (e.key == 'Enter')
    {
        takeMessage();
    }
});

messageButton.addEventListener('click', async () => takeMessage());