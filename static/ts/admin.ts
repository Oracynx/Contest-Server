import { init, showError, showSuccess, type Res } from './utils/base';

// ----------------------------------------------------------------------
// 1. 基础配置与工具
// ----------------------------------------------------------------------

const LOCAL_STORAGE_KEY = 'admin_api_key';
const apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement;
const saveKeyBtn = document.getElementById('save-key-btn') as HTMLButtonElement;
const logOutput = document.getElementById('log-output') as HTMLDivElement;

// 简单的日志输出函数
function log(msg: string, isError: boolean = false)
{
    const time = new Date().toLocaleTimeString();
    const prefix = isError ? '[ERROR]' : '[INFO]';
    const line = `[${time}] ${prefix} ${msg}\n`;
    logOutput.innerText = line + logOutput.innerText; // 新日志在最上面
    console.log(msg);
}

// 封装带 API Key 的请求
async function requestAdmin(path: string, method: 'GET' | 'POST', body?: any): Promise<Res>
{
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey)
    {
        showError('请先输入并保存 API Key');
        return { success: false, data: 'Missing API Key' };
    }

    try
    {
        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            }
        };

        if (body)
        {
            options.body = JSON.stringify(body);
        }

        const res = await fetch(path, options);
        return await res.json();
    } catch (e)
    {
        return { success: false, data: String(e) };
    }
}

// 保存 API Key
saveKeyBtn.addEventListener('click', () =>
{
    const key = apiKeyInput.value.trim();
    if (key)
    {
        localStorage.setItem(LOCAL_STORAGE_KEY, key);
        showSuccess('API Key 已保存');
        refreshWorksList(); // 保存后尝试刷新作品列表
    } else
    {
        showError('API Key 不能为空');
    }
});

// ----------------------------------------------------------------------
// 2. 全局控制 (默认作品)
// ----------------------------------------------------------------------

async function refreshWorksList()
{
    const container = document.getElementById('work-select-container');
    if (!container) return;

    log('正在获取作品列表...');
    const res = await requestAdmin('/admin/list_works', 'GET');

    if (!res.success)
    {
        log('无法获取作品列表: ' + res.data, true);
        container.innerHTML = '<p style="color:red">加载失败，请检查 API Key</p>';
        return;
    }

    const works = res.data as any as Array<{ title: string; workId: string }>;
    container.innerHTML = '';

    // 使用美化的 select 结构
    const wrapper = document.createElement('div');
    wrapper.className = 'select-wrapper';

    const select = document.createElement('select');
    select.id = 'admin-work-select';

    // 添加一个默认空选项
    const defaultOption = document.createElement('option');
    defaultOption.text = '请选择要广播的作品...';
    defaultOption.value = '';
    select.appendChild(defaultOption);

    works.forEach(w =>
    {
        const opt = document.createElement('option');
        opt.value = w.workId;
        opt.textContent = w.title;
        select.appendChild(opt);
    });

    wrapper.appendChild(select);
    container.appendChild(wrapper);
    log(`成功加载 ${works.length} 个作品。`);
}

document.getElementById('set-default-btn')?.addEventListener('click', async () =>
{
    const select = document.getElementById('admin-work-select') as HTMLSelectElement;
    if (!select || !select.value)
    {
        showError('请先选择一个作品');
        return;
    }

    const res = await requestAdmin('/admin/set_default_work', 'POST', { workId: select.value });
    if (res.success)
    {
        showSuccess(res.data);
        log(res.data);
    } else
    {
        showError(res.data);
        log(res.data, true);
    }
});


// ----------------------------------------------------------------------
// 3. 批量操作 (文件上传)
// ----------------------------------------------------------------------

