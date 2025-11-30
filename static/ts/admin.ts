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

    const imgSelect = document.getElementById('img-work-select') as HTMLSelectElement;
    if (imgSelect)
    {
        imgSelect.innerHTML = '<option value="">请选择作品...</option>';
        works.forEach(w =>
        {
            const opt = document.createElement('option');
            opt.value = w.workId;
            opt.textContent = w.title;
            imgSelect.appendChild(opt);
        });
    }

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
        const lines = content.split(/\r?\n/);
        let successCount = 0;
        let failCount = 0;

        log(`开始批量创建用户，共 ${lines.length} 行...`);

        for (const line of lines)
        {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // [修改] 解析 CSV 格式: username, password, weight
            const parts = trimmed.split(',');
            const username = (parts[0] as string).trim();
            const password = parts.length > 1 ? (parts[1] as string).trim() : '';
            // 解析权重，如果未提供或解析失败则默认为 1
            let weight = 1;
            if (parts.length > 2)
            {
                const w = parseFloat(parts[2]?.trim() ?? '');
                if (!isNaN(w))
                {
                    weight = w;
                }
            }

            if (!username) continue;

            const res = await requestAdmin('/admin/register', 'POST', { username, password, weight });
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
    const wInput = document.getElementById('new-weight') as HTMLInputElement; // [新增]

    if (!uInput.value) { showError('请输入用户名'); return; }

    // 获取权重，默认为 1
    const weightVal = parseFloat(wInput.value);
    const weight = isNaN(weightVal) ? 1 : weightVal;

    const res = await requestAdmin('/admin/register', 'POST', {
        username: uInput.value,
        password: pInput.value,
        weight: weight // [修改] 发送权重
    });

    if (res.success)
    {
        showSuccess('用户创建成功');
        log(`用户 [${uInput.value}] (权重: ${weight}) 创建成功`);
        uInput.value = '';
        pInput.value = '';
        wInput.value = '1'; // 重置为默认
    } else
    {
        showError(res.data);
        log(res.data, true);
    }
});

// ... (添加作品部分不变) ...


// ----------------------------------------------------------------------
// [新增] 单项管理 (删除单个用户/作品)
// ----------------------------------------------------------------------

document.getElementById('del-single-user-btn')?.addEventListener('click', async () =>
{
    const input = document.getElementById('target-user-id') as HTMLInputElement;
    const userId = input.value.trim();

    if (!userId)
    {
        showError('请输入 User ID');
        return;
    }

    if (!confirm(`确定要删除用户 ID: ${userId} 吗？`)) return;

    log(`正在删除用户 ${userId}...`);
    const res = await requestAdmin('/admin/remove_user', 'POST', { userId });

    if (res.success)
    {
        showSuccess(res.data);
        log(res.data);
        input.value = '';
    } else
    {
        showError(res.data);
        log(res.data, true);
    }
});

