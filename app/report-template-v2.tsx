'use client';
import {useEffect,useRef,useState} from 'react';
import {AlertCircle,CheckCircle2,FileText,Image as ImageIcon,Printer,Save,ShieldCheck,Upload,UserRound} from 'lucide-react';
import {sb} from './client';

function Notice({kind='success',children}:any){return <div className={'notice '+kind}>{kind==='success'?<CheckCircle2/>:<AlertCircle/>}<span>{children}</span></div>}

function schoolCodeFromName(name:string){
 const clean=String(name||'SEKOLAH').toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-+|-+$/g,'');
 return (clean||'SEKOLAH').slice(0,24);
}

async function uploadSchoolAsset(file:File,kind:string,schoolId:string){
 const {data:{user}}=await sb.auth.getUser();
 if(!user)throw new Error('Sesi login tidak ditemukan.');
 const allowed=['image/png','image/jpeg','image/webp'];
 if(!allowed.includes(file.type))throw new Error('File harus PNG, JPG, JPEG, atau WebP.');
 if(file.size>2*1024*1024)throw new Error('Ukuran file maksimal 2 MB.');
 const ext=(file.name.split('.').pop()||'png').toLowerCase().replace(/[^a-z0-9]/g,'')||'png';
 const path=`${schoolId}/reports/${kind}.${ext}`;
 const result=await sb.storage.from('school-assets').upload(path,file,{upsert:true,contentType:file.type,cacheControl:'31536000'});
 if(result.error)throw result.error;
 return sb.storage.from('school-assets').getPublicUrl(path).data.publicUrl+`?v=${Date.now()}`;
}

