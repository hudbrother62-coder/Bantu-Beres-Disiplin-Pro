'use client';
import {useEffect,useMemo,useState} from 'react';
import {ClipboardList,Download,FileText,Filter,Printer,ShieldCheck,TrendingUp,Users} from 'lucide-react';
import {sb} from './client';
import {exportRecapDocx,exportRecapPdf} from './document-export';
import './discipline-recap.css';

const isoDay=(d:Date)=>{const x=new Date(d);x.setMinutes(x.getMinutes()-x.getTimezoneOffset());return x.toISOString().slice(0,10)};
const monthStart=()=>{const d=new Date();return isoDay(new Date(d.getFullYear(),d.getMonth(),1))};
const today=()=>isoDay(new Date());
const human=(v:any)=>{try{return new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v))}catch{return String(v||'-')}};
const norm=(v:any)=>String(v??'').trim().toLowerCase().replace(/\s+/g,' ');
const statusLabel=(v:any)=>v==='completed'?'Selesai':v==='pending'?'Belum selesai':String(v||'Belum selesai');

function buildIdentity(students:any[]){
 const nisOwners=new Map<string,string>();
 const sameNameClass=new Map<string,any[]>();
 for(const s of students||[]){
  const n=norm(s.nis);
  if(n)nisOwners.set(s.id,'nis:'+n);
  const key=norm(s.name)+'|'+norm(s.class_name);
  if(!sameNameClass.has(key))sameNameClass.set(key,[]);
  sameNameClass.get(key)!.push(s);
 }
 const keyById=new Map<string,string>();
 for(const s of students||[]){if(nisOwners.has(s.id))keyById.set(s.id,nisOwners.get(s.id)!)}
 for(const group of sameNameClass.values()){
  const distinct=new Set(group.map(s=>norm(s.nis)).filter(Boolean));
  for(const s of group){
   if(keyById.has(s.id))continue;
   if(distinct.size===1)keyById.set(s.id,'nis:'+Array.from(distinct)[0]);
   else keyById.set(s.id,'id:'+s.id);
  }
 }
 const meta=new Map<string,any>();
 for(const s of students||[]){
  const key=keyById.get(s.id)||'id:'+s.id;
  const current=meta.get(key);
  if(!current||(!current.nis&&s.nis))meta.set(key,{id:key,name:s.name||'Siswa',class_name:s.class_name||'-',nis:s.nis||'-',record_count:0,student_ids:[]});
 }
 for(const s of students||[]){
  const key=keyById.get(s.id)||'id:'+s.id;
  const m=meta.get(key)||{id:key,name:s.name||'Siswa',class_name:s.class_name||'-',nis:s.nis||'-',record_count:0,student_ids:[]};
  m.record_count=(m.record_count||0)+1;
  m.student_ids.push(s.id);
  meta.set(key,m);
 }
 return {keyById,meta};
}

function TrendChart({data,metric,setMetric}:{data:any[];metric:'count'|'points';setMetric:(v:'count'|'points')=>void}){
 const width=900,height=210,padX=45,padTop=18,padBottom=42;
 const values=data.map(x=>Number(x[metric]||0));
 const max=Math.max(1,...values);
 const x=(i:number)=>data.length<=1?width/2:padX+(i*(width-padX*2)/(data.length-1));
 const y=(v:number)=>padTop+(height-padTop-padBottom)*(1-v/max);
 const pts=data.map((d,i)=>x(i)+','+y(Number(d[metric]||0))).join(' ');
 const step=Math.max(1,Math.ceil(data.length/7));
 return <section className="trendCard">
  <div className="trendHead"><div><span><TrendingUp/> KURVA TREN</span><h3>Tren Pelanggaran</h3><p>Kurva dihitung dari catatan kejadian pada periode dan filter yang dipilih.</p></div><div className="trendToggle"><button type="button" className={metric==='count'?'active':''} onClick={()=>setMetric('count')}>Jumlah kejadian</button><button type="button" className={metric==='points'?'active':''} onClick={()=>setMetric('points')}>Total poin</button></div></div>
  {data.length?<div className="trendSvgWrap"><svg viewBox={'0 0 '+width+' '+height} role="img" aria-label="Kurva tren pelanggaran">
   {[0,.25,.5,.75,1].map(t=><g key={t}><line x1={padX} y1={y(max*t)} x2={width-padX} y2={y(max*t)} className="trendGrid"/><text x={padX-8} y={y(max*t)+3} textAnchor="end" className="trendAxis">{Math.round(max*t)}</text></g>)}
   <polyline points={pts} className="trendLine"/>
   {data.map((d,i)=><g key={d.label+'-'+i}><circle cx={x(i)} cy={y(Number(d[metric]||0))} r="4" className="trendDot"><title>{d.label+': '+d[metric]}</title></circle>{(i%step===0||i===data.length-1)&&<text x={x(i)} y={height-16} textAnchor="middle" className="trendAxis">{d.shortLabel}</text>}</g>)}
  </svg></div>:<div className="trendEmpty">Belum ada data pelanggaran pada filter ini.</div>}
 </section>;
}

