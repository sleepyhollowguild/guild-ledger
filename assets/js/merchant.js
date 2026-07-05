import { ref, onValue, update, remove, increment } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { db } from './firebaseApp.js';
import { $, esc, toast, money, tierLabel, setupBackToTop, adjustmentKey, todayKey, colorSortValue, typeSortValue } from './shared.js';

const state = { orders:{}, sales:{}, members:{}, filter:'active' };
const statusRank = {waiting:0,pulling:1,ready:2,completed:3,cancelled:4};

function fmtTime(ms){try{return new Date(ms).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'});}catch(e){return ''}}
function statusLabel(s){return {waiting:'🟡 Waiting',pulling:'🔵 Pulling',ready:'🟢 Ready',completed:'⚫ Completed',cancelled:'🔴 Cancelled'}[s]||s}
function sortedPullItems(items=[]){const rank={'Showcase':0,'$1 Binder':1,'Bulk':2}; return [...items].sort((a,b)=>(rank[a.tier]??9)-(rank[b.tier]??9)||String(a.location||'').localeCompare(String(b.location||''))||colorSortValue(a.color)-colorSortValue(b.color)||typeSortValue(a)-typeSortValue(b)||String(a.name||'').localeCompare(String(b.name||'')));}
function typeLabel(it){return it.cardType || (Array.isArray(it.typeGroups)&&it.typeGroups.length?it.typeGroups.join(' / '):(it.typeLine||'Unknown Type'))}

function orderList(){
  let arr=Object.values(state.orders||{}).filter(Boolean);
  const f=state.filter;
  if(f==='active') arr=arr.filter(o=>!['completed','cancelled'].includes(o.status));
  else if(f!=='all') arr=arr.filter(o=>o.status===f);
  return arr.sort((a,b)=>(statusRank[a.status]??9)-(statusRank[b.status]??9)|| (a.createdAt||0)-(b.createdAt||0));
}

function render(){
  if(state.filter==='members'){ renderMembers(); return; }
  const arr=orderList();
  $('orders').innerHTML=arr.map(orderCard).join('');
  $('empty').classList.toggle('hidden',arr.length!==0);
  const all=Object.values(state.orders||{});
  const active=all.filter(o=>!['completed','cancelled'].includes(o.status)).length;
  $('livePill').textContent=`${active} active order${active===1?'':'s'}`;
  const today=todayKey();
  const completedToday=Object.values((state.sales||{})[today]||{});
  $('salesPill').textContent=`${completedToday.length} completed today • ${money(completedToday.reduce((a,o)=>a+Number(o.subtotal||0),0))}`;
}

function orderCard(o){
  const checked=(o.items||[]).filter(i=>i.checked).length;
  const total=(o.items||[]).length;
  return `<article class="orderCard"><div class="orderHead"><div><div class="orderName">${esc(o.customerName||'Unknown')}</div><div class="tiny">Order ${esc((o.orderId||'').slice(-5).toUpperCase())} • ${fmtTime(o.createdAt)} • ${o.itemCount||0} relics</div></div><span class="orderStatus ${esc(o.status)}">${statusLabel(o.status)}</span></div><div class="totalBox">${money(o.subtotal)}<div class="tiny">${checked}/${total} lines pulled</div></div><div class="recordActions"><button onclick="openOrder('${esc(o.orderId)}')">Open Pull List</button><button class="blue" onclick="setStatus('${esc(o.orderId)}','pulling')">Pulling</button><button class="success" onclick="setStatus('${esc(o.orderId)}','ready')">Ready</button></div><div class="recordActions"><button class="secondary" onclick="completeOrder('${esc(o.orderId)}')">Complete Sale</button><button class="danger" onclick="cancelOrder('${esc(o.orderId)}')">Cancel</button></div></article>`;
}

window.setStatus=async function(id,status){
  await update(ref(db,'orders/'+id),{status, updatedAt:Date.now()});
  toast(statusLabel(status));
}

window.completeOrder=async function(id){
  const o=state.orders[id]; if(!o)return;
  if(o.status==='completed'){toast('Sale already completed');return;}
  if(!confirm(`Complete sale for ${o.customerName} at ${money(o.subtotal)}? This will remove the sold quantities from the live customer inventory.`))return;
  const completedAt=Date.now();
  const completedOrder={...o,status:'completed',completedAt,updatedAt:completedAt};
  const updates={};
  updates['orders/'+id+'/status']='completed';
  updates['orders/'+id+'/completedAt']=completedAt;
  updates['orders/'+id+'/updatedAt']=completedAt;
  updates['sales/'+todayKey()+'/'+id]=completedOrder;
  (o.items||[]).forEach(it=>{ updates['inventoryAdjustments/'+adjustmentKey(it.key)] = increment(Number(it.quantity)||0); });
  await update(ref(db), updates);
  toast('Sale completed. Live inventory updated.');
}

window.cancelOrder=async function(id){
  const o=state.orders[id]; if(!o)return;
  if(!confirm(`Cancel order for ${o.customerName}?`))return;
  await update(ref(db,'orders/'+id),{status:'cancelled', cancelledAt:Date.now(), updatedAt:Date.now()});
  toast('Order cancelled');
}

window.openOrder=function(id){
  const o=state.orders[id]; if(!o)return;
  const rows=sortedPullItems((o.items||[]).map((it,idx)=>({...it,_idx:idx}))).map((it)=>`<label class="checkRow"><input type="checkbox" ${it.checked?'checked':''} onchange="toggleItem('${esc(id)}',${it._idx},this.checked)"><span><b>${esc(it.name)} × ${it.quantity}</b><div class="tiny"><strong>${esc(it.color||'Unknown')}</strong> • ${esc(typeLabel(it))}<br>${esc(it.location||tierLabel(it.tier))} • ${esc(it.setCode)} #${esc(it.collector)} • ${esc(it.condition)} / ${esc(it.foil)} • ${money(it.priceEach)}</div></span></label>`).join('');
  $('modalCard').innerHTML=`<div class="orderHead"><div><div class="orderName">${esc(o.customerName||'Unknown')}</div><div class="tiny">Order ${esc((o.orderId||'').slice(-5).toUpperCase())} • ${fmtTime(o.createdAt)}</div></div><span class="orderStatus ${esc(o.status)}">${statusLabel(o.status)}</span></div><div class="totalBox">Total for Square: ${money(o.subtotal)}</div><div class="note">Pull the relics below, then mark the order ready. After payment in Square, complete the sale.</div><div class="pullList">${rows}</div><div class="recordActions"><button class="blue" onclick="setStatus('${esc(id)}','pulling')">Pulling</button><button class="success" onclick="setStatus('${esc(id)}','ready')">Ready</button><button class="secondary" onclick="completeOrder('${esc(id)}');closeModal()">Complete Sale</button><button class="ghost" onclick="closeModal()">Close</button></div>`;
  $('modal').classList.remove('hidden');
}

window.toggleItem=async function(id,idx,checked){
  const o=state.orders[id]; if(!o||!o.items)return;
  const items=[...o.items]; items[idx]={...items[idx], checked};
  await update(ref(db,'orders/'+id),{items, updatedAt:Date.now()});
}
window.closeModal=()=>$('modal').classList.add('hidden');


function memberList(){
  return Object.values(state.members||{}).filter(Boolean).sort((a,b)=>(b.joinedAt||0)-(a.joinedAt||0));
}
function renderMembers(){
  const members=memberList();
  $('orders').innerHTML=members.map(memberCard).join('');
  $('empty').classList.toggle('hidden',members.length!==0);
  $('livePill').textContent=`${members.length} Guild member${members.length===1?'':'s'}`;
  const today=todayKey();
  const joinedToday=members.filter(m=>new Date(m.joinedAt||0).toISOString().slice(0,10)===today).length;
  $('salesPill').textContent=`${joinedToday} joined today`;
}
function memberCard(m){
  const interests=Array.isArray(m.interests)?m.interests.join(', '):String(m.interests||'');
  return `<article class="orderCard"><div class="orderHead"><div><div class="orderName">${esc(m.name||'Unknown')}</div><div class="tiny">Joined ${m.joinedAt?new Date(m.joinedAt).toLocaleString():''}</div></div><span class="orderStatus ready">Guild Member</span></div><div class="line"><div class="lineName">${esc(m.email||'')}</div><div class="tiny">${esc(m.phone||'No phone listed')}</div></div><div class="note">${esc(interests||'No interests selected')}</div></article>`;
}
function exportMembers(){
  const members=memberList();
  if(!members.length){toast('No Guild members to export');return}
  const rows=members.map(m=>({joinedAt:m.joinedAt?new Date(m.joinedAt).toISOString():'', memberId:m.memberId||'', name:m.name||'', email:m.email||'', phone:m.phone||'', interests:Array.isArray(m.interests)?m.interests.join('; '):String(m.interests||''), source:m.source||'Guild Ledger'}));
  const headers=Object.keys(rows[0]);
  const csv=[headers.join(',')].concat(rows.map(r=>headers.map(h=>`"${String(r[h]??'').replace(/"/g,'""')}"`).join(','))).join('\n');
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='sleepy_hollow_guild_members_'+new Date().toISOString().slice(0,10)+'.csv'; a.click(); URL.revokeObjectURL(a.href);
}

function exportSales(){
  const allSales=[];
  Object.values(state.sales||{}).forEach(day=>Object.values(day||{}).forEach(o=>allSales.push(o)));
  const orders=allSales.length?allSales:Object.values(state.orders||{}).filter(o=>o.status==='completed');
  if(!orders.length){toast('No completed sales to export');return}
  const rows=[];
  orders.forEach(o=>(o.items||[]).forEach(it=>rows.push({completedAt:new Date(o.completedAt||o.createdAt).toISOString(), orderId:o.orderId, customerName:o.customerName, manaBoxId:it.manaBoxId, scryfallId:it.scryfallId, name:it.name, color:it.color||'Unknown', cardType:typeLabel(it), typeLine:it.typeLine||'', setCode:it.setCode, setName:it.setName, collector:it.collector, foil:it.foil, condition:it.condition, quantity:it.quantity, tier:it.tier, priceEach:it.priceEach, total:it.total})));
  const headers=Object.keys(rows[0]);
  const csv=[headers.join(',')].concat(rows.map(r=>headers.map(h=>`"${String(r[h]??'').replace(/"/g,'""')}"`).join(','))).join('\n');
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='sleepy_hollow_sold_cards_'+new Date().toISOString().slice(0,10)+'.csv'; a.click(); URL.revokeObjectURL(a.href);
}

async function hideCompleted(){
  const done=Object.values(state.orders||{}).filter(o=>['completed','cancelled'].includes(o.status));
  if(!done.length){toast('No completed/cancelled orders to hide');return}
  if(!confirm(`Remove ${done.length} completed/cancelled orders from the live queue? Sales stay in the export ledger.`))return;
  await Promise.all(done.map(o=>remove(ref(db,'orders/'+o.orderId))));
  toast('Queue cleaned');
}

function openInventoryUpdater(){ window.open('../tools/inventory-updater.html','_blank'); }
async function resetMarketDay(){
  if(!confirm('Reset live market deductions? Only do this AFTER exporting sold cards and updating ManaBox / inventory.js.')) return;
  await remove(ref(db,'inventoryAdjustments'));
  toast('Live inventory deductions reset');
}
window.openInventoryUpdater=openInventoryUpdater;
window.resetMarketDay=resetMarketDay;

document.querySelectorAll('.merchantTabs button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.merchantTabs button').forEach(x=>x.classList.remove('active'));
  b.classList.add('active'); state.filter=b.dataset.filter; render();
});
$('exportBtn').onclick=exportSales; $('exportMembersBtn').onclick=exportMembers;
$('clearCompletedBtn').onclick=hideCompleted;
$('modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});

onValue(ref(db,'orders'), snap=>{state.orders=snap.val()||{}; Object.entries(state.orders).forEach(([id,o])=>{if(!o.orderId)o.orderId=id}); render();}, err=>{console.error(err); $('livePill').textContent='Firebase connection failed'; alert('Firebase connection failed. Check database rules and config.');});
onValue(ref(db,'sales'), snap=>{state.sales=snap.val()||{}; render();});
onValue(ref(db,'guildMembers'), snap=>{state.members=snap.val()||{}; render();});
setupBackToTop();
