import { init, showError, showSuccess, type Res } from './utils/base';

const userInfo = document.getElementById('user-info') as HTMLParagraphElement;
const usernameInput = document.getElementById('username-input') as HTMLInputElement;
const passwordInput = document.getElementById('password-input') as HTMLInputElement;
const loginButton = document.getElementById('login-button') as HTMLButtonElement;

async function updateUserinfo()
{
    const token = localStorage.getItem('userId');
    if (!token)
    {
        userInfo.innerText = '未登录';
    }
    else
    {
        fetch('/api/user_info?userId=' + token).then(res => res.json()).then(
            async (data) =>
            {
                if (!data.success)
                {
                    userInfo.innerText = '未登录';
                }
                else
                {
                    userInfo.innerText = '已登录，用户：' + data.data;
                }
            }
        );
    }
}

init('Login', false).then(async () => updateUserinfo());

async function login()
{
    const username = usernameInput.value;
    const password = passwordInput.value;
    fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
    }).then(res => res.json()).then(async (data: Res) =>
    {
        if (data.success)
        {
            showSuccess('登录成功');
            localStorage.setItem('userId', data.data);
        }
        else
        {
            showError('登录失败：' + data.data);
        }
        updateUserinfo();
    })
}

loginButton.addEventListener('click', async () => login());
usernameInput.addEventListener('keydown', async (e) =>
{
    if (e.key == 'Enter')
    {
        login();
    }
});
passwordInput.addEventListener('keydown', async (e) =>
{
    if (e.key == 'Enter')
    {
        login();
    }
});