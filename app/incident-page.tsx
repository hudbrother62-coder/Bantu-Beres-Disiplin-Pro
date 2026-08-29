'use client';
import {useMemo,useState} from 'react';
import {AlertCircle,Check,ChevronDown,ClipboardList,PlusCircle,Save,Search,Sparkles,Trophy,TriangleAlert,UserRound,X} from 'lucide-react';
import {humanDate,localDateTime,sb,typeLabel} from './client';

type Option={id:string;label:string;subtitle?:string;search?:string};

function Notice({kind='success',children}:any){return <div className={'notice '+kind}>{kind==='success'?<Check/>:<AlertCircle/>}<span>{children}</span></div>}

function SearchSelect({label,placeholder,value,options,onChange,emptyText='Data tidak ditemukan'}:{label:string;placeholder:string;value:string;options:Option[];onChange:(id:string)=>void;emptyText?:string}){
 const [open,setOpen]=useState(false);
 const [query,setQuery]=useState('');
 const selected=options.find(o=>o.id===value);
 const filtered=useMemo(()=>{const q=query.trim().toLowerCase();if(!q)return options.slice(0,80);return options.filter(o=>`${o.label} ${o.subtitle||''} ${o.search||''}`.toLowerCase().includes(q)).slice(0,80)},[query,options]);
 function choose(id:string){onChange(id);setOpen(false);setQuery('')}
 return <div className={'searchSelect '+(open?'open':'')}>
  <label className="fieldLabel">{label}</label>
  <button type="button" className="selectTrigger" onClick={()=>setOpen(!open)} aria-expanded={open}>
   <div className="selectTriggerText">{selected?<><b>{selected.label}</b>{selected.subtitle&&<span>{selected.subtitle}</span>}</>:<span className="placeholder">{placeholder}</span>}</div>
   <ChevronDown/>
  </button>
  {open&&<div className="selectPopover">
   <div className="selectSearch"><Search/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ketik untuk mencari..."/><button type="button" onClick={()=>setOpen(false)}><X/></button></div>
   <div className="selectOptions">{filtered.length?filtered.map(o=><button type="button" key={o.id} className={'selectOption '+(o.id===value?'selected':'')} onClick={()=>choose(o.id)}><div><b>{o.label}</b>{o.subtitle&&<span>{o.subtitle}</span>}</div>{o.id===value&&<Check/>}</button>):<div className="selectEmpty"><Search/><b>{emptyText}</b><span>Coba kata pencarian lain.</span></div>}</div>
  </div>}
 </div>
}

