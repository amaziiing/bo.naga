(()=>{'use strict';
const badges=[...document.querySelectorAll('[data-merchant-repay-badge]')];
if(!badges.length)return;
function setCount(n){badges.forEach(b=>{b.textContent=n>99?'99+':String(n);b.hidden=!(n>0);});}
function month(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
function merchant(x){return ['BRAND','MERCHANT'].includes(String(x?.counterpartyType||'').toUpperCase());}
function due(x){const st=String(x?.status||'').toUpperCase();return String(x?.sourceType||'').toUpperCase()==='MERCHANT_RECURRING'&&String(x?.direction||'').toUpperCase()==='COLLECT'&&Number(x?.balanceAmount||0)>0.004&&!['PAID','SETTLED','CARRIED'].includes(st);}
async function load(){try{if(!window.API_CONFIG?.BASE_URL||!window.BO_AUTH?.authHeader)return setCount(0);const r=await fetch(API_CONFIG.BASE_URL+'/admin/main/settlements?month='+encodeURIComponent(month()),{headers:BO_AUTH.authHeader(),cache:'no-store'});const j=await r.json().catch(()=>({}));if(!r.ok||j.status==='error')throw Error();const d=j.data??j, rows=Array.isArray(d)?d:(d?.rows||[]), seen=new Set();for(const x of rows){if(!merchant(x)||!due(x))continue;seen.add(String(x.id??`${x.month}|${x.counterpartyKey}|${x.direction}|${x.currency}`));}setCount(seen.size);}catch(_){setCount(0);}}
load();
})();
