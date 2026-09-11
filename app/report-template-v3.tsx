'use client';
import {useEffect,useState} from 'react';
import {Download,FileText,Printer,ShieldCheck} from 'lucide-react';
import {sb} from './client';
import {LetterPreview,TemplateReportPage} from './report-template-v2';

export {LetterPreview,TemplateReportPage};

function Notice({kind='success',children}:any){return <div className={'notice '+kind}><span>{children}</span></div>}

function schoolCodeFromName(name:string){
 const clean=String(name||'SEKOLAH').toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-+|-+$/g,'');
 return (clean||'SEKOLAH').slice(0,24);
}

function esc(v:any){
 return String(v??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as any)[c]);
}

function safeName(v:any){
 return String(v||'dokumen').replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,90)||'dokumen';
}

async function imageToDataUrl(url?:string|null){
 if(!url)return '';
 try{
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)return url;
  const blob=await response.blob();
  return await new Promise<string>((resolve,reject)=>{
   const reader=new FileReader();
   reader.onload=()=>resolve(String(reader.result||url));
   reader.onerror=()=>reject(reader.error);
   reader.readAsDataURL(blob);
  });
 }catch{return url}
}

function wordDate(){
 return new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'});
}

function wordDateTime(value:string){
 if(!value)return 'waktu yang akan disepakati bersama sekolah';
 try{return new Date(value).toLocaleString('id-ID',{dateStyle:'long',timeStyle:'short'})}catch{return value}
}