export default function PolishedIncidentPage({school,students,master,incidents,reload,setActive}:any){
 const [kind,setKind]=useState<'violation'|'achievement'>('violation');
 const [studentId,setStudentId]=useState('');
 const [masterId,setMasterId]=useState('');
 const [occurred,setOccurred]=useState(localDateTime());
 const [chronology,setChronology]=useState('');
 const [recorder,setRecorder]=useState('');
 const [status,setStatus]=useState('');
 const [busy,setBusy]=useState(false);
 const options=useMemo(()=>master.filter((m:any)=>m.type===kind&&m.is_active!==false),[master,kind]);
 const selectedMaster=options.find((m:any)=>m.id===masterId);
 const studentOptions:Option[]=students.map((s:any)=>({id:s.id,label:s.name,subtitle:[s.class_name&&`Kelas ${s.class_name}`,s.nis&&`NIS ${s.nis}`].filter(Boolean).join(' · ')||'Data kelas belum diisi',search:`${s.nis||''} ${s.nisn||''} ${s.class_name||''}`}));
 const masterOptions:Option[]=options.map((m:any)=>({id:m.id,label:m.name,subtitle:[m.category||'Tanpa kategori',`${m.points||0} poin`].join(' · '),search:`${m.category||''} ${m.points||0}`}));
 function switchKind(next:'violation'|'achievement'){setKind(next);setMasterId('');setStatus('')}
 async function save(e:any){e.preventDefault();if(!school||!studentId){setStatus('Pilih siswa terlebih dahulu.');return}if(!selectedMaster){setStatus(`Pilih ${typeLabel[kind].toLowerCase()} terlebih dahulu.`);return}setBusy(true);setStatus('');const res=await sb.from('incidents').insert({school_id:school.id,student_id:studentId,type:kind,master_item_id:selectedMaster.id,item_name_snapshot:selectedMaster.name,category_snapshot:selectedMaster.category||null,points_snapshot:selectedMaster.points||0,occurred_at:new Date(occurred).toISOString(),chronology:chronology.trim()||null,recorder_name:recorder.trim()||null});setBusy(false);if(res.error){setStatus(res.error.message);return}setStatus(`${typeLabel[kind]} berhasil dicatat.`);setMasterId('');setChronology('');setOccurred(localDateTime());await reload()}
 return <div className="page incidentModernPage">
  <div className="pageLead incidentLead"><div><span className="eyebrow purple">PENCATATAN CEPAT</span><h1>Catat Kejadian</h1><p>Pilih siswa dan jenis kejadian. Kategori serta poin otomatis mengikuti Master Data sekolah.</p></div><div className="flowHint"><Sparkles/><div><b>Lebih cepat</b><span>Tanpa mengetik poin dan kategori</span></div></div></div>
  {status&&<Notice kind={status.includes('berhasil')?'success':'warning'}>{status}</Notice>}
  <div className="incidentModernGrid">
   <form className="panel incidentComposer" onSubmit={save}>
    <div className="incidentTypeSwitch"><button type="button" className={kind==='violation'?'active violation':''} onClick={()=>switchKind('violation')}><TriangleAlert/><span><b>Pelanggaran</b><small>Catat pelanggaran siswa</small></span></button><button type="button" className={kind==='achievement'?'active achievement':''} onClick={()=>switchKind('achievement')}><Trophy/><span><b>Prestasi</b><small>Catat prestasi/perbaikan</small></span></button></div>
    <div className="incidentStep"><div className="stepNumber">1</div><div className="stepContent"><SearchSelect label="Pilih Siswa *" placeholder="Cari dan pilih siswa..." value={studentId} options={studentOptions} onChange={setStudentId} emptyText="Siswa tidak ditemukan"/></div></div>
    <div className="incidentStep"><div className="stepNumber">2</div><div className="stepContent"><SearchSelect label={`Pilih ${typeLabel[kind]} *`} placeholder={`Cari ${typeLabel[kind].toLowerCase()}...`} value={masterId} options={masterOptions} onChange={setMasterId} emptyText={`Master ${typeLabel[kind].toLowerCase()} tidak ditemukan`}/>{!options.length&&<button type="button" className="inlineMasterLink" onClick={()=>setActive('Master Data')}><PlusCircle/> Tambahkan {typeLabel[kind]} di Master Data</button>}</div></div>
    {selectedMaster&&<div className={'autoInfo '+kind}><div className="autoInfoIcon">{kind==='violation'?<TriangleAlert/>:<Trophy/>}</div><div className="autoMain"><span>Terpilih</span><b>{selectedMaster.name}</b><small>{selectedMaster.category||'Tanpa kategori'}</small></div><div className="autoPoints"><span>{kind==='violation'?'+':'−'}</span><strong>{selectedMaster.points||0}</strong><small>poin</small></div></div>}
    <div className="incidentDetails"><label>Tanggal & Waktu<input className="modernInput" type="datetime-local" value={occurred} onChange={e=>setOccurred(e.target.value)}/></label><label>Kronologi <span>(Opsional)</span><textarea className="modernInput" value={chronology} onChange={e=>setChronology(e.target.value)} placeholder="Tulis kronologi singkat bila diperlukan..."/></label><label>Pencatat <span>(Opsional)</span><input className="modernInput" value={recorder} onChange={e=>setRecorder(e.target.value)} placeholder="Nama guru / petugas"/></label></div>
    <button className="primary incidentSubmit" disabled={busy||!studentId||!masterId}><Save/>{busy?'Menyimpan...':'Simpan Kejadian'}</button>
   </form>
   <aside className="panel incidentRecent"><div className="panelTitle"><div><h3>Catatan Terbaru</h3><p>Aktivitas terakhir sekolah.</p></div><ClipboardList/></div>{incidents.length?<div className="activityList compact">{incidents.slice(0,8).map((x:any)=><div className="activity" key={x.id}><div className={'activityDot '+x.type}/><div><b>{x.students?.name||'Siswa'}</b><span>{x.item_name_snapshot} · {x.points_snapshot} poin</span></div><time>{humanDate(x.occurred_at)}</time></div>)}</div>:<div className="incidentEmpty"><UserRound/><b>Belum ada catatan</b><span>Kejadian yang disimpan akan muncul di sini.</span></div>}</aside>
  </div>
 </div>
}
