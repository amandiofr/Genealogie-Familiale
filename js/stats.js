// ══════════════════════════════════════════════════════════════
//  STATS
// ══════════════════════════════════════════════════════════════
function renderStats(){
  const total=people.length, living=people.filter(p=>p.vivant&&!p.deces).length;
  const gens=[...new Set(people.map(p=>p.generation))].length;
  document.getElementById('stats-grid').innerHTML=[
    {n:total,l:T('stat_membres')},
    {n:living,l:T('stat_vivants')},
    {n:total-living,l:T('stat_decedes')},
    {n:gens,l:T('stat_gens')},
    {n:people.filter(p=>p.profession).length,l:T('stat_professions')},
    {n:people.filter(p=>p.photo_id).length,l:T('stat_photos')},
  ].map(s=>`<div class="stat-card"><div class="stat-num">${s.n}</div><div class="stat-label">${s.l}</div></div>`).join('');

  const genBreak={};
  people.forEach(p=>{genBreak[p.generation]=(genBreak[p.generation]||0)+1;});
  const rows=Object.entries(genBreak).sort((a,b)=>a[0]-b[0]).map(([g,n])=>{
    const pct=Math.round(n/total*100);
    return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
      <span style="font-size:.73rem;color:var(--ink2);width:200px;flex-shrink:0;">${genLabel(Number(g))}</span>
      <div style="flex:1;background:var(--bg2);border-radius:4px;height:7px;overflow:hidden;"><div style="background:var(--accent2);width:${pct}%;height:100%;border-radius:4px;"></div></div>
      <span style="font-size:.75rem;color:var(--ink3);width:28px;text-align:right;">${n}</span>
    </div>`;
  }).join('');
  const oldest=people.filter(p=>!p.vivant&&p.naissance).sort((a,b)=>calcAge(b)-calcAge(a))[0];
  document.getElementById('stats-extra').innerHTML=`
    <div class="form-card" style="margin-top:.5rem;">
      <div class="form-title" style="margin-bottom:.9rem;">${T('h_repartition')}</div>${rows}
    </div>
    ${oldest?`<div style="background:var(--accent3);border-radius:var(--r);padding:1rem 1.2rem;margin-top:.8rem;">
      <div style="font-size:.65rem;text-transform:uppercase;letter-spacing:.08em;color:var(--accent);margin-bottom:5px;">${T('h_longevite')}</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:1.05rem;">${fullName(oldest)} — ${calcAge(oldest)} ${T('stat_ans')}</div>
    </div>`:''}`;
}