export default function DisciplineRecapPage({school,students,master}:any){
 const [start,setStart]=useState(monthStart());
 const [end,setEnd]=useState(today());
 const [className,setClassName]=useState('__all__');
 const [studentId,setStudentId]=useState('__all__');
 const [kind,setKind]=useState<'all'|'violation'|'achievement'|'coaching'>('all');
 const [minPoints,setMinPoints]=useState('');
 const [trendMetric,setTrendMetric]=useState<'count'|'points'>('count');
 const [incidents,setIncidents]=useState<any[]>([]);
 const [coaching,setCoaching]=useState<any[]>([]);
 const [actions,setActions]=useState<any[]>([]);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');

 const identity=useMemo(()=>buildIdentity(students||[]),[students]);
 const keyFor=(id:string)=>identity.keyById.get(id)||'id:'+id;

 async function fetchPaged(table:string,select:string,dateColumn:string){
  const all:any[]=[];let from=0;
  while(true){
   const {data,error}=await sb.from(table).select(select).eq('school_id',school.id).gte(dateColumn,start+'T00:00:00').lte(dateColumn,end+'T23:59:59.999').order(dateColumn,{ascending:false}).range(from,from+999);
   if(error)throw error;
   const rows=data||[];
   all.push(...rows);
   if(rows.length<1000)break;
   from+=1000;
  }
  return all;
 }
 async function fetchAll(table:string,select:string,orderColumn:string){
  const all:any[]=[];let from=0;
  while(true){
   const {data,error}=await sb.from(table).select(select).eq('school_id',school.id).order(orderColumn,{ascending:false}).range(from,from+999);
   if(error)throw error;
   const rows=data||[];
   all.push(...rows);
   if(rows.length<1000)break;
   from+=1000;
  }
  return all;
 }

 async function load(){
  if(!school?.id)return;
  setBusy(true);setMessage('');
  try{
   const [i,c,a]=await Promise.all([
    fetchPaged('incidents','id,student_id,type,item_name_snapshot,category_snapshot,points_snapshot,occurred_at,chronology,recorder_name,students(name,class_name,nis,status)','occurred_at'),
    fetchPaged('coaching_sessions','id,student_id,reason,form,result,notes,follow_up_date,status,recorder_name,happened_at,students(name,class_name,nis,status)','happened_at'),
    fetchAll('student_actions','id,student_id,sanction_name_snapshot,threshold_points,status,notes,due_date,completed_at,created_at,students(name,class_name,nis,status)','created_at')
   ]);
   setIncidents(i);setCoaching(c);setActions(a);
  }catch(e:any){setMessage(e?.message||'Rekap belum dapat dimuat.')}
  finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[school?.id,start,end]);

 const classOptions=useMemo(()=>Array.from(new Set((students||[]).map((s:any)=>String(s.class_name||'').trim()).filter(Boolean))).sort((a:any,b:any)=>a.localeCompare(b,'id',{numeric:true})),[students]);
 const selectedStudentKey=studentId==='__all__'?null:keyFor(studentId);
 const passes=(row:any)=>{
  const meta=identity.meta.get(keyFor(row.student_id))||row.students||{};
  if(className!=='__all__'&&String(meta.class_name||'')!==className)return false;
  if(selectedStudentKey&&keyFor(row.student_id)!==selectedStudentKey)return false;
  return true;
 };
 const filteredIncidents=useMemo(()=>incidents.filter(x=>passes(x)&&(kind==='all'||kind===x.type)),[incidents,className,studentId,kind,identity]);
 const baseViolations=useMemo(()=>incidents.filter(x=>passes(x)&&x.type==='violation'),[incidents,className,studentId,identity]);
 const filteredCoaching=useMemo(()=>coaching.filter(x=>passes(x)&&(kind==='all'||kind==='coaching')),[coaching,className,studentId,kind,identity]);
 const filteredActions=useMemo(()=>actions.filter(passes),[actions,className,studentId,identity]);
 const sanctions=useMemo(()=>(master||[]).filter((m:any)=>m.type==='sanction'&&m.is_active!==false),[master]);

 function schoolRules(points:number){
  const names=sanctions.filter((m:any)=>{
   const min=m.min_points===null||m.min_points===undefined?null:Number(m.min_points);
   const max=m.max_points===null||m.max_points===undefined?null:Number(m.max_points);
   return (min===null||points>=min)&&(max===null||points<=max);
  }).map((m:any)=>String(m.name||'').trim()).filter(Boolean);
  return Array.from(new Set(names));
 }

 function deriveData(i:any[],c:any[],a:any[]){
  const map=new Map<string,any>();
  const ensure=(sid:string,row:any)=>{
   const key=keyFor(sid);
   if(!map.has(key)){
    const m=identity.meta.get(key)||{id:key,name:row.students?.name||'Siswa',class_name:row.students?.class_name||'-',nis:row.students?.nis||'-',record_count:1};
    map.set(key,{...m,violations:0,violation_points:0,achievements:0,achievement_points:0,coaching:0,open_coaching:0,actions:0,violation_items:new Map<string,any>(),action_items:[]});
   }
   return map.get(key);
  };
  i.forEach(x=>{
   const r=ensure(x.student_id,x);
   if(x.type==='violation'){
    r.violations++;
    r.violation_points+=Number(x.points_snapshot||0);
    const name=x.item_name_snapshot||'Pelanggaran';
    const old=r.violation_items.get(name)||{count:0,points:0};
    old.count++;old.points+=Number(x.points_snapshot||0);
    r.violation_items.set(name,old);
   }else{
    r.achievements++;
    r.achievement_points+=Number(x.points_snapshot||0);
   }
  });
  c.forEach(x=>{const r=ensure(x.student_id,x);r.coaching++;if(x.status!=='completed')r.open_coaching++});
  a.forEach(x=>{const r=ensure(x.student_id,x);r.actions++;r.action_items.push({name:x.sanction_name_snapshot||'Tindak lanjut',status:x.status||'pending'})});
  const min=minPoints===''?null:Math.max(0,Number(minPoints)||0);
  const rows=Array.from(map.values()).map((r:any)=>{
   const violation_list=Array.from(r.violation_items.entries()).map(([name,v]:any)=>name+' ('+v.count+'×, '+v.points+' poin)').join('; ')||'-';
   const actual=Array.from(new Set(r.action_items.map((x:any)=>x.name+' — '+statusLabel(x.status))));
   const rules=schoolRules(r.violation_points);
   const follow_up=actual.length?actual.join('; '):rules.length?('Aturan sekolah: '+rules.slice(0,3).join('; ')+(rules.length>3?' +'+(rules.length-3)+' lainnya':'')):'Belum dicatat';
   return {...r,violation_list,follow_up};
  }).filter((r:any)=>min===null||r.violation_points>=min)
    .sort((x:any,y:any)=>x.class_name.localeCompare(y.class_name,'id',{numeric:true})||x.name.localeCompare(y.name,'id'));
  const allowed=new Set(rows.map((r:any)=>r.id));
  const fi=i.filter(x=>allowed.has(keyFor(x.student_id)));
  const fc=c.filter(x=>allowed.has(keyFor(x.student_id)));
  const fa=a.filter(x=>allowed.has(keyFor(x.student_id)));
  const timeline:any[]=[
   ...fi.map(x=>({date:x.occurred_at,student:identity.meta.get(keyFor(x.student_id))?.name||x.students?.name||'Siswa',class_name:identity.meta.get(keyFor(x.student_id))?.class_name||x.students?.class_name||'-',type:x.type==='violation'?'Pelanggaran':'Prestasi',title:x.item_name_snapshot||'-',detail:x.chronology||x.category_snapshot||'-',status:String(x.points_snapshot||0)+' poin',recorder:x.recorder_name||'-'})),
   ...fc.map(x=>({date:x.happened_at,student:identity.meta.get(keyFor(x.student_id))?.name||x.students?.name||'Siswa',class_name:identity.meta.get(keyFor(x.student_id))?.class_name||x.students?.class_name||'-',type:'Pembinaan',title:x.form||'Pembinaan',detail:x.result||x.reason||x.notes||'-',status:x.status||'-',recorder:x.recorder_name||'-'}))
  ].sort((x:any,y:any)=>new Date(y.date).getTime()-new Date(x.date).getTime());
  const metrics={
   studentCount:rows.length,
   incidentCount:fi.length,
   coachingCount:fc.length,
   coachingOpen:fc.filter((x:any)=>x.status!=='completed').length,
   violationPoints:fi.filter((x:any)=>x.type==='violation').reduce((n:number,x:any)=>n+Number(x.points_snapshot||0),0),
   achievementPoints:fi.filter((x:any)=>x.type==='achievement').reduce((n:number,x:any)=>n+Number(x.points_snapshot||0),0),
   pendingActions:fa.filter((x:any)=>x.status!=='completed').length
  };
  return {summaryRows:rows,timeline,metrics,allowed};
 }

 const derived=useMemo(()=>deriveData(filteredIncidents,filteredCoaching,filteredActions),[filteredIncidents,filteredCoaching,filteredActions,minPoints,identity,sanctions]);
 const summaryRows=derived.summaryRows;
 const timeline=derived.timeline;
 const metrics=derived.metrics;

 function makeTrend(rows:any[],allowed:Set<string>){
  const source=rows.filter(x=>allowed.has(keyFor(x.student_id)));
  const days=Math.max(1,Math.round((new Date(end+'T00:00:00').getTime()-new Date(start+'T00:00:00').getTime())/86400000)+1);
  const mode=days<=45?'day':days<=180?'week':'month';
  const buckets=new Map<string,any>();
  for(const x of source){
   const d=new Date(x.occurred_at);
   let key='',label='',shortLabel='',sort=0;
   if(mode==='day'){
    key=isoDay(d);label=new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short'}).format(d);shortLabel=label;sort=new Date(key+'T00:00:00').getTime();
   }else if(mode==='week'){
    const local=new Date(d.getFullYear(),d.getMonth(),d.getDate());local.setDate(local.getDate()-((local.getDay()+6)%7));
    key=isoDay(local);label='Minggu '+new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short'}).format(local);shortLabel=new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short'}).format(local);sort=local.getTime();
   }else{
    key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');label=new Intl.DateTimeFormat('id-ID',{month:'short',year:'numeric'}).format(d);shortLabel=new Intl.DateTimeFormat('id-ID',{month:'short'}).format(d);sort=new Date(d.getFullYear(),d.getMonth(),1).getTime();
   }
   const b=buckets.get(key)||{label,shortLabel,count:0,points:0,sort};
   b.count++;b.points+=Number(x.points_snapshot||0);buckets.set(key,b);
  }
  return Array.from(buckets.values()).sort((a,b)=>a.sort-b.sort);
 }
 const trend=useMemo(()=>makeTrend(baseViolations,derived.allowed),[baseViolations,derived.allowed,start,end,identity]);

 async function fetchFreshExportData(){
  const [i,c,a]=await Promise.all([
   fetchPaged('incidents','id,student_id,type,item_name_snapshot,category_snapshot,points_snapshot,occurred_at,chronology,recorder_name,students(name,class_name,nis,status)','occurred_at'),
   fetchPaged('coaching_sessions','id,student_id,reason,form,result,notes,follow_up_date,status,recorder_name,happened_at,students(name,class_name,nis,status)','happened_at'),
   fetchAll('student_actions','id,student_id,sanction_name_snapshot,threshold_points,status,notes,due_date,completed_at,created_at,students(name,class_name,nis,status)','created_at')
  ]);
  const pass=(row:any)=>{
   const meta=identity.meta.get(keyFor(row.student_id))||row.students||{};
   if(className!=='__all__'&&String(meta.class_name||'')!==className)return false;
   if(selectedStudentKey&&keyFor(row.student_id)!==selectedStudentKey)return false;
   return true;
  };
  const fi=i.filter(x=>pass(x)&&(kind==='all'||kind===x.type));
  const fc=c.filter(x=>pass(x)&&(kind==='all'||kind==='coaching'));
  const fa=a.filter(pass);
  const result=deriveData(fi,fc,fa);
  const base=i.filter(x=>pass(x)&&x.type==='violation');
  return {...result,trend:makeTrend(base,result.allowed)};
 }

 const reportCode='DP-'+start.replaceAll('-','')+'-'+end.replaceAll('-','');
 const filtersText=(className!=='__all__'?'Kelas: '+className:'Semua kelas')+' · '+(studentId!=='__all__'?'Siswa terpilih':'Semua siswa')+' · '+(kind==='all'?'Semua jenis':kind==='violation'?'Pelanggaran':kind==='achievement'?'Prestasi':'Pembinaan')+(minPoints!==''?' · Poin pelanggaran ≥ '+minPoints:'');

 async function downloadWord(){
  if(busy)return;setBusy(true);setMessage('');
  try{
   const fresh=await fetchFreshExportData();
   if(!fresh.summaryRows.length){setMessage('Tidak ada siswa yang sesuai periode dan filter. Word kosong tidak dibuat.');return}
   await exportRecapDocx({school,start,end,filtersText,summaryRows:fresh.summaryRows,timeline:fresh.timeline,metrics:fresh.metrics,trend:fresh.trend});
   setMessage('Word .docx berhasil dibuat dari data terbaru sesuai filter.');
  }catch(e:any){setMessage(e?.message||'Word gagal dibuat.')}
  finally{setBusy(false)}
 }
 async function downloadPdf(){
  if(busy)return;setBusy(true);setMessage('');
  try{
   const fresh=await fetchFreshExportData();
   if(!fresh.summaryRows.length){setMessage('Tidak ada siswa yang sesuai periode dan filter. PDF kosong tidak dibuat.');return}
   await exportRecapPdf({school,start,end,filtersText,summaryRows:fresh.summaryRows,timeline:fresh.timeline,metrics:fresh.metrics,trend:fresh.trend});
   setMessage('PDF berhasil dibuat langsung dari data terbaru sesuai filter.');
  }catch(e:any){setMessage(e?.message||'PDF gagal dibuat.')}
  finally{setBusy(false)}
 }

 return <div className="page recap-page">
  <div className="pageLead recap-lead"><div><span className="recap-kicker"><ClipboardList/> REKAP OPERASIONAL</span><h1>Rekap Pembinaan & Catatan Kejadian</h1><p>Satu siswa satu baris, pelanggaran terkumpul, tindak lanjut terlihat, dan tren dapat dipantau tanpa mengubah data asli.</p></div><div className="recap-export"><button className="ghost" onClick={downloadWord} disabled={busy}><Download/> {busy?'Memproses...':'Unduh Word .docx'}</button><button className="primary" onClick={downloadPdf} disabled={busy}><Printer/> {busy?'Memproses...':'Unduh PDF'}</button></div></div>
  {message&&<p className="notice warning">{message}</p>}
  <section className="panel recap-filter advanced"><label>Mulai<input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label>Sampai<input type="date" value={end} min={start} onChange={e=>setEnd(e.target.value)}/></label><label>Kelas<select value={className} onChange={e=>{setClassName(e.target.value);setStudentId('__all__')}}><option value="__all__">Semua kelas</option>{classOptions.map((x:any)=><option key={x}>{x}</option>)}</select></label><label>Siswa<select value={studentId} onChange={e=>setStudentId(e.target.value)}><option value="__all__">Semua siswa</option>{(students||[]).filter((s:any)=>className==='__all__'||s.class_name===className).map((s:any)=><option key={s.id} value={s.id}>{s.name+(s.nis?' · '+s.nis:'')+(s.status==='inactive'?' (Arsip)':'')}</option>)}</select></label><label>Jenis<select value={kind} onChange={e=>setKind(e.target.value as any)}><option value="all">Semua</option><option value="violation">Pelanggaran</option><option value="achievement">Prestasi</option><option value="coaching">Pembinaan</option></select></label><label>Poin minimum<input type="number" min="0" inputMode="numeric" value={minPoints} onChange={e=>setMinPoints(e.target.value)} placeholder="Bebas, mis. 3"/></label><button className="ghost recap-refresh" onClick={()=>void load()} disabled={busy}><Filter/> {busy?'Memuat...':'Muat ulang'}</button></section>
  <p className="filterHint">Poin minimum bukan aturan aplikasi. Isi sesuai kebutuhan sekolah, atau kosongkan untuk menampilkan semua siswa.</p>
  <TrendChart data={trend} metric={trendMetric} setMetric={setTrendMetric}/>

  <section className="recap-paper">
   <header className="recap-paper-head"><div><h2>{school?.name||'Nama Sekolah'}</h2><p>NPSN {school?.npsn||'-'} · {school?.address||'-'} {school?.city||''}</p></div></header>
   <div className="recap-title"><h1>LAPORAN REKAP PEMBINAAN DAN CATATAN KEJADIAN SISWA</h1><p>Kode {reportCode} · Periode {start} s.d. {end}</p><small>{filtersText}</small></div>
   <div className="recap-summary"><div><Users/><b>{metrics.studentCount}</b><span>Siswa tercatat</span></div><div><FileText/><b>{metrics.incidentCount}</b><span>Catatan kejadian</span></div><div><ClipboardList/><b>{metrics.coachingCount}</b><span>Pembinaan</span></div><div><ShieldCheck/><b>{metrics.coachingOpen}</b><span>Pembinaan aktif</span></div></div>
   <div className="recap-points"><span>Poin pelanggaran <b>{metrics.violationPoints}</b></span><span>Poin prestasi <b>{metrics.achievementPoints}</b></span><span>Tindak lanjut aktif <b>{metrics.pendingActions}</b></span></div>
   <section className="recap-section"><h3>A. Rekapitulasi Per Siswa</h3><div className="recap-table-wrap"><table className="studentRecapTable"><thead><tr><th>No</th><th>Nama Siswa</th><th>Kelas</th><th>Data Pelanggaran</th><th>Jml</th><th>Total Poin</th><th>Pembinaan</th><th>Perlakuan / Tindak Lanjut</th></tr></thead><tbody>{summaryRows.length?summaryRows.map((r:any,i:number)=><tr key={r.id}><td>{i+1}</td><td><b>{r.name}</b><small>NIS {r.nis}</small>{r.record_count>1&&<small className="mergedBadge">Rekap menyatukan {r.record_count} record identitas</small>}</td><td>{r.class_name}</td><td>{r.violation_list}</td><td>{r.violations}</td><td><b>{r.violation_points}</b></td><td>{r.coaching}{r.open_coaching?' · '+r.open_coaching+' aktif':''}</td><td>{r.follow_up}</td></tr>):<tr><td colSpan={8}>Tidak ada siswa yang sesuai periode dan filter.</td></tr>}</tbody></table></div></section>
   <section className="recap-section"><h3>B. Rincian Kejadian dan Pembinaan</h3><div className="recap-table-wrap"><table><thead><tr><th>Tanggal</th><th>Siswa</th><th>Jenis</th><th>Catatan</th><th>Uraian / Hasil</th><th>Status / Poin</th><th>Pencatat</th></tr></thead><tbody>{timeline.length?timeline.map((r:any,i:number)=><tr key={i}><td>{human(r.date)}</td><td><b>{r.student}</b><small>{r.class_name}</small></td><td>{r.type}</td><td>{r.title}</td><td>{r.detail}</td><td>{r.status}</td><td>{r.recorder}</td></tr>):<tr><td colSpan={7}>Tidak ada rincian pada filter ini.</td></tr>}</tbody></table></div></section>
   <p className="recap-note">Pengelompokan pada laporan hanya memengaruhi tampilan rekap. Data siswa, pelanggaran, poin, pembinaan, dan tindak lanjut asli tidak diubah.</p>
   <div className="recap-sign"><div><span>Disusun oleh,</span><b>BK / Kesiswaan</b><i/><strong>{school?.discipline_lead||'........................'}</strong></div><div><span>Mengetahui,</span><b>Kepala Sekolah</b><i/><strong>{school?.principal_name||'........................'}</strong></div></div>
  </section>
 </div>;
}