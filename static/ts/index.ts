import { init, initClientWS, showSuccess } from './utils/base';

init('Home', false);

const testBtn = document.getElementById('test-btn') as HTMLButtonElement;

testBtn.onclick = () =>
{
    console.log('Button clicked!');
    showSuccess('Button was clicked successfully!');
}