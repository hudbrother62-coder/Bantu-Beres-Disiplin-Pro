'use client';
import {useEffect,useMemo,useState} from 'react';
import {AlertCircle,CalendarDays,Check,CheckCircle2,ChevronRight,ClipboardCheck,Clock3,Eye,FilePenLine,ListChecks,PlusCircle,RotateCcw,Save,Search,Users,X} from 'lucide-react';
import {sb} from './client';
import './follow-up-page.css';

type FormState={
 student_id:string;
 sanction_master_id:string;
 sanction_name_snapshot:string;
 threshold_points:string;
 due_date:string;
 notes:string;
};
const blankForm:FormState={student_id:'',sanction_master_id:'__manual__',sanction_name_snapshot:'',threshold_points:'0',due_date:'',notes:''};
const dateLabel=(value:any)=>{
 if(!value)return 'Belum ditentukan';
 try{return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric'}).format(new Date(String(value).slice(0,10)+'T12:00:00'))}
 catch{return String(value)}
};
const todayLocal=()=>{
 const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());
 return d.toISOString().slice(0,10);
};
const statusLabel=(value:any)=>value==='completed'?'Selesai':value==='in_progress'?'Dalam proses':'Menunggu tindak lanjut';

export default function FollowUpPage({school,students=[],master=[],actions=[],reload,setActive}:any){
 const [query,setQuery]=useState('');
 const [filter,setFilter]=useState<'all'|'pending'|'completed'>('all');
 const [modal,setModal]=useState<'create'|'edit'|'detail'|null>(null);
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [form,setForm]=useState<FormState>({...blankForm});
 const [busy,setBusy]=useState(false);
 const [feedback,setFeedback]=useState<{kind:'success'|'error';message:string}|null>(null);

 const activeStudents=useMemo(()=>students.filter((s:any)=>s.status!=='inactive'),[students]);
 const sanctions=useMemo(()=>master.filter((m:any)=>m.type==='sanction'&&m.is_active!==false),[master]);
 const selected=actions.find((item:any)=>item.id===selectedId)||null;
 const relatedStudent=(action:any)=>students.find((s:any)=>s.id===action?.student_id)||action?.students||null;
 const pending=actions.filter((a:any)=>a.status!=='completed').length;
 const completed=actions.filter((a:any)=>a.status==='completed').length;
 const overdue=actions.filter((a:any)=>a.status!=='completed'&&a.due_date&&String(a.due_date).slice(0,10)<todayLocal()).length;
 const visible=useMemo(()=>{
  const needle=query.trim().toLocaleLowerCase('id');
  return actions.filter((a:any)=>{
   const statusMatch=filter==='all'||(filter==='completed'?a.status==='completed':a.status!=='completed');
   const s=students.find((student:any)=>student.id===a.student_id)||a.students||{};
   return statusMatch&&(!needle||[s.name,s.class_name,s.nis,a.sanction_name_snapshot,a.notes].some(v=>String(v||'').toLocaleLowerCase('id').includes(needle)));
  });
 },[actions,students,query,filter]);

 useEffect(()=>{
  if(!modal)return;
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!busy)setModal(null)};
  window.addEventListener('keydown',onKey);
  return()=>window.removeEventListener('keydown',onKey);
 },[modal,busy]);

 function openCreate(){
  setSelectedId(null);setForm({...blankForm});setFeedback(null);setModal('create');
 }
 function openEdit(action:any){
  const exists=sanctions.some((m:any)=>m.id===action.sanction_master_id);
  setSelectedId(action.id);
  setForm({
   student_id:action.student_id||'',
   sanction_master_id:exists?action.sanction_master_id:'__manual__',
   sanction_name_snapshot:action.sanction_name_snapshot||'',
   threshold_points:String(action.threshold_points??0),
   due_date:action.due_date?String(action.due_date).slice(0,10):'',
   notes:action.notes||''
  });
  setFeedback(null);setModal('edit');
 }
 function openDetail(action:any){setSelectedId(action.id);setFeedback(null);setModal('detail')}
 function chooseMaster(id:string){
  const item=sanctions.find((m:any)=>m.id===id);
  setForm(previous=>({
   ...previous,
   sanction_master_id:id,
   sanction_name_snapshot:item?item.name:previous.sanction_master_id==='__manual__'?previous.sanction_name_snapshot:'',
   threshold_points:item?String(item.min_points??item.points??0):previous.threshold_points
  }));
 }
 async function save(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(busy||!school?.id)return;
  const student=students.find((s:any)=>s.id===form.student_id);
  const sanction=sanctions.find((m:any)=>m.id===form.sanction_master_id);
  const title=(sanction?.name||form.sanction_name_snapshot).trim();
  const points=Number(form.threshold_points);
  if(!student||!title||!Number.isFinite(points)||points<0||!Number.isInteger(points)){
   setFeedback({kind:'error',message:'Pilih siswa, isi nama tindak lanjut, dan masukkan poin berupa bilangan bulat positif atau nol.'});return;
  }
  if(modal==='create'&&student.status==='inactive'){
   setFeedback({kind:'error',message:'Siswa berada di Draft Hapus. Pulihkan siswa terlebih dahulu untuk membuat tindak lanjut baru.'});return;
  }
  if(form.due_date&&!/^\d{4}-\d{2}-\d{2}$/.test(form.due_date)){
   setFeedback({kind:'error',message:'Tanggal target penyelesaian tidak valid.'});return;
  }
  const payload={
   student_id:student.id,
   sanction_master_id:sanction?.id||null,
   sanction_name_snapshot:title,
   threshold_points:points,
   due_date:form.due_date||null,
   notes:form.notes.trim()||null
  };
  setBusy(true);setFeedback(null);
  try{
   const result=modal==='edit'&&selectedId
    ?await sb.from('student_actions').update(payload).eq('id',selectedId).eq('school_id',school.id).select('id')
    :await sb.from('student_actions').insert({...payload,school_id:school.id,status:'pending'}).select('id');
   if(result.error)throw result.error;
   if(!result.data?.length)throw new Error('Data belum berhasil disimpan. Periksa hak akses akun sekolah.');
   setModal(null);setSelectedId(null);
   setFeedback({kind:'success',message:modal==='edit'?'Tindak lanjut berhasil diperbarui.':'Tindak lanjut baru berhasil ditambahkan.'});
   await reload();
  }catch(error:any){setFeedback({kind:'error',message:error.message||'Tidak dapat menyimpan tindak lanjut.'})}
  finally{setBusy(false)}
 }
 async function changeStatus(action:any,complete:boolean){
  if(!school?.id||busy)return;
  setBusy(true);setFeedback(null);
  try{
   const payload={status:complete?'completed':'pending',completed_at:complete?new Date().toISOString():null};
   const {data,error}=await sb.from('student_actions').update(payload).eq('id',action.id).eq('school_id',school.id).select('id');
   if(error)throw error;
   if(!data?.length)throw new Error('Status tindak lanjut belum dapat diperbarui.');
   setFeedback({kind:'success',message:complete?'Tindak lanjut berhasil ditandai selesai.':'Tindak lanjut kembali berstatus menunggu.'});
   await reload();
  }catch(error:any){setFeedback({kind:'error',message:error.message||'Tidak dapat mengubah status.'})}
  finally{setBusy(false)}
 }

 const modalAction=selected;
 return <div className="page followUpPage">
  <div className="pageLead followUpLead">
   <div><span className="followUpEyebrow"><ListChecks/> KONTROL TINDAK LANJUT</span><h1>Tindak Lanjut</h1><p>Catat tindakan atau sanksi, lihat detail, tentukan batas waktu, dan pantau penyelesaiannya.</p></div>
   <button type="button" className="primary followUpNew" disabled={!activeStudents.length||busy} onClick={openCreate}><PlusCircle/> Tambah Tindak Lanjut</button>
  </div>
  {feedback&&<div className={'followUpNotice '+feedback.kind} role="status">{feedback.kind==='success'?<CheckCircle2/>:<AlertCircle/>}<span>{feedback.message}</span><button type="button" aria-label="Tutup pesan" onClick={()=>setFeedback(null)}><X/></button></div>}
  <div className="followUpStats">
   <article><span><ListChecks/> Total tindakan</span><strong>{actions.length}</strong></article>
   <article><span><Clock3/> Perlu ditindaklanjuti</span><strong>{pending}</strong></article>
   <article><span><CheckCircle2/> Sudah selesai</span><strong>{completed}</strong></article>
   <article><span><CalendarDays/> Lewat tenggat</span><strong>{overdue}</strong></article>
  </div>
  <div className="followUpTools">
   <div className="followUpSearch"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari siswa, kelas, atau tindak lanjut…" aria-label="Cari tindak lanjut"/></div>
   <div className="followUpFilters" aria-label="Filter status">
    {([['all','Semua'],['pending','Belum selesai'],['completed','Selesai']] as const).map(([id,label])=><button type="button" key={id} className={filter===id?'chosen':''} onClick={()=>setFilter(id)}>{label}</button>)}
   </div>
  </div>
  <section className="panel followUpList" aria-label="Daftar tindak lanjut">
   {visible.length?visible.map((action:any)=>{
    const student=relatedStudent(action),done=action.status==='completed';
    const late=!done&&action.due_date&&String(action.due_date).slice(0,10)<todayLocal();
    return <article className="followUpRow" key={action.id}>
     <button type="button" className="followUpOpen" onClick={()=>openDetail(action)} aria-label={'Lihat detail '+(action.sanction_name_snapshot||'tindak lanjut')}>
      <span className="followUpRowIcon"><ClipboardCheck/></span>
      <span className="followUpRowInfo"><b>{student?.name||'Siswa'} <small>{student?.class_name||'Kelas belum diisi'}</small></b><span>{action.sanction_name_snapshot||'Tindak lanjut siswa'} · {action.threshold_points??0} poin</span><em className={late?'late':''}><CalendarDays/> {action.due_date?'Target '+dateLabel(action.due_date):'Belum ada tenggat'}</em></span>
      <span className={'followUpStatus '+(done?'done':late?'late':'pending')}>{statusLabel(action.status)}</span>
      <ChevronRight className="followUpChevron"/>
     </button>
     <div className="followUpRowActions"><button type="button" className="ghost" onClick={()=>openDetail(action)}><Eye/> Lihat detail</button><button type="button" className="ghost" onClick={()=>openEdit(action)} disabled={busy}><FilePenLine/> Edit</button>{!done&&<button type="button" className="primary" disabled={busy} onClick={()=>void changeStatus(action,true)}><Check/> Tandai selesai</button>}</div>
    </article>
   }):<div className="followUpEmpty"><span className="followUpEmptyIcon"><ClipboardCheck/></span><h3>{actions.length?'Tidak ada tindak lanjut yang sesuai':'Belum ada tindak lanjut'}</h3><p>{actions.length?'Coba ubah kata kunci atau filter agar catatan lainnya terlihat.':'Mulai dengan mencatat tindak lanjut untuk siswa. Anda bisa memilih sanksi dari Master Data atau menuliskan tindakan baru secara manual.'}</p>{!actions.length&&activeStudents.length>0&&<button type="button" className="primary" onClick={openCreate}><PlusCircle/> Tambah tindak lanjut pertama</button>}{!activeStudents.length&&<button type="button" className="ghost" onClick={()=>setActive('Data Siswa')}><Users/> Buka Data Siswa</button>}</div>}
  </section>
  {modal==='detail'&&modalAction&&<div className="modalWrap followUpModalWrap" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setModal(null)}}><section role="dialog" aria-modal="true" aria-labelledby="followup-detail-title" className="modal followUpModal">
   <div className="modalHead"><div><span className="followUpEyebrow"><Eye/> DETAIL CATATAN</span><h3 id="followup-detail-title">Detail Tindak Lanjut</h3><p>Informasi tindakan siswa dan status penyelesaian.</p></div><button type="button" className="iconBtn" aria-label="Tutup" onClick={()=>setModal(null)}><X/></button></div>
   <div className="followUpDetail">
    <div><span>Siswa</span><strong>{relatedStudent(modalAction)?.name||'Siswa'}</strong></div>
    <div><span>Kelas</span><strong>{relatedStudent(modalAction)?.class_name||'—'}</strong></div>
    <div className="full"><span>Nama tindakan / sanksi</span><strong>{modalAction.sanction_name_snapshot||'—'}</strong></div>
    <div><span>Batas poin</span><strong>{modalAction.threshold_points??0}</strong></div>
    <div><span>Status</span><strong>{statusLabel(modalAction.status)}</strong></div>
    <div><span>Target selesai</span><strong>{dateLabel(modalAction.due_date)}</strong></div>
    <div><span>Tanggal dicatat</span><strong>{dateLabel(modalAction.created_at)}</strong></div>
    {modalAction.status==='completed'&&<div className="full"><span>Selesai pada</span><strong>{dateLabel(modalAction.completed_at)}</strong></div>}
    <div className="full"><span>Catatan / hasil</span><p>{modalAction.notes||'Belum ada catatan tambahan.'}</p></div>
   </div>
   <div className="followUpModalActions"><button type="button" className="ghost" onClick={()=>setModal(null)}>Tutup</button><button type="button" className="ghost" onClick={()=>openEdit(modalAction)}><FilePenLine/> Edit</button>{modalAction.status==='completed'?<button type="button" className="ghost" disabled={busy} onClick={()=>void changeStatus(modalAction,false)}><RotateCcw/> Buka kembali</button>:<button type="button" className="primary" disabled={busy} onClick={()=>void changeStatus(modalAction,true)}><Check/> Tandai selesai</button>}</div>
   {feedback?.kind==='error'&&<div className="followUpModalError" role="alert">{feedback.message}</div>}
  </section></div>}
  {(modal==='create'||modal==='edit')&&<div className="modalWrap followUpModalWrap" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setModal(null)}}><form className="modal followUpModal" onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="followup-form-title">
   <div className="modalHead"><div><span className="followUpEyebrow"><ListChecks/> FORM TINDAK LANJUT</span><h3 id="followup-form-title">{modal==='edit'?'Edit Tindak Lanjut':'Tambah Tindak Lanjut'}</h3><p>Data tersimpan pada sekolah yang sedang aktif.</p></div><button type="button" className="iconBtn" aria-label="Tutup" disabled={busy} onClick={()=>setModal(null)}><X/></button></div>
   <div className="followUpFields">
    <label className="full">Pilih siswa *<select required value={form.student_id} disabled={busy} onChange={e=>setForm({...form,student_id:e.target.value})}><option value="">Pilih siswa…</option>{(modal==='edit'?students:activeStudents).map((student:any)=><option key={student.id} value={student.id}>{student.name}{student.class_name?' · '+student.class_name:''}{student.status==='inactive'?' (Draft Hapus)':''}</option>)}</select></label>
    <label className="full">Jenis tindakan / sanksi *<select value={form.sanction_master_id} disabled={busy} onChange={e=>chooseMaster(e.target.value)}><option value="__manual__">＋ Tulis tindakan sendiri</option>{sanctions.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <label className="full">Nama tindakan *<input required maxLength={180} value={form.sanction_name_snapshot} readOnly={form.sanction_master_id!=='__manual__'} disabled={busy} onChange={e=>setForm({...form,sanction_name_snapshot:e.target.value})} placeholder="Contoh: Pendampingan dan pertemuan orang tua"/></label>
    <label>Batas poin<input type="number" min="0" step="1" value={form.threshold_points} disabled={busy} onChange={e=>setForm({...form,threshold_points:e.target.value})}/></label>
    <label>Target penyelesaian<input type="date" value={form.due_date} disabled={busy} onChange={e=>setForm({...form,due_date:e.target.value})}/></label>
    <label className="full">Catatan / rencana tindak lanjut<textarea rows={4} maxLength={3000} value={form.notes} disabled={busy} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Tuliskan rencana tindakan, PIC, atau hasil pembinaan…"/></label>
   </div>
   {feedback?.kind==='error'&&<div className="followUpModalError" role="alert">{feedback.message}</div>}
   <div className="followUpModalActions"><button type="button" className="ghost" onClick={()=>setModal(null)} disabled={busy}>Batal</button><button type="submit" className="primary" disabled={busy}><Save/> {busy?'Menyimpan…':modal==='edit'?'Simpan perubahan':'Simpan tindak lanjut'}</button></div>
  </form></div>}
 </div>;
}
