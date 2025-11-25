export type Res = {
    success: boolean,
    data: string,
}

export function Ok(data: string): Res
{
    return { success: true, data };
}

export function Fail(data: string): Res
{
    return { success: false, data };
}