async function buildWordHtml({school,settings,student,history,violation,achievement,score,title,number,meetingDate,extra}:any){
 const [logo,signature,stamp]=await Promise.all([
  imageToDataUrl(school?.logo_url),
  settings?.show_signature!==false?imageToDataUrl(school?.signature_url):Promise.resolve(''),
  settings?.show_stamp?imageToDataUrl(school?.stamp_url):Promise.resolve('')
 ]);
 const contacts=[
  settings?.show_npsn!==false&&school?.npsn?`NPSN ${esc(school.npsn)}`:'',
  settings?.show_phone!==false&&school?.phone?`Telp. ${esc(school.phone)}`:'',
  settings?.show_email!==false&&school?.email_contact?esc(school.email_contact):'',
  settings?.show_website&&school?.website?esc(school.website):''
 ].filter(Boolean).join(' &middot; ');
 const address=[school?.address,school?.city,school?.province].filter(Boolean).map(esc).join(', ')+(school?.postal_code?` ${esc(school.postal_code)}`:'');
 const isHistory=String(title).includes('RIWAYAT');
 const isSummon=String(title).includes('PANGGILAN');
 const isCoaching=String(title).includes('PEMBINAAN');
 const historyRows=(history||[]).slice(0,50).map((x:any)=>`<tr><td>${esc(new Date(x.occurred_at).toLocaleDateString('id-ID'))}</td><td>${esc(x.item_name_snapshot||'-')}</td><td style="text-align:center">${x.type==='violation'?'+':'-'}${esc(x.points_snapshot||0)}</td></tr>`).join('');
 const assetImages=[
  stamp?`<img src="${stamp}" alt="Stempel" style="max-width:95px;max-height:82px;margin-right:8px;vertical-align:middle">`:'',
  signature?`<img src="${signature}" alt="Tanda tangan" style="max-width:125px;max-height:82px;vertical-align:middle">`:''
 ].filter(Boolean).join('');
 const bodyIntro=isHistory
  ? '<p>Berikut adalah ringkasan riwayat kedisiplinan peserta didik:</p>'
  : '<p>Yth. Bapak/Ibu Orang Tua/Wali Peserta Didik</p><p>di Tempat</p><p>Dengan hormat,</p><p>Sehubungan dengan proses pembinaan dan pemantauan kedisiplinan peserta didik, sekolah menyampaikan informasi mengenai:</p>';
 const historyTable=historyRows?`<h3>Riwayat Terkait</h3><table class="history"><thead><tr><th>Tanggal</th><th>Catatan</th><th>Poin</th></tr></thead><tbody>${historyRows}</tbody></table>`:'';
 const extraHtml=extra?`<p>${esc(extra).replace(/\n/g,'<br>')}</p>`:'';
 const special=isSummon?`<p>Dimohon kehadiran Bapak/Ibu pada <b>${esc(wordDateTime(meetingDate))}</b> untuk koordinasi tindak lanjut pembinaan.</p>`:isCoaching?'<p>Surat ini menjadi bagian dari dokumentasi pembinaan peserta didik dan digunakan sebagai bahan tindak lanjut bersama sekolah dan orang tua/wali.</p>':'';
 return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${esc(title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
<style>
@page Section1{size:595.3pt 841.9pt;margin:48pt 50pt 56pt 50pt;mso-header-margin:0pt;mso-footer-margin:0pt}div.Section1{page:Section1}body{font-family:"Times New Roman",serif;font-size:11pt;line-height:1.35;color:#111}.head{width:100%;border-collapse:collapse}.head td{border:0;vertical-align:middle}.logo{width:82px;text-align:left}.logo img{max-width:70px;max-height:70px}.headtext{text-align:center}.headtext h1{font-family:Arial,sans-serif;font-size:16pt;margin:0 0 3pt;text-transform:uppercase}.headtext p{margin:0;font-size:9.5pt}.contacts{font-size:9pt;margin-top:2pt}.rule{border-top:3px solid #111;border-bottom:1px solid #111;height:4px;margin:6pt 0 14pt}.title{text-align:center;margin:0 0 13pt}.title h2{font-size:12pt;text-decoration:underline;margin:0 0 2pt}.title p{margin:0}.body p{text-align:justify;margin:7pt 0}.identity{width:100%;border-collapse:collapse;margin:8pt 0 10pt}.identity td{border:0;padding:1.5pt 3pt;vertical-align:top}.identity td:first-child{width:115pt}.scores{width:100%;border-collapse:collapse;margin:10pt 0}.scores td{border:1px solid #aaa;text-align:center;padding:6pt;font-family:Arial,sans-serif;font-size:9pt}.scores b{display:block;font-size:10.5pt;margin-top:2pt}.history{width:100%;border-collapse:collapse;margin-top:6pt;font-size:9.5pt}.history th,.history td{border:1px solid #777;padding:4pt 5pt}.history th{text-align:left}.signwrap{width:100%;margin-top:18pt;border-collapse:collapse}.signwrap td{border:0}.sign{width:43%;vertical-align:top}.sign p{margin:0 0 2pt}.signassets{height:68pt;white-space:nowrap}.signname{text-decoration:underline;font-weight:bold}.muted{font-size:9pt;color:#555}
</style></head>
<body><div class="Section1">
<table class="head"><tr><td class="logo">${logo?`<img src="${logo}" alt="Logo sekolah">`:''}</td><td class="headtext"><h1>${esc(school?.name||'NAMA SEKOLAH')}</h1><p>${address||'Alamat sekolah'}</p>${contacts?`<div class="contacts">${contacts}</div>`:''}</td><td style="width:82px"></td></tr></table>
<div class="rule"></div>
<div class="title"><h2>${esc(title)}</h2><p>Nomor: ${esc(number)}</p></div>
<div class="body">${bodyIntro}
<table class="identity"><tr><td>Nama</td><td>: ${esc(student?.name||'-')}</td></tr><tr><td>NIS</td><td>: ${esc(student?.nis||'-')}</td></tr><tr><td>Kelas</td><td>: ${esc(student?.class_name||'-')}</td></tr><tr><td>Orang Tua/Wali</td><td>: ${esc(student?.parent_name||'-')}</td></tr></table>
<table class="scores"><tr><td>Pelanggaran<b>${esc(violation)} poin</b></td><td>Prestasi<b>${esc(achievement)} poin</b></td><td>Poin Bersih<b>${esc(score)} poin</b></td></tr></table>
${special}${extraHtml}${historyTable}${!isHistory?'<p>Demikian surat ini disampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami mengucapkan terima kasih.</p>':''}</div>
<table class="signwrap"><tr><td></td><td class="sign"><p>${esc(settings?.letter_city||school?.city||'................')}, ${esc(wordDate())}</p><p><b>${esc(settings?.signer_title||'Kepala Sekolah')}</b></p><div class="signassets">${assetImages}</div><p class="signname">${esc(school?.principal_name||'Nama Kepala Sekolah')}</p>${school?.principal_nip?`<p class="muted">NIP. ${esc(school.principal_nip)}</p>`:''}</td></tr></table>
</div></body></html>`;
}

export function ProfessionalReportsPage({school,students,incidents}:any){
 const [studentId,setStudentId]=useState('');
 const [docType,setDocType]=useState('notification');
 const [number,setNumber]=useState('');
 const [meetingDate,setMeetingDate]=useState('');
 const [extra,setExtra]=useState('');
 const [issuing,setIssuing]=useState(false);
 const [wordBusy,setWordBusy]=useState(false);
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

 async function ensureIssued(){
  if(!school||!student)return '';
  if(number&&issuedKey===currentKey)return number;
  setIssuing(true);setReportStatus('');
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
  setIssuing(false);
  if(error){setReportStatus(error.message||'Nomor dokumen gagal dibuat.');return ''}
  const row=Array.isArray(data)?data[0]:data;
  if(!row?.document_number){setReportStatus('Nomor dokumen gagal dibuat.');return ''}
  setNumber(row.document_number);setIssuedKey(currentKey);setReportStatus(`Nomor ${row.document_number} diterbitkan dan diarsipkan.`);
  return row.document_number as string;
 }

 async function printDocument(){
  const documentNumber=await ensureIssued();
  if(!documentNumber)return;
  setTimeout(()=>window.print(),180);
 }

 async function downloadWord(){
  if(!school||!student)return;
  const documentNumber=await ensureIssued();
  if(!documentNumber)return;
  setWordBusy(true);
  try{
   const html=await buildWordHtml({school,settings,student,history,violation,achievement,score,title:docTitles[docType],number:documentNumber,meetingDate,extra});
   const blob=new Blob(['\ufeff',html],{type:'application/msword;charset=utf-8'});
   const url=URL.createObjectURL(blob);
   const a=document.createElement('a');
   a.href=url;
   a.download=`${safeName(docTitles[docType])}-${safeName(student.name)}-${safeName(documentNumber)}.doc`;
   document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),1500);
   setReportStatus(`Word editable berhasil dibuat dengan nomor ${documentNumber}. File dapat diubah lagi di Microsoft Word.`);
  }catch(e:any){
   setReportStatus(e?.message||'File Word gagal dibuat.');
  }finally{setWordBusy(false)}
 }

 const waiting=issuing||wordBusy;
 return <div className="page">
  <div className="pageLead"><div><span className="eyebrow purple">GENERATE DOKUMEN</span><h1>Laporan & Surat</h1><p>Pilih siswa dan jenis dokumen. Hasil mengikuti template sekolah dan dapat diterbitkan sebagai PDF maupun Word editable.</p></div><div className="reportExportActions"><button className="ghost wordExportBtn" onClick={downloadWord} disabled={!student||waiting}><Download/> {wordBusy?'Membuat Word...':'Unduh Word'}</button><button className="primary" onClick={printDocument} disabled={!student||waiting}><Printer/> {issuing?'Menerbitkan...':'Cetak / Simpan PDF'}</button></div></div>
  {reportStatus&&<Notice kind={reportStatus.includes('gagal')||reportStatus.includes('error')?'warning':'success'}>{reportStatus}</Notice>}
  <div className="reportComposer"><div className="reportControls panel"><label>Jenis Dokumen<select value={docType} onChange={e=>setDocType(e.target.value)}><option value="notification">Surat Pemberitahuan Orang Tua</option><option value="summon">Surat Panggilan Orang Tua</option><option value="statement">Surat Pembinaan Peserta Didik</option><option value="history">Riwayat Kedisiplinan Siswa</option></select></label><label>Pilih Siswa<select value={studentId} onChange={e=>setStudentId(e.target.value)}><option value="">Pilih siswa...</option>{students.map((s:any)=><option key={s.id} value={s.id}>{s.name}{s.class_name?` — ${s.class_name}`:''}</option>)}</select></label><label>Nomor Dokumen<input value={number} readOnly placeholder="Otomatis saat PDF / Word diterbitkan" className="autoNumberInput"/><small className="fieldHelp">PDF dan Word menggunakan nomor dokumen yang sama selama isi dokumen tidak diubah.</small></label>{docType==='summon'&&<label>Jadwal Pertemuan<input type="datetime-local" value={meetingDate} onChange={e=>setMeetingDate(e.target.value)}/></label>}<label>Catatan Tambahan<textarea value={extra} onChange={e=>setExtra(e.target.value)} placeholder="Opsional. Misalnya arahan sekolah atau hal yang perlu dibawa orang tua."/></label><div className="reportHint"><ShieldCheck/><div><b>PDF resmi + Word editable</b><span>Nomor surat tetap berurutan dan diarsipkan. Versi Word dibuat agar sekolah dapat menyesuaikan isi kembali tanpa mengubah data yang tersimpan di aplikasi.</span></div></div></div><div className="paperStage"><LetterPreview school={school} settings={settings} student={student} history={history} violation={violation} achievement={achievement} score={score} title={docTitles[docType]} number={number} meetingDate={meetingDate} extra={extra}/></div></div>
 </div>
}