// 通用文件读取器
function readFileContent(file: File): Promise<string>
{
    return new Promise((resolve, reject) =>
    {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

// 批量创建用户
document.getElementById('batch-users-btn')?.addEventListener('click', async () =>
{
    const fileInput = document.getElementById('batch-users-file') as HTMLInputElement;
    if (!fileInput.files || fileInput.files.length === 0)
    {
        showError('请选择用户列表文件 (.txt)');
        return;
    }

    try
    {
        const content = await readFileContent(fileInput.files[0] as File);
        const lines = content.split(/\r?\n/); // 兼容 Windows/Linux 换行
        let successCount = 0;
        let failCount = 0;

        log(`开始批量创建用户，共 ${lines.length} 行...`);

        for (const line of lines)
        {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // 分割用户名和密码 (支持逗号分割)
            const parts = trimmed.split(',');
            const username = (parts[0] as string).trim();
            const password = parts.length > 1 ? (parts[1] as string).trim() : '';

            if (!username) continue;

            const res = await requestAdmin('/admin/register', 'POST', { username, password });
            if (res.success)
            {
                successCount++;
            } else
            {
                failCount++;
                log(`创建用户 [${username}] 失败: ${res.data}`, true);
            }
        }

        log(`批量用户创建完成: 成功 ${successCount}, 失败 ${failCount}`);
        showSuccess(`完成：成功 ${successCount}，失败 ${failCount}`);

        // 清空输入框
        fileInput.value = '';
    } catch (e)
    {
        showError('文件读取失败');
        log(String(e), true);
    }
});

// 批量创建作品
document.getElementById('batch-works-btn')?.addEventListener('click', async () =>
{
    const fileInput = document.getElementById('batch-works-file') as HTMLInputElement;
    if (!fileInput.files || fileInput.files.length === 0)
    {
        showError('请选择作品列表文件 (.txt)');
        return;
    }

    try
    {
        const content = await readFileContent(fileInput.files[0] as File);
        const lines = content.split(/\r?\n/);
        let successCount = 0;
        let failCount = 0;

        log(`开始批量创建作品，共 ${lines.length} 行...`);

        for (const line of lines)
        {
            const title = line.trim();
            if (!title) continue;

            const res = await requestAdmin('/admin/new_work', 'POST', { title });
            if (res.success)
            {
                successCount++;
            } else
            {
                failCount++;
                log(`创建作品 [${title}] 失败: ${res.data}`, true);
            }
        }

        log(`批量作品创建完成: 成功 ${successCount}, 失败 ${failCount}`);
        showSuccess(`完成：成功 ${successCount}，失败 ${failCount}`);
        refreshWorksList(); // 刷新下拉框
        fileInput.value = '';
    } catch (e)
    {
        showError('文件读取失败');
        log(String(e), true);
    }
});


// ----------------------------------------------------------------------
// 4. 手动单条添加
// ----------------------------------------------------------------------

document.getElementById('add-user-btn')?.addEventListener('click', async () =>
{
    const uInput = document.getElementById('new-username') as HTMLInputElement;
    const pInput = document.getElementById('new-password') as HTMLInputElement;

    if (!uInput.value) { showError('请输入用户名'); return; }

    const res = await requestAdmin('/admin/register', 'POST', {
        username: uInput.value,
        password: pInput.value
    });

    if (res.success)
    {
        showSuccess('用户创建成功');
        log(`用户 [${uInput.value}] 创建成功`);
        uInput.value = '';
        pInput.value = '';
    } else
    {
        showError(res.data);
        log(res.data, true);
    }
});

document.getElementById('add-work-btn')?.addEventListener('click', async () =>
{
    const wInput = document.getElementById('new-workname') as HTMLInputElement;

    if (!wInput.value) { showError('请输入作品名'); return; }

    const res = await requestAdmin('/admin/new_work', 'POST', {
        title: wInput.value
    });

    if (res.success)
    {
        showSuccess('作品创建成功');
        log(`作品 [${wInput.value}] 创建成功`);
        wInput.value = '';
        refreshWorksList();
    } else
    {
        showError(res.data);
        log(res.data, true);
    }
});


// ----------------------------------------------------------------------
// 5. 数据列表查询
// ----------------------------------------------------------------------

async function fetchAndLogList(url: string, name: string)
{
    log(`正在获取${name}列表...`);
    const res = await requestAdmin(url, 'GET');
    if (res.success)
    {
        const jsonStr = JSON.stringify(res.data, null, 2);
        log(`获取${name}成功:\n${jsonStr}`);
    } else
    {
        log(`获取${name}失败: ${res.data}`, true);
    }
}

document.getElementById('list-users-btn')?.addEventListener('click', () => fetchAndLogList('/admin/list_users', '用户'));
document.getElementById('list-works-btn')?.addEventListener('click', () => fetchAndLogList('/admin/list_works', '作品'));
document.getElementById('list-votes-btn')?.addEventListener('click', () => fetchAndLogList('/admin/list_votes', '投票'));
document.getElementById('list-msgs-btn')?.addEventListener('click', () => fetchAndLogList('/admin/list_messages', '留言'));


// ----------------------------------------------------------------------
// 6. 危险区域 (删除)
// ----------------------------------------------------------------------

async function confirmAndClear(url: string, name: string)
{
    if (!confirm(`警告！你确定要清空所有【${name}】吗？此操作不可恢复！`))
    {
        return;
    }

    log(`正在清空${name}...`);
    const res = await requestAdmin(url, 'POST');
    if (res.success)
    {
        showSuccess(`所有${name}已清空`);
        log(`所有${name}已清空`);
        if (name === '作品') refreshWorksList();
    } else
    {
        showError(res.data);
        log(res.data, true);
    }
}

document.getElementById('del-users-btn')?.addEventListener('click', () => confirmAndClear('/admin/remove_users', '用户'));
document.getElementById('del-works-btn')?.addEventListener('click', () => confirmAndClear('/admin/remove_works', '作品'));
document.getElementById('del-votes-btn')?.addEventListener('click', () => confirmAndClear('/admin/remove_votes', '投票'));
document.getElementById('del-msgs-btn')?.addEventListener('click', () => confirmAndClear('/admin/remove_messages', '留言'));


// ----------------------------------------------------------------------
// 初始化
// ----------------------------------------------------------------------

init('Admin Panel', false).then(() =>
{
    // 自动加载 Key
    const savedKey = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedKey)
    {
        apiKeyInput.value = savedKey;
        log('已从本地加载 API Key');
        // 自动尝试获取作品列表，相当于测试 Key 是否有效
        refreshWorksList();
    }
});