'use client';
import {useEffect,useMemo,useState} from 'react';
import {ClipboardList,Download,FileText,Filter,Printer,ShieldCheck,Users} from 'lucide-react';
import {sb} from './client';
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

 const reportCode='DP-'+start.replaceAll('-','')+'-'+end.replaceAll('-','');
 const filtersText=(className!=='__all__'?'Kelas: '+className:'Semua kelas')+' · '+(studentId!=='__all__'?'Siswa terpilih':'Semua siswa')+' · '+(kind==='all'?'Semua jenis':kind==='violation'?'Pelanggaran':kind==='achievement'?'Prestasi':'Pembinaan');

 function downloadWord(){
  const perStudent=summaryRows.map((r:any,i:number)=>'<tr><td>'+(i+1)+'</td><td>'+esc(r.name)+'</td><td>'+esc(r.class_name)+'</td><td>'+r.violations+'</td><td>'+r.violation_points+'</td><td>'+r.achievements+'</td><td>'+r.coaching+'</td><td>'+r.open_coaching+'</td></tr>').join('');
  const details=timeline.map((r:any)=>'<tr><td>'+esc(human(r.date))+'</td><td>'+esc(r.student)+'<br><small>'+esc(r.class_name)+'</small></td><td>'+esc(r.type)+'</td><td>'+esc(r.title)+'</td><td>'+esc(r.detail)+'</td><td>'+esc(r.status)+'</td><td>'+esc(r.recorder)+'</td></tr>').join('');
  const html='<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style>@page{size:A4;margin:18mm 16mm}body{font-family:Arial,sans-serif;font-size:10pt;color:#111}h1{text-align:center;font-size:14pt;margin:8pt 0 2pt}p.meta{text-align:center;margin:0 0 14pt;color:#444}.school{text-align:center;border-bottom:3px double #111;padding-bottom:8pt}.school h2{margin:0;font-size:16pt}.school p{margin:2pt 0;font-size:9pt}.summary{width:100%;border-collapse:collapse;margin:10pt 0}.summary td{border:1px solid #aaa;padding:7pt;text-align:center}.summary b{display:block;font-size:13pt}.data{width:100%;border-collapse:collapse;margin-top:8pt;font-size:8.5pt}.data th,.data td{border:1px solid #777;padding:4pt;vertical-align:top}.data th{background:#eee}.section{margin-top:14pt;font-size:11pt}.sign{width:100%;margin-top:25pt}.sign td{width:50%;text-align:center;border:0;height:80pt;vertical-align:top}.sign strong{text-decoration:underline}.note{font-size:8.5pt;color:#555}</style></head><body><div class="school"><h2>'+esc(school?.name||'Nama Sekolah')+'</h2><p>NPSN: '+esc(school?.npsn||'-')+' · '+esc(school?.address||'-')+' '+esc(school?.city||'')+'</p></div><h1>LAPORAN REKAP PEMBINAAN DAN CATATAN KEJADIAN SISWA</h1><p class="meta">Kode: '+esc(reportCode)+' · Periode '+esc(start)+' s.d. '+esc(end)+'<br>'+esc(filtersText)+'</p><table class="summary"><tr><td><b>'+studentIds.size+'</b>Siswa tercatat</td><td><b>'+filteredIncidents.length+'</b>Kejadian</td><td><b>'+filteredCoaching.length+'</b>Pembinaan</td><td><b>'+coachingOpen+'</b>Pembinaan aktif</td></tr><tr><td><b>'+violationPoints+'</b>Poin pelanggaran</td><td><b>'+achievementPoints+'</b>Poin prestasi</td><td><b>'+pendingActions+'</b>Tindak lanjut aktif</td><td><b>'+summaryRows.length+'</b>Rekap siswa</td></tr></table><h3 class="section">A. Rekapitulasi Per Siswa</h3><table class="data"><tr><th>No</th><th>Nama</th><th>Kelas</th><th>Pelanggaran</th><th>Poin</th><th>Prestasi</th><th>Pembinaan</th><th>Belum selesai</th></tr>'+(perStudent||'<tr><td colspan="8">Tidak ada data pada periode ini.</td></tr>')+'</table><h3 class="section">B. Rincian Kejadian dan Pembinaan</h3><table class="data"><tr><th>Tanggal</th><th>Siswa</th><th>Jenis</th><th>Catatan</th><th>Uraian/Hasil</th><th>Status/Poin</th><th>Pencatat</th></tr>'+(details||'<tr><td colspan="7">Tidak ada data pada periode ini.</td></tr>')+'</table><p class="note">Dokumen ini merupakan rekap operasional sekolah berdasarkan data yang tercatat pada Bantu Beres Disiplin Pro.</p><table class="sign"><tr><td>Disusun oleh,<br><b>BK / Kesiswaan</b><br><br><br><strong>'+esc(school?.discipline_lead||'........................')+'</strong></td><td>Mengetahui,<br><b>Kepala Sekolah</b><br><br><br><strong>'+esc(school?.principal_name||'........................')+'</strong></td></tr></table></body></html>';
  const blob=new Blob(['\ufeff',html],{type:'application/msword;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=safe(reportCode)+'-rekap-disiplin.doc';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
 }

 return <div className="page recap-page">
  <div className="pageLead recap-lead"><div><span className="recap-kicker"><ClipboardList/> REKAP OPERASIONAL</span><h1>Rekap Pembinaan & Catatan Kejadian</h1><p>Dokumen profesional untuk evaluasi kesiswaan, rapat sekolah, arsip BK, dan tindak lanjut pembinaan.</p></div><div className="recap-export"><button className="ghost" onClick={downloadWord} disabled={busy}><Download/> Word Editable</button><button className="primary" onClick={()=>window.print()} disabled={busy}><Printer/> Cetak / Simpan PDF</button></div></div>
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