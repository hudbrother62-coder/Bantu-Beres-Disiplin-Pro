'use client';
import {useRef,useState} from 'react';
import * as XLSX from 'xlsx';
import {Upload,Download,PlusCircle,Save,X,Search,ChevronRight,CheckCircle2,AlertCircle,FileSpreadsheet} from 'lucide-react';
import {sb,norm} from './client';

function Notice({kind='success',children}:any){return <div className={'notice '+kind}>{kind==='success'?<CheckCircle2/>:<AlertCircle/>}<span>{children}</span></div>}

function officialStudentTemplate(){
 const wb=XLSX.utils.book_new();
 for(const cls of ['7A','7B','8A']){
  const rows:any[][]=[
   ['ISI NAMA WALI KELAS DI SINI','','','','',''],
   ['No.','NIS','Nama','Nama Orang Tua','NOMER TELEPON ORANG TUA','Keterangan']
  ];
  for(let i=1;i<=18;i++)rows.push([i,'','','','','']);
  const ws=XLSX.utils.aoa_to_sheet(rows);
  ws['!cols']=[{wch:6},{wch:16},{wch:28},{wch:28},{wch:27},{wch:28}];
  XLSX.utils.book_append_sheet(wb,ws,cls);
 }
 XLSX.writeFile(wb,'TAMPLET SISWA DATA.xlsx');
}

function homeroomFromA1(value:any,row:any[]){
 const raw=String(value??'').trim();
 if(!raw)return '';
 const n=norm(raw);
 if(n==='isi nama wali kelas di sini'||n==='nama wali kelas'||n==='nama wali kelas:')return '';
 if(n.startsWith('nama wali kelas')){
  const after=raw.split(':').slice(1).join(':').trim();
  if(after)return after;
  const next=String((row||[]).slice(1).find(v=>String(v??'').trim())??'').trim();
  return next;
 }
 return raw;
}

function parseOfficialStudents(file:ArrayBuffer){
 const wb=XLSX.read(file,{type:'array',cellDates:true});
 const out:any[]=[];
 for(const sheetName of wb.SheetNames){
  const className=sheetName.trim();
  if(!className)continue;
  const raw:any[][]=XLSX.utils.sheet_to_json(wb.Sheets[sheetName],{header:1,defval:'',raw:true});
  if(!raw.length)continue;

  let headerIndex=1;
  const row2=(raw[1]||[]).map(norm);
  if(!row2.includes('nama')){
   const detected=raw.findIndex(r=>r.some(v=>['nama','nama siswa','nama lengkap'].includes(norm(v))));
   if(detected>=0)headerIndex=detected;
  }

  const headers=(raw[headerIndex]||[]).map(norm);
  const idx=(...names:string[])=>headers.findIndex(h=>names.includes(h));
  const nameI=idx('nama','nama siswa','nama lengkap');
  const nisI=idx('nis','nomor induk siswa');
  const parentI=idx('nama orang tua','orang tua','nama wali');
  const phoneI=idx('nomer telepon orang tua','nomor telepon orang tua','no telepon orang tua','no hp orang tua');
  const notesI=idx('keterangan','catatan');
  if(nameI<0)continue;

  const homeroom=homeroomFromA1(raw[0]?.[0],raw[0]||[]);
  const txt=(v:any)=>String(v??'').trim();

  for(let i=headerIndex+1;i<raw.length;i++){
   const r=raw[i]||[];
   const name=txt(r[nameI]);
   if(!name)continue;
   out.push({
    name,
    nis:txt(nisI>=0?r[nisI]:'')||null,
    class_name:className,
    homeroom_teacher:homeroom||null,
    parent_name:txt(parentI>=0?r[parentI]:'')||null,
    parent_phone:txt(phoneI>=0?r[phoneI]:'')||null,
    notes:txt(notesI>=0?r[notesI]:'')||null
   });
  }
 }
 return out;
}

