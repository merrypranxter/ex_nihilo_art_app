// Server-only Wolfram|Alpha bridge. Never import this file into browser code.
// Guarded by a *separate* access token to protect the user's Wolfram API allowance.
import { timingSafeEqual } from 'node:crypto';

const response = (statusCode, body) => ({
  statusCode,
  headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'},
  body:JSON.stringify(body)
});
const validToken = (given,expected) => {
  if(typeof given!=='string'||typeof expected!=='string'||!given||!expected)return false;
  const a=Buffer.from(given),b=Buffer.from(expected);
  return a.length===b.length && timingSafeEqual(a,b);
};

export const handler = async (event) => {
  if(event.httpMethod!=='POST')return response(405,{error:'POST required.'});
  const appId=process.env.WOLFRAM_APP_ID;
  const accessToken=process.env.WOLFRAM_ACCESS_TOKEN;
  if(!appId||!accessToken)return response(503,{error:'Wolfram is not configured on this site. Set both server-side environment variables.'});
  const header=event.headers?.['x-ex-nihilo-access']||event.headers?.['X-EX-NIHILO-ACCESS'];
  if(!validToken(header,accessToken))return response(401,{error:'Incorrect or missing EX NIHILO access token.'});
  if(!event.body||event.body.length>3000)return response(413,{error:'Unexpected request size.'});

  let matrix;
  try{matrix=JSON.parse(event.body).matrix;}catch{return response(400,{error:'Invalid JSON.'});}
  if(!Array.isArray(matrix)||matrix.length!==3||!matrix.every(
    row=>Array.isArray(row)&&row.length===3&&row.every(value=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<=1000)
  ))return response(400,{error:'Only finite 3×3 numerical Jacobians are supported.'});

  // The user does not supply an arbitrary query. This fixed template is
  // predictable, math-specific, and cannot pass any API keys to the browser.
  const query='eigenvalues of matrix {{'+matrix.map(row=>row.map(n=>n.toFixed(5)).join(', ')).join('}, {')+'}}';
  const url=new URL('https://api.wolframalpha.com/v2/query');
  url.searchParams.set('appid',appId);
  url.searchParams.set('input',query);
  url.searchParams.set('output','json');
  url.searchParams.set('format','plaintext');
  try {
    const upstream=await fetch(url,{signal:AbortSignal.timeout(13000),headers:{Accept:'application/json'}});
    if(!upstream.ok)return response(502,{error:'Wolfram request failed (HTTP '+upstream.status+').'});
    const data=await upstream.json();
    const qr=data?.queryresult;
    if(!qr || qr.error || !qr.success)return response(422,{error:'Wolfram could not interpret this matrix; inspect the numerical field or retry.'});
    const pods=Array.isArray(qr.pods)?qr.pods:[];
    const texts=pod=>(Array.isArray(pod.subpods)?pod.subpods:[pod.subpods]).filter(Boolean)
      .map(s=>String(s.plaintext||'').trim()).filter(Boolean).join('; ');
    const interpretation=pods.filter(p=>p.id==='Input').map(texts).filter(Boolean).join('\n')||query;
    const results=pods.filter(p=>p.id!=='Input').map(p=>({
      title:String(p.title||'Result').slice(0,90),text:texts(p).slice(0,1200)
    })).filter(item=>item.text).slice(0,7);
    return response(200,{interpretation,results});
  } catch (error) {
    return response(502,{error:'Wolfram did not return a usable response: '+(error?.name==='TimeoutError'?'timeout.':'network or parsing failure.')});
  }
};