export function TemplateReportPage({school,reload}:any){
 const [form,setForm]=useState<any>({});
 const [status,setStatus]=useState('');
 const [busy,setBusy]=useState('');
 const logoRef=useRef<HTMLInputElement>(null),signRef=useRef<HTMLInputElement>(null),stampRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{
  if(!school)return;
  setForm({
   name:school.name||'',npsn:school.npsn||'',address:school.address||'',city:school.city||'',province:school.province||'',postal_code:school.postal_code||'',phone:school.phone||'',email_contact:school.email_contact||'',website:school.website||'',principal_name:school.principal_name||'',principal_nip:school.principal_nip||'',logo_url:school.logo_url||'',signature_url:school.signature_url||'',stamp_url:school.stamp_url||'',
   report_settings:{layout:'formal',show_npsn:true,show_phone:true,show_email:true,show_website:false,show_signature:true,show_stamp:false,signer_title:'Kepala Sekolah',letter_city:school.city||'',letter_classification_code:'421.3',letter_school_code:schoolCodeFromName(school.name||''),...(school.report_settings||{})}
  });
 },[school]);
 useEffect(()=>{if(!status)return;const t=setTimeout(()=>setStatus(''),4500);return()=>clearTimeout(t)},[status]);
 if(!school)return <div className="page"><div className="panel">Memuat pengaturan sekolah...</div></div>;
 const settings=form.report_settings||{};
 const patchSettings=(p:any)=>setForm((x:any)=>({...x,report_settings:{...(x.report_settings||{}),...p}}));
 async function upload(file:File|undefined,kind:'logo'|'signature'|'stamp'){
  if(!file)return;setBusy(kind);setStatus('');
  try{
   const key=kind==='logo'?'logo_url':kind==='signature'?'signature_url':'stamp_url';
   const url=await uploadSchoolAsset(file,kind,school.id);
   const patch:any={[key]:url};
   if(kind==='signature')patch.report_settings={...(school.report_settings||{}),...(form.report_settings||{}),show_signature:true};
   if(kind==='stamp')patch.report_settings={...(school.report_settings||{}),...(form.report_settings||{}),show_stamp:true};
   const db=await sb.from('schools').update(patch).eq('id',school.id);
   if(db.error)throw new Error(`File berhasil diunggah tetapi gagal disimpan ke profil sekolah: ${db.error.message}`);
   setForm((x:any)=>({...x,[key]:url,report_settings:patch.report_settings||x.report_settings}));
   setStatus(`${kind==='logo'?'Logo':kind==='signature'?'Tanda tangan':'Stempel'} berhasil disimpan. Template laporan sudah diperbarui.`);
   await reload();
  }catch(e:any){setStatus(e.message||'Upload gagal.')}finally{setBusy('')}
 }
 async function save(e:any){
  e.preventDefault();setBusy('save');setStatus('');
  const payload={
   name:form.name,npsn:form.npsn||null,address:form.address||null,city:form.city||null,province:form.province||null,postal_code:form.postal_code||null,phone:form.phone||null,email_contact:form.email_contact||null,website:form.website||null,principal_name:form.principal_name||null,principal_nip:form.principal_nip||null,
   logo_url:form.logo_url??school.logo_url??null,signature_url:form.signature_url??school.signature_url??null,stamp_url:form.stamp_url??school.stamp_url??null,
   report_settings:{...(school.report_settings||{}),...(form.report_settings||{}),letter_classification_code:settings.letter_classification_code||'421.3',letter_school_code:settings.letter_school_code||schoolCodeFromName(form.name||school.name)}
  };
  const r=await sb.from('schools').update(payload).eq('id',school.id);
  setBusy('');
  if(r.error){setStatus(r.error.message);return}
  setStatus('Template berhasil diperbarui dan tersimpan permanen.');
  await reload();
 }
 return <div className="page">
  {status&&<div className={'templateToast '+(status.includes('berhasil')||status.includes('tersimpan')?'success':'warning')} role="status">{status.includes('berhasil')||status.includes('tersimpan')?<CheckCircle2/>:<AlertCircle/>}<span>{status}</span></div>}
  <div className="pageLead reportLead"><div><span className="eyebrow purple">TEMPLATE DOKUMEN SEKOLAH</span><h1>Template Laporan</h1><p>Isi identitas sekolah sekali, unggah logo dan tanda tangan, lalu semua surat akan menggunakan format yang konsisten.</p></div><div className="templateStatus"><ShieldCheck/><div><b>Siap untuk dokumen resmi</b><span>Format A4 · data tersimpan di akun sekolah</span></div></div></div>
  <div className="templateBuilder"><form className="templateForm" onSubmit={save}>
   <section className="settingCard"><div className="settingCardHead"><div className="settingIcon"><ImageIcon/></div><div><h3>Identitas & Kop Sekolah</h3><p>Data ini otomatis muncul di bagian kepala surat.</p></div></div><div className="assetGrid"><AssetBox title="Logo Sekolah" subtitle="PNG/JPG, disarankan transparan" src={form.logo_url} loading={busy==='logo'} onClick={()=>logoRef.current?.click()}/><AssetBox title="Tanda Tangan" subtitle="PNG transparan hasil scan" src={form.signature_url} loading={busy==='signature'} onClick={()=>signRef.current?.click()}/><AssetBox title="Stempel Sekolah" subtitle="Opsional" src={form.stamp_url} loading={busy==='stamp'} onClick={()=>stampRef.current?.click()}/></div><input hidden ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const f=e.target.files?.[0];e.currentTarget.value='';upload(f,'logo')}}/><input hidden ref={signRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const f=e.target.files?.[0];e.currentTarget.value='';upload(f,'signature')}}/><input hidden ref={stampRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const f=e.target.files?.[0];e.currentTarget.value='';upload(f,'stamp')}}/>
    <div className="formGrid polished"><label className="full">Nama Sekolah<input value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>NPSN<input value={form.npsn||''} onChange={e=>setForm({...form,npsn:e.target.value})} placeholder="Opsional"/></label><label>Telepon<input value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label className="full">Alamat<input value={form.address||''} onChange={e=>setForm({...form,address:e.target.value})}/></label><label>Kota / Kabupaten<input value={form.city||''} onChange={e=>setForm({...form,city:e.target.value})}/></label><label>Provinsi<input value={form.province||''} onChange={e=>setForm({...form,province:e.target.value})}/></label><label>Kode Pos<input value={form.postal_code||''} onChange={e=>setForm({...form,postal_code:e.target.value})}/></label><label>Email Sekolah<input value={form.email_contact||''} onChange={e=>setForm({...form,email_contact:e.target.value})}/></label><label className="full">Website Sekolah<input value={form.website||''} onChange={e=>setForm({...form,website:e.target.value})} placeholder="Opsional"/></label></div>
   </section>
   <section className="settingCard"><div className="settingCardHead"><div className="settingIcon"><UserRound/></div><div><h3>Penandatangan</h3><p>Dipakai pada surat pemberitahuan, panggilan, dan laporan resmi.</p></div></div><div className="formGrid polished"><label>Nama Kepala Sekolah<input value={form.principal_name||''} onChange={e=>setForm({...form,principal_name:e.target.value})}/></label><label>NIP Kepala Sekolah<input value={form.principal_nip||''} onChange={e=>setForm({...form,principal_nip:e.target.value})} placeholder="Opsional"/></label><label>Jabatan Penandatangan<input value={settings.signer_title||''} onChange={e=>patchSettings({signer_title:e.target.value})}/></label><label>Kota pada Surat<input value={settings.letter_city||''} onChange={e=>patchSettings({letter_city:e.target.value})} placeholder={form.city||'Kota sekolah'}/></label></div></section>
   <section className="settingCard"><div className="settingCardHead"><div className="settingIcon"><FileText/></div><div><h3>Penomoran Dokumen</h3><p>Nomor dibuat otomatis per akun sekolah dan kembali ke 001 saat tahun berganti.</p></div></div><div className="formGrid polished"><label>Kode Klasifikasi<input value={settings.letter_classification_code||'421.3'} onChange={e=>patchSettings({letter_classification_code:e.target.value})} placeholder="421.3"/></label><label>Kode Sekolah<input value={settings.letter_school_code||schoolCodeFromName(form.name||school.name)} onChange={e=>patchSettings({letter_school_code:e.target.value.toUpperCase()})} placeholder="SMPN-1-MALANG"/></label></div><div className="numberFormatHint"><b>Format otomatis</b><span>{settings.letter_classification_code||'421.3'}/001/{settings.letter_school_code||schoolCodeFromName(form.name||school.name)}/{new Date().getFullYear()}</span><small>Klasifikasi dapat disesuaikan bila sekolah/dinas memiliki kode arsip resmi sendiri.</small></div></section>
   <section className="settingCard"><div className="settingCardHead"><div className="settingIcon"><FileText/></div><div><h3>Tampilan Dokumen</h3><p>Pilih informasi yang ditampilkan pada kop dan tanda tangan.</p></div></div><div className="choiceGrid"><Choice active={settings.layout==='formal'} title="Formal Indonesia" desc="Kop tegas, garis ganda, struktur surat resmi" onClick={()=>patchSettings({layout:'formal'})}/><Choice active={settings.layout==='minimal'} title="Formal Minimal" desc="Lebih bersih untuk sekolah modern" onClick={()=>patchSettings({layout:'minimal'})}/></div><div className="toggleList"><Toggle label="Tampilkan NPSN" checked={settings.show_npsn!==false} onChange={(v:boolean)=>patchSettings({show_npsn:v})}/><Toggle label="Tampilkan telepon" checked={settings.show_phone!==false} onChange={(v:boolean)=>patchSettings({show_phone:v})}/><Toggle label="Tampilkan email" checked={settings.show_email!==false} onChange={(v:boolean)=>patchSettings({show_email:v})}/><Toggle label="Tampilkan website" checked={!!settings.show_website} onChange={(v:boolean)=>patchSettings({show_website:v})}/><Toggle label="Tampilkan gambar tanda tangan" checked={settings.show_signature!==false} onChange={(v:boolean)=>patchSettings({show_signature:v})}/><Toggle label="Tampilkan stempel" checked={!!settings.show_stamp} onChange={(v:boolean)=>patchSettings({show_stamp:v})}/></div></section>
   <button className="primary saveTemplate" disabled={busy==='save'}><Save/>{busy==='save'?'Menyimpan...':'Simpan Perubahan Template'}</button>
  </form><div className="templatePreviewWrap"><div className="previewLabel"><span>PREVIEW A4</span><small>Preview otomatis mengikuti data di kiri</small></div><LetterPreview school={form} settings={settings} demo/></div></div>
 </div>
}