export default function OfficialStudentsPage({school,students,reload}:any){
 const [q,setQ]=useState(''),[modal,setModal]=useState(false),[importOpen,setImportOpen]=useState(false),[editing,setEditing]=useState<any>(null),[rows,setRows]=useState<any[]>([]),[fileName,setFileName]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 const [form,setForm]=useState<any>({name:'',nis:'',class_name:'',homeroom_teacher:'',parent_name:'',parent_phone:'',notes:''});
 const fileRef=useRef<HTMLInputElement>(null);

 function open(s:any=null){
  setEditing(s);
  setForm(s?{name:s.name||'',nis:s.nis||'',class_name:s.class_name||'',homeroom_teacher:s.homeroom_teacher||'',parent_name:s.parent_name||'',parent_phone:s.parent_phone||'',notes:s.notes||''}:{name:'',nis:'',class_name:'',homeroom_teacher:'',parent_name:'',parent_phone:'',notes:''});
  setModal(true);
 }

 async function save(e:any){
  e.preventDefault();
  if(!school||!form.name.trim())return;
  setBusy(true);
  const payload={school_id:school.id,name:form.name.trim(),nis:form.nis.trim()||null,class_name:form.class_name.trim()||null,homeroom_teacher:form.homeroom_teacher.trim()||null,parent_name:form.parent_name.trim()||null,parent_phone:form.parent_phone.trim()||null,notes:form.notes.trim()||null};
  const r=editing?await sb.from('students').update(payload).eq('id',editing.id):await sb.from('students').insert(payload);
  setBusy(false);
  if(r.error){setStatus(r.error.message);return}
  setModal(false);setStatus('Data siswa berhasil disimpan.');await reload();
 }

 async function read(file:File){
  setFileName(file.name);setStatus('');
  try{
   const parsed=parseOfficialStudents(await file.arrayBuffer());
   setRows(parsed);
   if(!parsed.length)setStatus('Data siswa tidak ditemukan. Pastikan nama sheet adalah kelas, A1 berisi nama wali kelas, dan baris 2 berisi header siswa.');
  }catch(e:any){setStatus(e.message||'File tidak dapat dibaca.')}
 }

 async function runImport(){
  if(!school||!rows.length)return;
  setBusy(true);
  const existingNis=new Set(students.filter((s:any)=>s.nis).map((s:any)=>norm(s.nis)));
  const existingName=new Set(students.map((s:any)=>`${norm(s.name)}|${norm(s.class_name)}`));
  const seen=new Set<string>();const insert:any[]=[];let skipped=0;
  for(const r of rows){
   const key=r.nis?`nis:${norm(r.nis)}`:`name:${norm(r.name)}|${norm(r.class_name)}`;
   if(seen.has(key)||(r.nis&&existingNis.has(norm(r.nis)))||(!r.nis&&existingName.has(`${norm(r.name)}|${norm(r.class_name)}`))){skipped++;continue}
   seen.add(key);insert.push({...r,school_id:school.id});
  }
  let err:any=null;
  if(insert.length){const x=await sb.from('students').insert(insert);err=x.error}
  if(!err)await sb.from('import_history').insert({school_id:school.id,import_type:'students_official_template',file_name:fileName,summary:{found:rows.length,inserted:insert.length,skipped}});
  setBusy(false);
  if(err){setStatus(err.message);return}
  setStatus(`Import selesai: ${insert.length} siswa masuk, ${skipped} duplikat dilewati.`);
  setRows([]);setFileName('');await reload();
 }

 const filtered=students.filter((s:any)=>`${s.name} ${s.nis||''} ${s.class_name||''}`.toLowerCase().includes(q.toLowerCase()));

 return <div className="page">
  <div className="pageLead">
   <div><h1>Data Siswa</h1><p>Kelola, cari, tambah, dan import data siswa sekolah.</p></div>
   <div className="leadActions">
    <button className="ghost actionBtn" onClick={officialStudentTemplate}><Download/> Download Template</button>
    <button className="ghost actionBtn" onClick={()=>setImportOpen(true)}><Upload/> Import Excel</button>
    <button className="primary" onClick={()=>open()}><PlusCircle/> Tambah Siswa</button>
   </div>
  </div>

  {status&&<Notice kind={status.includes('berhasil')||status.includes('selesai')?'success':'warning'}>{status}</Notice>}

  <div className="toolbar">
   <div className="search"><Search/><input placeholder="Cari nama, NIS, atau kelas..." value={q} onChange={e=>setQ(e.target.value)}/></div>
   <span className="badge">{students.length} siswa</span>
  </div>

  <div className="panel listPanel">
   {filtered.length?filtered.map((s:any)=><button className="student rowButton" key={s.id} onClick={()=>open(s)}>
    <div className="avatar">{s.name[0]}</div>
    <div className="studentInfo"><b>{s.name}</b><span>{s.class_name||'Kelas belum diisi'} · {s.nis?`NIS ${s.nis}`:'NIS kosong'}{s.homeroom_teacher?` · Wali ${s.homeroom_teacher}`:''}</span></div>
    <ChevronRight/>
   </button>):<div className="empty"><b>Belum ada data siswa</b></div>}
  </div>

  {modal&&<div className="modalWrap"><form className="modal largeModal modernFormModal" onSubmit={save}>
   <div className="modalHead"><div><h3>{editing?'Edit Siswa':'Tambah Siswa'}</h3><p>Nama wajib. Data lainnya boleh dikosongkan dan dilengkapi nanti.</p></div><button type="button" className="iconBtn" onClick={()=>setModal(false)}><X/></button></div>
   <div className="formGrid polished">
    <label className="full">Nama Siswa *<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
    <label>NIS<input value={form.nis} onChange={e=>setForm({...form,nis:e.target.value})}/></label>
    <label>Kelas<input value={form.class_name} onChange={e=>setForm({...form,class_name:e.target.value})}/></label>
    <label>Nama Wali Kelas<input value={form.homeroom_teacher} onChange={e=>setForm({...form,homeroom_teacher:e.target.value})}/></label>
    <label>Nama Orang Tua<input value={form.parent_name} onChange={e=>setForm({...form,parent_name:e.target.value})}/></label>
    <label>No. Telepon Orang Tua<input value={form.parent_phone} onChange={e=>setForm({...form,parent_phone:e.target.value})}/></label>
    <label className="full">Keterangan<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
   </div>
   <div className="modalActions"><button type="button" className="ghost" onClick={()=>setModal(false)}>Batal</button><button className="primary" disabled={busy}><Save/> Simpan</button></div>
  </form></div>}

  {importOpen&&<div className="modalWrap"><div className="modal largeModal modernFormModal">
   <div className="modalHead"><div><h3>Import Data Siswa</h3><p>Nama sheet otomatis menjadi nama kelas. Isi sel A1 dengan nama wali kelas, lalu data siswa dimulai dari baris 2.</p></div><button className="iconBtn" onClick={()=>setImportOpen(false)}><X/></button></div>
   <button className="dropzone" onClick={()=>fileRef.current?.click()}><FileSpreadsheet/><b>{fileName||'Pilih file Excel data siswa'}</b><span>Sheet = kelas · A1 = wali kelas · baris 2 = header siswa</span></button>
   <input hidden ref={fileRef} type="file" accept=".xlsx,.xls" onChange={e=>e.target.files?.[0]&&read(e.target.files[0])}/>
   {rows.length>0&&<div className="previewBox"><b>{rows.length} siswa terbaca</b>{rows.slice(0,8).map((r:any,i)=><div className="previewRow" key={i}><b>{r.name}</b><span>{r.class_name}{r.homeroom_teacher?` · Wali ${r.homeroom_teacher}`:''}{r.nis?` · NIS ${r.nis}`:''}</span></div>)}</div>}
   <div className="templateStrip"><div><b>Template siap dipakai</b><span>Hanya nama siswa yang wajib. Kolom lain boleh kosong.</span></div><button className="ghost actionBtn" onClick={officialStudentTemplate}><Download/> Download Template</button></div>
   <div className="modalActions"><button className="ghost" onClick={()=>setImportOpen(false)}>Tutup</button><button className="primary" disabled={!rows.length||busy} onClick={runImport}><Upload/> {busy?'Mengimport...':'Import Sekarang'}</button></div>
  </div></div>}
 </div>;
}
