(function(){'use strict';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),fmt=v=>Number(v||0).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:4});
const kind=$('r2PortalTitle')?.dataset.r2Portal||'agent';
const token=kind==='agent'?localStorage.getItem('agent_token'):localStorage.getItem('bo_admin_token');
const apiBase=String(window.API_CONFIG?.BASE_URL||'/api').replace(/\/$/,'');
const cell=v=>'<td>'+esc(v)+'</td>';
const renderRows=(id,values,make,columns)=>{$(id).innerHTML=values.length?values.map(make).join(''):'<tr><td colspan="'+columns+'">No records</td></tr>';};
async function load(){if(!token)throw Error('Please log in to your '+kind+' account first.');
 const r=await fetch(apiBase+'/admin/referral-v2/portal/'+kind,{headers:{Authorization:'Bearer '+token},cache:'no-store'}),data=await r.json().catch(()=>({}));
 if(!r.ok||data.status!=='success')throw Error(data.message||data.detail||'Referral portal is not available');
 const d=data.data,p=d.participant,w=d.wallet||{};
 const metrics=[['Direct agents',d.directAgents],['Direct merchants',d.directMerchants],['All downline agents',d.totalAgents],['All downline merchants',d.totalMerchants],['Referral wallet RM',fmt(w.balance)],['Available RM',fmt(w.available)]];
 $('r2PortalMetrics').innerHTML=metrics.map(([k,v])=>'<div class="col-md-4"><div class="card p-3 h-100"><span>'+esc(k)+'</span><strong class="fs-4">'+esc(v)+'</strong></div></div>').join('');
 $('r2PortalProfile').textContent=p.display_name+' | '+p.kind+' | Member #'+p.id+' | Upstream referrer #'+(p.parent_id??'none');
 renderRows('r2PortalLedger',d.commissionHistory,l=>'<tr>'+[l.created_at,l.entry_type,fmt(l.amount),fmt(l.reserved_delta),l.event_key].map(cell).join('')+'</tr>',5);
 renderRows('r2PortalPayouts',d.payoutHistory,w=>'<tr>'+[w.reference,fmt(w.amount),w.status,w.payout_reference||'-'].map(cell).join('')+'</tr>',4);
 $('r2PortalStatus').textContent='Referral records loaded';
}
$('r2PortalWithdraw')?.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;const payload=Object.fromEntries(new FormData(form));
 if(!window.confirm('Request a withdrawal of RM '+payload.amount+' from your referral wallet?'))return;
 try{const r=await fetch(apiBase+'/admin/referral-v2/portal/withdrawals',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const data=await r.json().catch(()=>({}));if(!r.ok||data.status!=='success')throw Error(data.message||data.detail||'Withdrawal failed');
 form.reset();await load();$('r2PortalStatus').textContent='Withdrawal requested for approval';}
 catch(err){$('r2PortalStatus').textContent=err.message;$('r2PortalStatus').className='alert alert-danger mt-3';}
});
load().catch(err=>{$('r2PortalStatus').className='alert alert-danger mt-3';$('r2PortalStatus').textContent=err.message;});
})();
