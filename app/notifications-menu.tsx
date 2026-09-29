'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Bell,CheckCheck,ChevronRight,Megaphone,X} from 'lucide-react';
import {sb} from './client';
import './notifications-menu.css';

const CLASS_RENAME_RELEASE={
 id:'release-2026-09-29-class-rename',
 title:'Baru! Nama Kelas Sekarang Bisa Diubah',
 message:'Ubah kelas 7A, 7B, dan seterusnya menjadi X TKJ, X MP, X AK, atau nama lainnya. Seluruh siswa pada kelas tersebut, termasuk yang di Draft Hapus, ikut diperbarui tanpa impor ulang. Nama siswa, NIS, dan riwayat kedisiplinan tetap aman.',
 published_at:'2026-09-29T16:36:00+07:00',
 action_view:'Data Siswa'
};
const releaseStorageKey=(userId:string)=>'bb-disiplin-release-read:'+userId+':'+CLASS_RENAME_RELEASE.id;


function when(value:string){
 try{
  const d=new Date(value),now=new Date();
  const diff=now.getTime()-d.getTime();
  const min=Math.floor(diff/60000),hour=Math.floor(min/60),day=Math.floor(hour/24);
  if(min<1)return 'Baru saja';
  if(min<60)return min+' menit lalu';
  if(hour<24)return hour+' jam lalu';
  if(day<7)return day+' hari lalu';
  return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short',year:'numeric'}).format(d);
 }catch{return ''}
}

export default function NotificationsMenu({userId,navigate}:{userId:string;navigate:(view:string)=>void}){
 const [items,setItems]=useState<any[]>([]);
 const [readIds,setReadIds]=useState<Set<string>>(new Set());
 const [open,setOpen]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [releaseRead,setReleaseRead]=useState(true);
 const wrapRef=useRef<HTMLDivElement>(null);

 useEffect(()=>{
  try{setReleaseRead(window.localStorage.getItem(releaseStorageKey(userId))==='1')}
  catch{setReleaseRead(false)}
 },[userId]);

 function markReleaseRead(){
  setReleaseRead(true);
  try{window.localStorage.setItem(releaseStorageKey(userId),'1')}catch{/* Storage may be unavailable in private mode. */}
 }
 function openRelease(){
  markReleaseRead();
  setOpen(false);
  navigate(CLASS_RENAME_RELEASE.action_view);
 }


 const load=useCallback(async()=>{
  if(!userId)return;
  try{
   const [ann,reads]=await Promise.all([
    sb.from('app_announcements').select('id,slug,title,message,category,action_view,published_at').order('published_at',{ascending:false}).limit(30),
    sb.from('app_notification_reads').select('announcement_id').eq('user_id',userId)
   ]);
   if(ann.error)throw ann.error;
   if(reads.error)throw reads.error;
   setItems(ann.data||[]);
   setReadIds(new Set((reads.data||[]).map((x:any)=>x.announcement_id)));
   setError('');
  }catch(e:any){
   setError(e?.message||'Notifikasi belum dapat dimuat.');
  }finally{setLoading(false)}
 },[userId]);

 useEffect(()=>{
  void load();
  const channel=sb.channel('bb-global-announcements-'+userId)
   .on('postgres_changes',{event:'*',schema:'public',table:'app_announcements'},()=>void load())
   .subscribe();
  const timer=window.setInterval(()=>void load(),60000);
  return()=>{window.clearInterval(timer);void sb.removeChannel(channel)}
 },[load,userId]);

 useEffect(()=>{
  const outside=(e:MouseEvent)=>{if(wrapRef.current&&!wrapRef.current.contains(e.target as Node))setOpen(false)};
  document.addEventListener('mousedown',outside);
  return()=>document.removeEventListener('mousedown',outside);
 },[]);

 const unread=useMemo(()=>items.filter(x=>!readIds.has(x.id)).length+(releaseRead?0:1),[items,readIds,releaseRead]);

 async function markOne(id:string){
  if(readIds.has(id))return;
  const {error}=await sb.from('app_notification_reads').upsert({announcement_id:id,user_id:userId,read_at:new Date().toISOString()},{onConflict:'announcement_id,user_id'});
  if(!error)setReadIds(prev=>new Set(prev).add(id));
 }

 async function markAll(){
  markReleaseRead();
  const ids=items.filter(x=>!readIds.has(x.id)).map(x=>x.id);
  if(!ids.length)return;
  const rows=ids.map(id=>({announcement_id:id,user_id:userId,read_at:new Date().toISOString()}));
  const {error}=await sb.from('app_notification_reads').upsert(rows,{onConflict:'announcement_id,user_id'});
  if(!error)setReadIds(new Set(items.map(x=>x.id)));
 }

 async function openItem(item:any){
  await markOne(item.id);
  if(item.action_view){setOpen(false);navigate(item.action_view)}
 }

 return <div className="notifWrap" ref={wrapRef}>
  <button type="button" className={open?'notifBell active':'notifBell'} onClick={()=>setOpen(v=>!v)} aria-label={'Notifikasi'+(unread?' '+unread+' belum dibaca':'')}>
   <Bell/>
   {unread>0&&<span className="notifBadge">{unread>99?'99+':unread}</span>}
  </button>
  {open&&<section className="notifPanel">
   <div className="notifHead">
    <div><span className="notifEyebrow"><Megaphone/> PENGUMUMAN APLIKASI</span><h3>Notifikasi</h3><p>{unread?unread+' belum dibaca':'Semua sudah dibaca'}</p></div>
    <button type="button" className="notifClose" onClick={()=>setOpen(false)}><X/></button>
   </div>
   {unread>0&&<button type="button" className="notifMarkAll" onClick={markAll}><CheckCheck/> Tandai semua dibaca</button>}
   <div className="notifList">
    <button type="button" className={releaseRead?'notifItem notifRelease read':'notifItem notifRelease unread'} onClick={openRelease}>
     <span className="notifDot"/>
     <div className="notifContent">
      <div className="notifMeta"><span>UPDATE FITUR · 29 SEP 2026</span><span className="releaseTag">BARU</span></div>
      <b>{CLASS_RENAME_RELEASE.title}</b>
      <p>{CLASS_RENAME_RELEASE.message}</p>
      <small>Buka Data Siswa <ChevronRight/></small>
     </div>
    </button>
    {loading?<div className="notifState">Memuat pengumuman lainnya...</div>:error?<div className="notifState error">Pengumuman lainnya belum dapat dimuat.</div>:items.length?items.map(item=>{
     const isRead=readIds.has(item.id);
     return <button type="button" key={item.id} className={isRead?'notifItem read':'notifItem unread'} onClick={()=>void openItem(item)}>
      <span className="notifDot"/>
      <div className="notifContent">
       <div className="notifMeta"><span>{item.category==='update'?'Update Aplikasi':'Pengumuman'}</span><time>{when(item.published_at)}</time></div>
       <b>{item.title}</b>
       <p>{item.message}</p>
       {item.action_view&&<small>Buka {item.action_view} <ChevronRight/></small>}
      </div>
     </button>
    }):null}
   </div>
   <footer className="notifFoot">Bantu Beres Disiplin Pro</footer>
  </section>}
 </div>
}