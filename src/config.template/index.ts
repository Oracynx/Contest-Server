// 将此文件中的配置填写完毕后，重命名文件夹为 src/config.template -> src/config

export const DatabaseConfig = {
    url: 'mongodb://localhost:27017',
}

export const SkipPasswordCheck = true;

export const SecretKey = 'my_secret_key';

export const MaxiumPoints = 100;
export const MiniumPoints = 0;
export const IgnoreMin = 0;
export const IgnoreMax = 0;