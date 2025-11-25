import Toastify from 'toastify-js'

export const BasePagename = 'Contest Platform'

export type Res = {
    success: boolean,
    data: string,
}

async function loadCSS(url: string)
{
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
}

export async function showSuccess(message: string)
{
    Toastify({
        text: message,
        duration: 3000,
        gravity: 'top',
        position: 'right',
        backgroundColor: 'linear-gradient(to right, #00b09b, #96c93d)',
    }).showToast();
}

export async function showError(message: string)
{
    Toastify({
        text: message,
        duration: 3000,
        gravity: 'top',
        position: 'right',
        backgroundColor: 'linear-gradient(to right, #ff5f6d, #ffc371)',
    }).showToast();
}

export async function checkLogin()
{
    const token = localStorage.getItem('userId');
    if (!token)
    {
        window.location.href = '/login';
    }
    fetch('/api/user_info?userId=' + token).then(res => res.json()).then(
        async (data: Res) =>
        {
            if (!data.success)
            {
                showError('未登录');
                window.location.href = '/login';
            }
            else
            {
                console.log('Logged in as ' + data.data);
            }
        }
    );
}

export async function init(pagename = '', needLogin = false)
{
    await loadCSS('https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css');
    document.title = (pagename ? pagename + ' - ' : '') + BasePagename;
    if (needLogin)
    {
        await checkLogin();
    }
}