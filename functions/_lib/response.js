
export const json = (data, init={}) => new Response(JSON.stringify(data), {status:init.status||200, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...(init.headers||{})}});
