export const REMOVED_IDS = new Set(['83583','83517','83162','83205']);
export const REMOVED_SCRY = new Set(['e0a5630d-325f-4f7a-9885-b249c6480023','ce65226a-12cd-416a-bb60-12e9b35f609b','69b32f90-b32f-41a6-af0c-1c967ec49b73','77759762-8684-4513-92c5-72c86d43b8bd']);
export const $ = id => document.getElementById(id);
export const money = n => Number.isFinite(Number(n)) ? '$' + Number(n).toFixed(2) : 'Ask';
export function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
export function toast(msg){const t=$('toast'); if(!t){alert(msg);return;} t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
export function tierLabel(t){return t==='Bulk'?'Common Stock':t==='$1 Binder'?'Merchant Shelf':t==='Showcase'?'Curiosities Cabinet':t}
export function imgUrl(c,version='normal'){return String(c.image||'').replace(/version=(small|normal|large|png)/,'version='+version)}
export function colorLabel(colors){colors=Array.isArray(colors)?colors:[]; if(!colors.length)return 'Colorless'; if(colors.length>1)return 'Multicolor'; return ({W:'White',U:'Blue',B:'Black',R:'Red',G:'Green'}[colors[0]]||colors[0])}
export function typeGroups(typeLine){const t=String(typeLine||''); const groups=[]; if(/Legendary/i.test(t)) groups.push('Legendary'); ['Creature','Artifact','Enchantment','Instant','Sorcery','Land','Planeswalker','Battle'].forEach(x=>{if(new RegExp(x,'i').test(t))groups.push(x)}); if(/Token/i.test(t))groups.push('Token'); if(!groups.length)groups.push('Other'); return groups}
export function cardTypeLabel(card){const groups=Array.isArray(card?.typeGroups)?card.typeGroups:[]; if(groups.length&&groups[0]!=='Unknown')return groups.join(' / '); return card?.typeLine || 'Unknown Type'}
export function colorSortValue(color){return {'White':1,'Blue':2,'Black':3,'Red':4,'Green':5,'Multicolor':6,'Colorless':7,'Unknown':8}[color||'Unknown']||9}
export function typeSortValue(card){const groups=Array.isArray(card?.typeGroups)?card.typeGroups:[]; const primary=groups.find(g=>g!=='Legendary')||groups[0]||'Unknown'; return {'Creature':1,'Legendary':2,'Artifact':3,'Enchantment':4,'Instant':5,'Sorcery':6,'Land':7,'Planeswalker':8,'Battle':9,'Token':10,'Other':11,'Unknown':12}[primary]||13}
export function normalizeInventory(raw){
  const merged = new Map();
  (raw || []).filter(c=>!REMOVED_IDS.has(String(c.id)) && !REMOVED_IDS.has(String(c.manaBoxId)) && !REMOVED_SCRY.has(String(c.scryfallId))).forEach(c=>{
    const key = c.key || [c.scryfallId,c.id,c.foil,c.condition,c.salePrice].join('-');
    const price = Number(c.salePrice);
    const cleaned = {...c, key, quantity:Number(c.quantity)||0, salePrice:isFinite(price)?price:null};
    cleaned.color = cleaned.color || 'Unknown';
    cleaned.typeLine = cleaned.typeLine || '';
    cleaned.typeGroups = Array.isArray(cleaned.typeGroups) && cleaned.typeGroups.length ? cleaned.typeGroups : ['Unknown'];
    cleaned.search = ((cleaned.search||'')+' '+(cleaned.name||'')+' '+(cleaned.setName||'')+' '+(cleaned.setCode||'')+' '+cleaned.color+' '+cleaned.typeLine+' '+cleaned.typeGroups.join(' ')).toLowerCase();
    if(!merged.has(key)) merged.set(key, cleaned); else merged.get(key).quantity += cleaned.quantity;
  });
  return Array.from(merged.values());
}
export function cartItems(cart, inventory){return Object.entries(cart).map(([key,qty])=>({card:inventory.find(c=>c.key===key),qty})).filter(x=>x.card&&x.qty>0)}
export function totals(items){const bulkQty=items.filter(x=>x.card.tier==='Bulk').reduce((a,x)=>a+x.qty,0); let subtotal=0, bulkFull=0, bulkDiscount=0; items.forEach(({card,qty})=>{let p=Number(card.salePrice)||0; if(card.tier==='Bulk'){bulkFull += qty*p; subtotal += qty*(bulkQty>=4?0.25:p)} else subtotal += qty*p}); if(bulkQty>=4) bulkDiscount=bulkFull-(bulkQty*0.25); return {subtotal,bulkQty,bulkDiscount,count:items.reduce((a,x)=>a+x.qty,0)}}
export function pullSorted(items){const rank={'Showcase':0,'$1 Binder':1,'Bulk':2}; return [...items].sort((a,b)=>(rank[a.card.tier]??9)-(rank[b.card.tier]??9)||String(a.card.location||'').localeCompare(String(b.card.location||''))||colorSortValue(a.card.color)-colorSortValue(b.card.color)||typeSortValue(a.card)-typeSortValue(b.card)||a.card.name.localeCompare(b.card.name))}

export function adjustmentKey(key){
  try { return btoa(unescape(encodeURIComponent(String(key)))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_'); }
  catch(e){ return String(key).replace(/[.#$/\[\]]/g,'_'); }
}
export function todayKey(){ return new Date().toISOString().slice(0,10); }

export function makeOrderPayload(customerName, items){const t=totals(items); return { customerName: customerName.trim(), createdAt: Date.now(), status: 'waiting', subtotal: Number(t.subtotal.toFixed(2)), bulkQty:t.bulkQty, bulkDiscount:Number(t.bulkDiscount.toFixed(2)), itemCount:t.count, items: pullSorted(items).map(({card,qty})=>({key:card.key, manaBoxId:card.id||card.manaBoxId||'', scryfallId:card.scryfallId||'', name:card.name, setCode:card.setCode, setName:card.setName, collector:card.collector, foil:card.foil, condition:card.condition, color:card.color||'Unknown', typeLine:card.typeLine||'', typeGroups:Array.isArray(card.typeGroups)?card.typeGroups:[], cardType:cardTypeLabel(card), quantity:qty, tier:card.tier, location:card.location||tierLabel(card.tier), priceEach:Number(card.salePrice)||0, total:Number(((Number(card.salePrice)||0)*qty).toFixed(2)), checked:false }))};}
export function setupBackToTop(){const btn=$('topBtn'); if(!btn)return; const toggle=()=>btn.classList.toggle('show', window.scrollY>600); window.addEventListener('scroll',toggle,{passive:true}); btn.onclick=()=>window.scrollTo({top:0,behavior:'smooth'}); toggle();}
