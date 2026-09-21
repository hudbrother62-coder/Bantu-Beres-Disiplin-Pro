'use client';
import {useMemo,useState} from 'react';
import {Archive,RotateCcw,Search,ShieldCheck,Users,X} from 'lucide-react';
import {sb} from './client';
import './student-archive.css';

type Mode='archive'|'restore'|null;

export function StudentArchiveTools({school,students,reload}:{school:any;students:any[];reload:()=>Promise<void>}){
 const [mode,setMode]=useState<Mode>(null);
 const [query,setQuery]=useState('');
 const [selected,setSelected]=useState<Set<string>>(new Set());
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const active=useMemo(()=>students.filter(s=>s.status!=='inactive'),[students]);
 const archived=useMemo(()=>students.filter(s=>s.status==='inactive'),[students]);
 const source=mode==='restore'?archived:active;
 const visible=source.filter(s=>`${s.name||''} ${s.nis||''} ${s.class_name||''}`.toLowerCase().includes(query.toLowerCase()));
 const allVisibleSelected=visible.length>0&&visible.every(s=>selected.has(s.id));

 function open(next:Exclude<Mode,null>){setMode(next);setQuery('');setSelected(new Set());setMessage('')}
 function close(){if(!busy){setMode(null);setSelected(new Set());setQuery('')}}
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
  setMessage(`${data||0} siswa berhasil ${mode==='restore'?'dikembalikan ke daftar aktif':'dipindahkan ke arsip'}.`);
  setSelected(new Set());await reload();
 }

 async function archiveAll(){
  if(!school?.id||!active.length||busy)return;
  const typed=window.prompt(`Anda akan menghapus ${active.length} siswa dari DAFTAR AKTIF.\n\nRiwayat tidak akan dihapus. Semua siswa hanya dipindahkan ke Arsip.\n\nKetik ARSIPKAN SEMUA untuk melanjutkan.`);
  if(typed!=='ARSIPKAN SEMUA')return;
  setBusy(true);setMessage('');
  const {data,error}=await sb.rpc('manage_students_archive',{p_student_ids:null,p_all:true,p_restore:false});
  setBusy(false);
  if(error){setMessage(error.message||'Data belum dapat diproses.');return}
  setMessage(`${data||0} siswa dipindahkan ke arsip. Semua riwayat tetap tersimpan.`);
  await reload();
 }

 return <section className="student-archive-panel">
  <div className="archive-copy">
   <span className="archive-kicker"><ShieldCheck/> PENGHAPUSAN AMAN</span>
   <h3>Kelola siswa tanpa menghilangkan riwayat</h3>
   <p>“Hapus” pada Data Siswa berarti memindahkan siswa ke Arsip. Catatan kejadian, pembinaan, tindak lanjut, dan dokumen tetap utuh dan dapat dipakai dalam laporan.</p>
  </div>
  <div className="archive-stats"><div><b>{active.length}</b><span>Siswa aktif</span></div><div><b>{archived.length}</b><span>Diarsipkan</span></div></div>
  <div className="archive-actions">
   <button className="ghost" type="button" onClick={()=>open('archive')} disabled={!active.length||busy}><Archive/> Pilih siswa untuk dihapus</button>
   <button className="ghost" type="button" onClick={()=>open('restore')} disabled={!archived.length||busy}><RotateCcw/> Buka arsip</button>
   <button className="dangerBulk" type="button" onClick={archiveAll} disabled={!active.length||busy}><Users/> Hapus semua dari daftar aktif</button>
  </div>
  {message&&<p className={message.includes('berhasil')||message.includes('tersimpan')||message.includes('arsip')?'archive-message ok':'archive-message'}>{message}</p>}

  {mode&&<div className="modalWrap archive-modal-wrap"><section className="modal largeModal archive-modal">
   <div className="modalHead"><div><h3>{mode==='archive'?'Pilih siswa yang akan dihapus dari daftar':'Arsip siswa'}</h3><p>{mode==='archive'?'Siswa terpilih hanya dinonaktifkan dan dipindahkan ke Arsip.':'Pilih siswa untuk dikembalikan ke daftar aktif.'}</p></div><button className="iconBtn" type="button" onClick={close} disabled={busy}><X/></button></div>
   <div className="archive-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari nama, NIS, atau kelas..."/></div>
   <div className="archive-selectbar"><label><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisible}/> Pilih semua yang tampil</label><b>{selected.size} dipilih</b></div>
   <div className="archive-list">{visible.length?visible.map(s=><label className="archive-row" key={s.id}><input type="checkbox" checked={selected.has(s.id)} onChange={()=>toggle(s.id)}/><span><b>{s.name}</b><small>{s.class_name||'Kelas belum diisi'}{s.nis?` · NIS ${s.nis}`:''}</small></span></label>):<div className="archive-empty">Tidak ada siswa yang sesuai pencarian.</div>}</div>
   <div className="modalActions"><button className="ghost" type="button" onClick={close} disabled={busy}>Batal</button><button className={mode==='archive'?'dangerBulk':'primary'} type="button" onClick={applySelected} disabled={!selected.size||busy}>{busy?'Memproses...':mode==='archive'?`Hapus ${selected.size} dari daftar aktif`:`Kembalikan ${selected.size} siswa`}</button></div>
  </section></div>}
 </section>
}