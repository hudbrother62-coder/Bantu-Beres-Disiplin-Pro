'use client';
import {useEffect,useMemo,useState} from 'react';
import {ClipboardList,Download,FileText,Filter,Printer,ShieldCheck,Users} from 'lucide-react';
import {sb} from './client';
import {exportRecapDocx,exportRecapPdf} from './document-export';
import './discipline-recap.css';

const esc=(v:any)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as any)[c]);
const safe=(v:any)=>String(v||'laporan').replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,'-').slice(0,90);
const isoDay=(d:Date)=>{const x=new Date(d);x.setMinutes(x.getMinutes()-x.getTimezoneOffset());return x.toISOString().slice(0,10)};
const monthStart=()=>{const d=new Date();return isoDay(new Date(d.getFullYear(),d.getMonth(),1))};
const today=()=>isoDay(new Date());
const human=(v:any)=>{try{return new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v))}catch{return String(v||'-')}};

export default function DisciplineRecapPage({school,students}:any){
 const [start,setStart]=useState(monthStart());
 const [end,setEnd]=useState(today());
 const [className,setClassName]=useState('__all__');
 const [studentId,setStudentId]=useState('__all__');
 const [kind,setKind]=useState<'all'|'violation'|'achievement'|'coaching'>('all');
 const [incidents,setIncidents]=useState<any[]>([]);
 const [coaching,setCoaching]=useState<any[]>([]);
 const [actions,setActions]=useState<any[]>([]);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');

 async function fetchPaged(table:string,select:string,dateColumn:string){
  const all:any[]=[];let from=0;
  while(true){
   const q=sb.from(table).select(select).eq('school_id',school.id).gte(dateColumn,start+'T00:00:00').lte(dateColumn,end+'T23:59:59.999').order(dateColumn,{ascending:false}).range(from,from+999);
   const {data,error}=await q;
   if(error)throw error;
   const rows=data||[];all.push(...rows);if(rows.length<1000)break;from+=1000;
  }
  return all;
 }

 async function load(){
  if(!school?.id)return;setBusy(true);setMessage('');
  try{
   const [i,c,a]=await Promise.all([
    fetchPaged('incidents','id,student_id,type,item_name_snapshot,category_snapshot,points_snapshot,occurred_at,chronology,recorder_name,students(name,class_name,nis,status)','occurred_at'),
    fetchPaged('coaching_sessions','id,student_id,reason,form,result,notes,follow_up_date,status,recorder_name,happened_at,students(name,class_name,nis,status)','happened_at'),
    fetchPaged('student_actions','id,student_id,sanction_name_snapshot,threshold_points,status,notes,due_date,completed_at,created_at,students(name,class_name,nis,status)','created_at')
   ]);
   setIncidents(i);setCoaching(c);setActions(a);
  }catch(e:any){setMessage(e?.message||'Rekap belum dapat dimuat.')}finally{setBusy(false)}
 }
 useEffect(()=>{void load()},[school?.id,start,end]);

 const classOptions=useMemo(()=>Array.from(new Set((students||[]).map((s:any)=>String(s.class_name||'').trim()).filter(Boolean))).sort((a:any,b:any)=>a.localeCompare(b,'id',{numeric:true})),[students]);
 const passes=(row:any)=>{
  const s=row.students||{};
  if(className!=='__all__'&&String(s.class_name||'')!==className)return false;
  if(studentId!=='__all__'&&row.student_id!==studentId)return false;
  return true;
 };
 const filteredIncidents=useMemo(()=>incidents.filter(x=>passes(x)&&(kind==='all'||kind===x.type)),[incidents,className,studentId,kind]);
 const filteredCoaching=useMemo(()=>coaching.filter(x=>passes(x)&&(kind==='all'||kind==='coaching')),[coaching,className,studentId,kind]);
 const filteredActions=useMemo(()=>actions.filter(passes),[actions,className,studentId]);
 const studentIds=useMemo(()=>new Set([...filteredIncidents.map(x=>x.student_id),...filteredCoaching.map(x=>x.student_id),...filteredActions.map(x=>x.student_id)]),[filteredIncidents,filteredCoaching,filteredActions]);
 const violationPoints=filteredIncidents.filter(x=>x.type==='violation').reduce((n,x)=>n+(x.points_snapshot||0),0);
 const achievementPoints=filteredIncidents.filter(x=>x.type==='achievement').reduce((n,x)=>n+(x.points_snapshot||0),0);
 const coachingOpen=filteredCoaching.filter(x=>x.status!=='completed').length;
 const pendingActions=filteredActions.filter(x=>x.status!=='completed').length;

 const summaryRows=useMemo(()=>{
  const map=new Map<string,any>();
  const ensure=(id:string,row:any)=>{if(!map.has(id))map.set(id,{id,name:row.students?.name||'Siswa',class_name:row.students?.class_name||'-',nis:row.students?.nis||'-',violations:0,violation_points:0,achievements:0,achievement_points:0,coaching:0,open_coaching:0,actions:0});return map.get(id)};
  filteredIncidents.forEach(x=>{const r=ensure(x.student_id,x);if(x.type==='violation'){r.violations++;r.violation_points+=x.points_snapshot||0}else{r.achievements++;r.achievement_points+=x.points_snapshot||0}});
  filteredCoaching.forEach(x=>{const r=ensure(x.student_id,x);r.coaching++;if(x.status!=='completed')r.open_coaching++});
  filteredActions.forEach(x=>{const r=ensure(x.student_id,x);r.actions++});
  return Array.from(map.values()).sort((a:any,b:any)=>a.class_name.localeCompare(b.class_name,'id',{numeric:true})||a.name.localeCompare(b.name,'id'));
 },[filteredIncidents,filteredCoaching,filteredActions]);

 const timeline=useMemo(()=>{
  const rows:any[]=[
   ...filteredIncidents.map(x=>({date:x.occurred_at,student:x.students?.name||'Siswa',class_name:x.students?.class_name||'-',type:x.type==='violation'?'Pelanggaran':'Prestasi',title:x.item_name_snapshot||'-',detail:x.chronology||x.category_snapshot||'-',status:String(x.points_snapshot||0)+' poin',recorder:x.recorder_name||'-'})),
   ...filteredCoaching.map(x=>({date:x.happened_at,student:x.students?.name||'Siswa',class_name:x.students?.class_name||'-',type:'Pembinaan',title:x.form||'Pembinaan',detail:x.result||x.reason||x.notes||'-',status:x.status||'-',recorder:x.recorder_name||'-'}))
  ];return rows.sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime());
 },[filteredIncidents,filteredCoaching]);

 function deriveExportData(i:any[],c:any[],a:any[]){
  const pass=(row:any)=>{
   const s=row.students||{};
   if(className!=='__all__'&&String(s.class_name||'')!==className)return false;
   if(studentId!=='__all__'&&row.student_id!==studentId)return false;
   return true;
  };
  const fi=i.filter(x=>pass(x)&&(kind==='all'||kind===x.type));
  const fc=c.filter(x=>pass(x)&&(kind==='all'||kind==='coaching'));
  const fa=a.filter(pass);
  const ids=new Set([...fi.map(x=>x.student_id),...fc.map(x=>x.student_id),...fa.map(x=>x.student_id)]);
  const vPoints=fi.filter(x=>x.type==='violation').reduce((n,x)=>n+(x.points_snapshot||0),0);
  const aPoints=fi.filter(x=>x.type==='achievement').reduce((n,x)=>n+(x.points_snapshot||0),0);
  const cOpen=fc.filter(x=>x.status!=='completed').length;
  const pActions=fa.filter(x=>x.status!=='completed').length;
  const map=new Map<string,any>();
  const ensure=(id:string,row:any)=>{if(!map.has(id))map.set(id,{id,name:row.students?.name||'Siswa',class_name:row.students?.class_name||'-',nis:row.students?.nis||'-',violations:0,violation_points:0,achievements:0,achievement_points:0,coaching:0,open_coaching:0,actions:0});return map.get(id)};
  fi.forEach(x=>{const r=ensure(x.student_id,x);if(x.type==='violation'){r.violations++;r.violation_points+=x.points_snapshot||0}else{r.achievements++;r.achievement_points+=x.points_snapshot||0}});
  fc.forEach(x=>{const r=ensure(x.student_id,x);r.coaching++;if(x.status!=='completed')r.open_coaching++});
  fa.forEach(x=>{const r=ensure(x.student_id,x);r.actions++});
  const rows=Array.from(map.values()).sort((x:any,y:any)=>x.class_name.localeCompare(y.class_name,'id',{numeric:true})||x.name.localeCompare(y.name,'id'));
  const time=[
   ...fi.map(x=>({date:x.occurred_at,student:x.students?.name||'Siswa',class_name:x.students?.class_name||'-',type:x.type==='violation'?'Pelanggaran':'Prestasi',title:x.item_name_snapshot||'-',detail:x.chronology||x.category_snapshot||'-',status:String(x.points_snapshot||0)+' poin',recorder:x.recorder_name||'-'})),
   ...fc.map(x=>({date:x.happened_at,student:x.students?.name||'Siswa',class_name:x.students?.class_name||'-',type:'Pembinaan',title:x.form||'Pembinaan',detail:x.result||x.reason||x.notes||'-',status:x.status||'-',recorder:x.recorder_name||'-'}))
  ].sort((x:any,y:any)=>new Date(y.date).getTime()-new Date(x.date).getTime());
  return {summaryRows:rows,timeline:time,metrics:{studentCount:ids.size,incidentCount:fi.length,coachingCount:fc.length,coachingOpen:cOpen,violationPoints:vPoints,achievementPoints:aPoints,pendingActions:pActions}};
 }

 async function fetchFreshExportData(){
  const [i,c,a]=await Promise.all([
   fetchPaged('incidents','id,student_id,type,item_name_snapshot,category_snapshot,points_snapshot,occurred_at,chronology,recorder_name,students(name,class_name,nis,status)','occurred_at'),
   fetchPaged('coaching_sessions','id,student_id,reason,form,result,notes,follow_up_date,status,recorder_name,happened_at,students(name,class_name,nis,status)','happened_at'),
   fetchPaged('student_actions','id,student_id,sanction_name_snapshot,threshold_points,status,notes,due_date,completed_at,created_at,students(name,class_name,nis,status)','created_at')
  ]);
  return deriveExportData(i,c,a);
 }

 const reportCode='DP-'+start.replaceAll('-','')+'-'+end.replaceAll('-','');
 const filtersText=(className!=='__all__'?'Kelas: '+className:'Semua kelas')+' · '+(studentId!=='__all__'?'Siswa terpilih':'Semua siswa')+' · '+(kind==='all'?'Semua jenis':kind==='violation'?'Pelanggaran':kind==='achievement'?'Prestasi':'Pembinaan');

 async function downloadWord(){
  if(busy)return;setBusy(true);setMessage('');
  try{
   const fresh=await fetchFreshExportData();
   if(!fresh.metrics.incidentCount&&!fresh.metrics.coachingCount&&!fresh.metrics.pendingActions){setMessage('Tidak ada data pada periode dan filter yang dipilih. Word kosong tidak dibuat.');return}
   await exportRecapDocx({school,start,end,filtersText,summaryRows:fresh.summaryRows,timeline:fresh.timeline,metrics:fresh.metrics});
   setMessage('Word .docx berhasil dibuat dari data terbaru sesuai filter.');
  }catch(e:any){setMessage(e?.message||'Word gagal dibuat.')}finally{setBusy(false)}
 }

 async function downloadPdf(){
  if(busy)return;setBusy(true);setMessage('');
  try{
   const fresh=await fetchFreshExportData();
   if(!fresh.metrics.incidentCount&&!fresh.metrics.coachingCount&&!fresh.metrics.pendingActions){setMessage('Tidak ada data pada periode dan filter yang dipilih. PDF kosong tidak dibuat.');return}
   await exportRecapPdf({school,start,end,filtersText,summaryRows:fresh.summaryRows,timeline:fresh.timeline,metrics:fresh.metrics});
   setMessage('PDF berhasil dibuat langsung dari data terbaru sesuai filter.');
  }catch(e:any){setMessage(e?.message||'PDF gagal dibuat.')}finally{setBusy(false)}
 }

 return <div className="page recap-page">
  <div className="pageLead recap-lead"><div><span className="recap-kicker"><ClipboardList/> REKAP OPERASIONAL</span><h1>Rekap Pembinaan & Catatan Kejadian</h1><p>Dokumen profesional untuk evaluasi kesiswaan, rapat sekolah, arsip BK, dan tindak lanjut pembinaan.</p></div><div className="recap-export"><button className="ghost" onClick={downloadWord} disabled={busy}><Download/> {busy?'Memproses...':'Unduh Word .docx'}</button><button className="primary" onClick={downloadPdf} disabled={busy}><Printer/> {busy?'Memproses...':'Unduh PDF'}</button></div></div>
  {message&&<p className="notice warning">{message}</p>}
  <section className="panel recap-filter"><label>Mulai<input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label>Sampai<input type="date" value={end} min={start} onChange={e=>setEnd(e.target.value)}/></label><label>Kelas<select value={className} onChange={e=>setClassName(e.target.value)}><option value="__all__">Semua kelas</option>{classOptions.map((x:any)=><option key={x}>{x}</option>)}</select></label><label>Siswa<select value={studentId} onChange={e=>setStudentId(e.target.value)}><option value="__all__">Semua siswa</option>{(students||[]).filter((s:any)=>className==='__all__'||s.class_name===className).map((s:any)=><option key={s.id} value={s.id}>{s.name}{s.status==='inactive'?' (Arsip)':''}</option>)}</select></label><label>Jenis<select value={kind} onChange={e=>setKind(e.target.value as any)}><option value="all">Semua</option><option value="violation">Pelanggaran</option><option value="achievement">Prestasi</option><option value="coaching">Pembinaan</option></select></label><button className="ghost recap-refresh" onClick={()=>void load()} disabled={busy}><Filter/> {busy?'Memuat...':'Muat ulang'}</button></section>
  <section className="recap-paper">
   <header className="recap-paper-head"><div><h2>{school?.name||'Nama Sekolah'}</h2><p>NPSN {school?.npsn||'-'} · {school?.address||'-'} {school?.city||''}</p></div></header>
   <div className="recap-title"><h1>LAPORAN REKAP PEMBINAAN DAN CATATAN KEJADIAN SISWA</h1><p>Kode {reportCode} · Periode {start} s.d. {end}</p><small>{filtersText}</small></div>
   <div className="recap-summary"><div><Users/><b>{studentIds.size}</b><span>Siswa tercatat</span></div><div><FileText/><b>{filteredIncidents.length}</b><span>Catatan kejadian</span></div><div><ClipboardList/><b>{filteredCoaching.length}</b><span>Pembinaan</span></div><div><ShieldCheck/><b>{coachingOpen}</b><span>Pembinaan aktif</span></div></div>
   <div className="recap-points"><span>Poin pelanggaran <b>{violationPoints}</b></span><span>Poin prestasi <b>{achievementPoints}</b></span><span>Tindak lanjut aktif <b>{pendingActions}</b></span></div>
   <section className="recap-section"><h3>A. Rekapitulasi Per Siswa</h3><div className="recap-table-wrap"><table><thead><tr><th>No</th><th>Nama</th><th>Kelas</th><th>Pelanggaran</th><th>Poin</th><th>Prestasi</th><th>Pembinaan</th><th>Belum selesai</th></tr></thead><tbody>{summaryRows.length?summaryRows.map((r:any,i:number)=><tr key={r.id}><td>{i+1}</td><td><b>{r.name}</b><small>NIS {r.nis}</small></td><td>{r.class_name}</td><td>{r.violations}</td><td>{r.violation_points}</td><td>{r.achievements}</td><td>{r.coaching}</td><td>{r.open_coaching}</td></tr>):<tr><td colSpan={8}>Tidak ada data pada periode ini.</td></tr>}</tbody></table></div></section>
   <section className="recap-section"><h3>B. Rincian Kejadian dan Pembinaan</h3><div className="recap-table-wrap"><table><thead><tr><th>Tanggal</th><th>Siswa</th><th>Jenis</th><th>Catatan</th><th>Uraian / Hasil</th><th>Status / Poin</th><th>Pencatat</th></tr></thead><tbody>{timeline.length?timeline.map((r:any,i:number)=><tr key={i}><td>{human(r.date)}</td><td><b>{r.student}</b><small>{r.class_name}</small></td><td>{r.type}</td><td>{r.title}</td><td>{r.detail}</td><td>{r.status}</td><td>{r.recorder}</td></tr>):<tr><td colSpan={7}>Tidak ada data pada periode ini.</td></tr>}</tbody></table></div></section>
   <p className="recap-note">Dokumen ini disusun berdasarkan data yang tercatat pada Bantu Beres Disiplin Pro untuk kepentingan operasional, evaluasi, dan dokumentasi sekolah.</p>
   <div className="recap-sign"><div><span>Disusun oleh,</span><b>BK / Kesiswaan</b><i/><strong>{school?.discipline_lead||'........................'}</strong></div><div><span>Mengetahui,</span><b>Kepala Sekolah</b><i/><strong>{school?.principal_name||'........................'}</strong></div></div>
  </section>
 </div>
}