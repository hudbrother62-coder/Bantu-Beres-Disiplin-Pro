'use client';
import {useMemo,useState} from 'react';
import {Archive,RotateCcw,Search,ShieldCheck,Trash2,Users,X} from 'lucide-react';
import {sb} from './client';
import './student-archive.css';

type Mode='archive'|'restore'|null;

export function StudentArchiveTools({school,students,reload}:{school:any;students:any[];reload:()=>Promise<void>}){
 const [mode,setMode]=useState<Mode>(null);
 const [query,setQuery]=useState('');
 const [classFilter,setClassFilter]=useState('__all__');
 const [selected,setSelected]=useState<Set<string>>(new Set());
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const active=useMemo(()=>students.filter(s=>s.status!=='inactive'),[students]);
 const archived=useMemo(()=>students.filter(s=>s.status==='inactive'),[students]);
 const source=mode==='restore'?archived:active;
 const classOptions=Array.from(new Set(source.map(s=>String(s.class_name||'').trim()).filter(Boolean))).sort((a:any,b:any)=>a.localeCompare(b,'id',{numeric:true}));
 const visible=source.filter(s=>{const cls=String(s.class_name||'').trim();const classOk=classFilter==='__all__'||(classFilter==='__unassigned__'?!cls:cls===classFilter);return classOk&&(`${s.name||''} ${s.nis||''} ${cls}`.toLowerCase().includes(query.toLowerCase()))});
 const allVisibleSelected=visible.length>0&&visible.every(s=>selected.has(s.id));

 function open(next:Exclude<Mode,null>){setMode(next);setQuery('');setClassFilter('__all__');setSelected(new Set());setMessage('')}
 function close(){if(!busy){setMode(null);setSelected(new Set());setQuery('');setClassFilter('__all__')}}
 function toggle(id:string){setSelected(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n})}
 function toggleVisible(){setSelected(prev=>{const n=new Set(prev);if(allVisibleSelected)visible.forEach(s=>n.delete(s.id));else visible.forEach(s=>n.add(s.id));return n})}

 async function applySelected(){
  if(!school?.id||!mode||selected.size===0||busy)return;
  const label=mode==='restore'?'kembalikan':'arsipkan';
  if(!window.confirm(`${label==='arsipkan'?'Hapus dari daftar aktif':'Kembalikan'} ${selected.size} siswa?\n\nData siswa TIDAK dihapus permanen. Riwayat kejadian, pembinaan, tindak lanjut, dan dokumen tetap disimpan.`))return;
  setBusy(true);setMessage('');
  const {data,error}=await sb.rpc('manage_students_archive',{p_student_ids:Array.from(selected),p_all:false,p_restore:mode==='restore'});
  setBusy(false);
  if(error){setMessage(error.message||'Data belum dapat diproses.');return}
  setMessage(`${data||0} siswa berhasil ${mode==='restore'?'dikembalikan ke daftar aktif':'masuk Draft Hapus'}.`);
  setSelected(new Set());await reload();
 }

 async function archiveAll(){
  if(!school?.id||!active.length||busy)return;
  const typed=window.prompt(`Anda akan menghapus ${active.length} siswa dari DAFTAR AKTIF.\n\nRiwayat tidak akan dihapus. Semua siswa hanya dipindahkan ke Draft Hapus.\n\nKetik ARSIPKAN SEMUA untuk melanjutkan.`);
  if(typed!=='ARSIPKAN SEMUA')return;
  setBusy(true);setMessage('');
  const {data,error}=await sb.rpc('manage_students_archive',{p_student_ids:null,p_all:true,p_restore:false});
  setBusy(false);
  if(error){setMessage(error.message||'Data belum dapat diproses.');return}
  setMessage(`${data||0} siswa masuk Draft Hapus. Semua riwayat tetap tersimpan.`);
  await reload();
 }


 async function permanentDeleteSelected(){
  if(mode!=='restore'||selected.size===0||busy)return;
  setBusy(true);setMessage('');
  const ids=Array.from(selected);
  const impact=await sb.rpc('archived_student_delete_impact',{p_student_ids:ids});
  if(impact.error){setBusy(false);setMessage(impact.error.message||'Dampak penghapusan belum dapat diperiksa.');return}
  const x:any=impact.data||{};
  const ok=window.confirm('HAPUS PERMANEN '+(x.students||selected.size)+' siswa dari Draft Hapus?\n\nDampak yang ikut terhapus:\n• '+(x.incidents||0)+' catatan kejadian\n• '+(x.coaching||0)+' catatan pembinaan\n• '+(x.actions||0)+' tindak lanjut\n\nTindakan ini TIDAK dapat dibatalkan.');
  if(!ok){setBusy(false);return}
  const typed=window.prompt('Konfirmasi terakhir. Ketik tepat: HAPUS PERMANEN');
  if(typed!=='HAPUS PERMANEN'){setBusy(false);setMessage('Hapus permanen dibatalkan karena teks konfirmasi tidak cocok.');return}
  const result=await sb.rpc('permanently_delete_archived_students',{p_student_ids:ids,p_confirm:'HAPUS PERMANEN'});
  setBusy(false);
  if(result.error){setMessage(result.error.message||'Hapus permanen gagal.');return}
  const y:any=result.data||{};
  setMessage((y.students||0)+' siswa dihapus permanen dari Draft Hapus.');
  setSelected(new Set());await reload();
 }

 return <><section className="student-archive-panel">
  <div className="archive-copy">
   <span className="archive-kicker"><ShieldCheck/> DRAFT HAPUS AMAN</span>
   <h3>Hapus bertahap supaya data tidak salah terhapus</h3>
   <p>Siswa dari daftar aktif harus masuk Draft Hapus terlebih dahulu. Selama masih di Draft Hapus, siswa dapat dikembalikan dan seluruh riwayat tetap aman.</p>
  </div>
  <div className="archive-stats"><div><b>{active.length}</b><span>Siswa aktif</span></div><div><b>{archived.length}</b><span>Draft Hapus</span></div></div>
  <div className="archive-actions">
   <button className="ghost" type="button" onClick={()=>open('archive')} disabled={!active.length||busy}><Archive/> Pilih ke Draft</button>
   <button className="ghost" type="button" onClick={()=>open('restore')} disabled={!archived.length||busy}><RotateCcw/> Draft Hapus</button>
   <button className="dangerBulk" type="button" onClick={archiveAll} disabled={!active.length||busy}><Users/> Semua ke Draft</button>
  </div>
  {message&&<p className={message.includes('berhasil')||message.includes('tersimpan')||message.includes('arsip')?'archive-message ok':'archive-message'}>{message}</p>}

  {mode&&<div className="modalWrap archive-modal-wrap"><section className="modal largeModal archive-modal">
   <div className="modalHead"><div><h3>{mode==='archive'?'Pilih Siswa ke Draft Hapus':'Draft Hapus Siswa'}</h3><p>{mode==='archive'?'Tahap ini hanya memindahkan siswa ke Draft Hapus. Belum ada data yang dihapus permanen.':'Filter berdasarkan kelas, kembalikan siswa, atau hapus permanen setelah konfirmasi berlapis.'}</p></div><button className="iconBtn" type="button" onClick={close} disabled={busy}><X/></button></div>
   <div className="archive-tools"><div className="archive-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari nama atau NIS..."/></div><label className="draft-class-filter"><span>Kelas</span><select value={classFilter} onChange={e=>{setClassFilter(e.target.value);setSelected(new Set())}}><option value="__all__">Semua kelas</option>{classOptions.map((cls:any)=><option key={cls} value={cls}>{cls}</option>)}<option value="__unassigned__">Belum ditentukan</option></select></label></div>
   <div className="archive-selectbar"><label><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisible}/> Pilih semua yang tampil</label><b>{selected.size} dipilih</b></div>
   <div className="archive-list">{visible.length?visible.map(s=><label className="archive-row" key={s.id}><input type="checkbox" checked={selected.has(s.id)} onChange={()=>toggle(s.id)}/><span><b>{s.name}</b><small>{s.class_name||'Kelas belum diisi'}{s.nis?` · NIS ${s.nis}`:''}</small></span></label>):<div className="archive-empty">Tidak ada siswa yang sesuai pencarian dan filter kelas.</div>}</div>
   <div className="modalActions"><button className="ghost" type="button" onClick={close} disabled={busy}>Batal</button><button className={mode==='archive'?'dangerBulk':'primary'} type="button" onClick={applySelected} disabled={!selected.size||busy}>{busy?'Memproses...':mode==='archive'?`Hapus ${selected.size} dari daftar aktif`:`Kembalikan ${selected.size} siswa`}</button></div>
  </section></div>}
 </section>{message&&<div className={message.toLowerCase().includes("gagal")||message.toLowerCase().includes("dibatalkan")||message.toLowerCase().includes("belum dapat")?"draft-toast error":"draft-toast success"} role="status">{message}</div>}</>
}