function AssetBox({title,subtitle,src,loading,onClick}:any){return <button type="button" className="assetBox" onClick={onClick}>{src?<img src={src} alt=""/>:<div className="assetPlaceholder"><Upload/></div>}<div><b>{title}</b><span>{loading?'Mengunggah...':subtitle}</span></div><Upload/></button>}
function Choice({active,title,desc,onClick}:any){return <button type="button" className={'layoutChoice '+(active?'selected':'')} onClick={onClick}><div className="miniPaper"><i/><i/><i/></div><div><b>{title}</b><span>{desc}</span></div>{active&&<CheckCircle2/>}</button>}
function Toggle({label,checked,onChange}:any){return <label className="toggleRow"><span>{label}</span><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/><i/></label>}

export function ProfessionalReportsPage({school,students,incidents}:any){
 const [studentId,setStudentId]=useState('');
 const [docType,setDocType]=useState('notification');
 const [number,setNumber]=useState('');
 const [meetingDate,setMeetingDate]=useState('');
 const [extra,setExtra]=useState('');
 const [busy,setBusy]=useState(false);
 const [reportStatus,setReportStatus]=useState('');
 const [issuedKey,setIssuedKey]=useState('');
 const student=students.find((s:any)=>s.id===studentId);
 const history=incidents.filter((x:any)=>x.student_id===studentId);
 const violation=history.filter((x:any)=>x.type==='violation').reduce((a:number,x:any)=>a+(x.points_snapshot||0),0);
 const achievement=history.filter((x:any)=>x.type==='achievement').reduce((a:number,x:any)=>a+(x.points_snapshot||0),0);
 const score=Math.max(0,violation-achievement);
 const settings=school?.report_settings||{};
 const docTitles:any={notification:'SURAT PEMBERITAHUAN ORANG TUA/WALI',summon:'SURAT PANGGILAN ORANG TUA/WALI',statement:'SURAT PEMBINAAN PESERTA DIDIK',history:'LAPORAN RIWAYAT KEDISIPLINAN SISWA'};
 const currentKey=[school?.id||'',studentId,docType,meetingDate,extra].join('|');
 useEffect(()=>{setNumber('');setIssuedKey('');setReportStatus('')},[studentId,docType,meetingDate,extra,school?.id]);
 async function printDocument(){
  if(!school||!student)return;
  if(number&&issuedKey===currentKey){window.print();return}
  setBusy(true);setReportStatus('');
  const snapshot={
   school:{id:school.id,name:school.name,npsn:school.npsn,address:school.address,city:school.city,province:school.province,postal_code:school.postal_code,phone:school.phone,email_contact:school.email_contact,website:school.website,principal_name:school.principal_name,principal_nip:school.principal_nip,logo_url:school.logo_url,signature_url:school.signature_url,stamp_url:school.stamp_url,report_settings:settings},
   student:{id:student.id,name:student.name,nis:student.nis,nisn:student.nisn,class_name:student.class_name,parent_name:student.parent_name,parent_phone:student.parent_phone},
   points:{violation,achievement,net:score},
   history:history.slice(0,50).map((x:any)=>({id:x.id,type:x.type,occurred_at:x.occurred_at,item_name_snapshot:x.item_name_snapshot,points_snapshot:x.points_snapshot}))
  };
  const {data,error}=await sb.rpc('issue_report_document',{
   p_school_id:school.id,p_student_id:student.id,p_doc_type:docType,p_document_title:docTitles[docType],
   p_classification_code:settings.letter_classification_code||'421.3',p_school_code:settings.letter_school_code||schoolCodeFromName(school.name||''),
   p_meeting_at:meetingDate?new Date(meetingDate).toISOString():null,p_extra:extra||null,p_snapshot:snapshot
  });
  setBusy(false);
  if(error){setReportStatus(error.message||'Nomor dokumen gagal dibuat.');return}
  const row=Array.isArray(data)?data[0]:data;
  if(!row?.document_number){setReportStatus('Nomor dokumen gagal dibuat.');return}
  setNumber(row.document_number);setIssuedKey(currentKey);setReportStatus(`Nomor ${row.document_number} diterbitkan dan diarsipkan.`);
  setTimeout(()=>window.print(),180);
 }
 return <div className="page"><div className="pageLead"><div><span className="eyebrow purple">GENERATE DOKUMEN</span><h1>Laporan & Surat</h1><p>Pilih siswa dan jenis dokumen. Nomor dibuat otomatis saat dokumen diterbitkan untuk cetak/PDF.</p></div><button className="primary" onClick={printDocument} disabled={!student||busy}><Printer/> {busy?'Menerbitkan...':'Cetak / Simpan PDF'}</button></div>{reportStatus&&<Notice kind={reportStatus.includes('diterbitkan')?'success':'warning'}>{reportStatus}</Notice>}<div className="reportComposer"><div className="reportControls panel"><label>Jenis Dokumen<select value={docType} onChange={e=>setDocType(e.target.value)}><option value="notification">Surat Pemberitahuan Orang Tua</option><option value="summon">Surat Panggilan Orang Tua</option><option value="statement">Surat Pembinaan Peserta Didik</option><option value="history">Riwayat Kedisiplinan Siswa</option></select></label><label>Pilih Siswa<select value={studentId} onChange={e=>setStudentId(e.target.value)}><option value="">Pilih siswa...</option>{students.map((s:any)=><option key={s.id} value={s.id}>{s.name}{s.class_name?` — ${s.class_name}`:''}</option>)}</select></label><label>Nomor Dokumen<input value={number} readOnly placeholder="Otomatis saat Cetak / Simpan PDF" className="autoNumberInput"/><small className="fieldHelp">Urutan tersimpan per akun sekolah dan tidak mengambil nomor hanya karena preview dibuka.</small></label>{docType==='summon'&&<label>Jadwal Pertemuan<input type="datetime-local" value={meetingDate} onChange={e=>setMeetingDate(e.target.value)}/></label>}<label>Catatan Tambahan<textarea value={extra} onChange={e=>setExtra(e.target.value)} placeholder="Opsional. Misalnya arahan sekolah atau hal yang perlu dibawa orang tua."/></label><div className="reportHint"><ShieldCheck/><div><b>Arsip aman & nomor berurutan</b><span>Setiap nomor diterbitkan secara atomik, disimpan sebagai arsip, dan snapshot isi dokumen dipertahankan meskipun data siswa kemudian berubah.</span></div></div></div><div className="paperStage"><LetterPreview school={school} settings={settings} student={student} history={history} violation={violation} achievement={achievement} score={score} title={docTitles[docType]} number={number} meetingDate={meetingDate} extra={extra}/></div></div></div>
}