document.getElementById('del-single-work-btn')?.addEventListener('click', async () =>
{
    const input = document.getElementById('target-work-id') as HTMLInputElement;
    const workId = input.value.trim();

    if (!workId)
    {
        showError('请输入 Work ID');
        return;
    }

    if (!confirm(`确定要删除作品 ID: ${workId} 吗？`)) return;

    log(`正在删除作品 ${workId}...`);
    const res = await requestAdmin('/admin/remove_work', 'POST', { workId });

    if (res.success)
    {
        showSuccess(res.data);
        log(res.data);
        input.value = '';
        refreshWorksList(); // 刷新作品下拉框
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

// 1. 添加抽奖人员
document.getElementById('add-lucky-btn')?.addEventListener('click', async () =>
{
    const input = document.getElementById('lucky-name-input') as HTMLInputElement;
    const name = input.value.trim();

    if (!name)
    {
        showError('请输入名称');
        return;
    }

    const res = await requestAdmin('/admin/add_lucky_people', 'POST', { name });

    if (res.success)
    {
        showSuccess('已添加到名单');
        log(`添加抽奖人 [${name}] 成功`);
        input.value = '';
    } else
    {
        showError(res.data);
        log(res.data, true);
    }
});

// 2. 列出名单
document.getElementById('list-luckys-btn')?.addEventListener('click', async () =>
{
    // 复用之前的 list 逻辑，注意这里的接口签名也是 {success, data: []}
    log('正在获取抽奖名单...');
    const res = await requestAdmin('/admin/list_luckys', 'GET'); // 假设 admin 侧是 GET 或 POST 皆可，根据你后端定

    if (res.success)
    {
        const list = res.data;
        log(`当前抽奖池 (${Array.isArray(list) ? list.length : 0}人):\n${JSON.stringify(list, null, 2)}`);
    } else
    {
        showError(res.data);
        log(res.data, true);
    }
});

// 3. 清空名单
document.getElementById('clear-luckys-btn')?.addEventListener('click', async () =>
{
    if (!confirm('确定要清空所有抽奖名单吗？')) return;

    log('正在清空抽奖池...');
    // 注意：你描述的接口是 /admin/remove_luckys (no body)
    const res = await requestAdmin('/admin/remove_luckys', 'POST');

    if (res.success)
    {
        showSuccess('抽奖池已清空');
        log('抽奖池已清空');
    } else
    {
        showError(res.data);
        log(res.data, true);
    }
});

// [新增] 批量添加抽奖人员
document.getElementById('batch-lucky-btn')?.addEventListener('click', async () =>
{
    const fileInput = document.getElementById('batch-lucky-file') as HTMLInputElement;
    if (!fileInput.files || fileInput.files.length === 0)
    {
        showError('请选择名单文件 (.txt)');
        return;
    }

    try
    {
        const content = await readFileContent(fileInput.files[0] as File);
        const lines = content.split(/\r?\n/);
        let successCount = 0;
        let failCount = 0;

        log(`开始批量导入抽奖名单，共 ${lines.length} 行...`);

        for (const line of lines)
        {
            const name = line.trim();
            if (!name) continue;

            // 调用单个添加接口
            const res = await requestAdmin('/admin/add_lucky_people', 'POST', { name });
            if (res.success)
            {
                successCount++;
            } else
            {
                failCount++;
                log(`添加名单 [${name}] 失败: ${res.data}`, true);
            }
        }

        log(`批量名单导入完成: 成功 ${successCount}, 失败 ${failCount}`);
        showSuccess(`完成：成功 ${successCount}，失败 ${failCount}`);

        fileInput.value = '';
    } catch (e)
    {
        showError('文件读取失败');
        log(String(e), true);
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

document.getElementById('upload-img-btn')?.addEventListener('click', async () =>
{
    const select = document.getElementById('img-work-select') as HTMLSelectElement;
    const fileInput = document.getElementById('work-image-file') as HTMLInputElement;

    if (!select.value)
    {
        showError('请先选择一个作品');
        return;
    }
    if (!fileInput.files || fileInput.files.length === 0)
    {
        showError('请选择图片文件');
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('workId', select.value);
    formData.append('image', file as File);

    const selectedOptionText = select.selectedOptions?.[0]?.text ?? select.options?.[select.selectedIndex]?.text ?? '';
    log(`正在上传作品 [${selectedOptionText}] 的封面...`);

    // 这里不能用 requestAdmin 的 JSON 模式，因为要传 FormData
    // 我们手动写 fetch
    const apiKey = (document.getElementById('api-key-input') as HTMLInputElement).value.trim();
    try
    {
        const res = await fetch('/admin/upload_work_image', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey
                // 注意：不要手动设置 Content-Type，浏览器会自动识别 FormData 并设置 boundary
            },
            body: formData
        });
        const data = await res.json();
        if (data.success)
        {
            showSuccess('图片上传成功');
            log('图片上传成功');
            fileInput.value = ''; // 清空选择
        } else
        {
            showError(data.data);
            log(data.data, true);
        }
    } catch (e)
    {
        showError('上传请求失败');
        log(String(e), true);
    }
});


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