export function LetterPreview({school,settings,student,history=[],violation=12,achievement=4,score=8,title='SURAT PEMBERITAHUAN ORANG TUA/WALI',number='',meetingDate,extra,demo=false}:any){
 const s=student||{name:'Nama Siswa',class_name:'VII A',nis:'12345',parent_name:'Nama Orang Tua/Wali'};
 const formal=settings?.layout!=='minimal';
 return <article className={'officialPaper '+(formal?'formal':'minimal')}><header className="letterhead">{school?.logo_url?<img className="schoolLogo" src={school.logo_url} alt="Logo sekolah"/>:<div className="schoolLogo placeholder">LOGO</div>}<div className="letterheadText"><h2>{school?.name||'NAMA SEKOLAH'}</h2><p>{school?.address||'Alamat sekolah'}{school?.city?`, ${school.city}`:''}{school?.province?`, ${school.province}`:''}{school?.postal_code?` ${school.postal_code}`:''}</p><div>{settings?.show_npsn!==false&&school?.npsn&&<span>NPSN {school.npsn}</span>}{settings?.show_phone!==false&&school?.phone&&<span>Telp. {school.phone}</span>}{settings?.show_email!==false&&school?.email_contact&&<span>{school.email_contact}</span>}{settings?.show_website&&school?.website&&<span>{school.website}</span>}</div></div></header><div className="kopRule"/><section className="letterMeta"><h1>{title}</h1><p>Nomor: {number||'________________________'}</p></section><section className="letterBody">{title.includes('RIWAYAT')?<><p>Berikut adalah ringkasan riwayat kedisiplinan peserta didik:</p></>:<><p>Yth. Bapak/Ibu Orang Tua/Wali Peserta Didik</p><p>di Tempat</p><p>Dengan hormat,</p><p>Sehubungan dengan proses pembinaan dan pemantauan kedisiplinan peserta didik, sekolah menyampaikan informasi mengenai:</p></>}<table className="identityTable"><tbody><tr><td>Nama</td><td>: {s.name}</td></tr><tr><td>NIS</td><td>: {s.nis||'-'}</td></tr><tr><td>Kelas</td><td>: {s.class_name||'-'}</td></tr><tr><td>Orang Tua/Wali</td><td>: {s.parent_name||'-'}</td></tr></tbody></table><div className="scoreSummary"><span>Pelanggaran <b>{violation} poin</b></span><span>Prestasi <b>{achievement} poin</b></span><span>Poin Bersih <b>{score} poin</b></span></div>{title.includes('PANGGILAN')&&<p>Dimohon kehadiran Bapak/Ibu pada <b>{meetingDate?new Date(meetingDate).toLocaleString('id-ID'):'waktu yang akan disepakati bersama sekolah'}</b> untuk koordinasi tindak lanjut pembinaan.</p>}{title.includes('PEMBINAAN')&&<p>Surat ini menjadi bagian dari dokumentasi pembinaan peserta didik dan digunakan sebagai bahan tindak lanjut bersama sekolah dan orang tua/wali.</p>}{extra&&<p>{extra}</p>}{history.length>0&&<div className="historyTable"><h3>Riwayat Terkait</h3><table><thead><tr><th>Tanggal</th><th>Catatan</th><th>Poin</th></tr></thead><tbody>{history.slice(0,8).map((x:any)=><tr key={x.id}><td>{new Date(x.occurred_at).toLocaleDateString('id-ID')}</td><td>{x.item_name_snapshot}</td><td>{x.type==='violation'?'+':'-'}{x.points_snapshot}</td></tr>)}</tbody></table></div>}{!title.includes('RIWAYAT')&&<p>Demikian surat ini disampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami mengucapkan terima kasih.</p>}</section><footer className="letterSign"><div><span>{settings?.letter_city||school?.city||'................'}, {new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}</span><b>{settings?.signer_title||'Kepala Sekolah'}</b><div className="signatureArea">{settings?.show_stamp&&school?.stamp_url&&<img className="stampImage" src={school.stamp_url} alt="Stempel"/>}{settings?.show_signature!==false&&school?.signature_url&&<img className="signatureImage" src={school.signature_url} alt="Tanda tangan"/>}</div><strong>{school?.principal_name||'Nama Kepala Sekolah'}</strong>{school?.principal_nip&&<small>NIP. {school.principal_nip}</small>}</div></footer>{demo&&<div className="demoWatermark">PREVIEW</div>}</article>
}
