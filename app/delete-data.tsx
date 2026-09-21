'use client';
import {useRef,useState} from 'react';
import {Archive,Trash2} from 'lucide-react';
import {sb} from './client';

export default function DeleteData({table,id,schoolId,name,disabled,onBusyChange,onDeleted}:{table:'students'|'master_items';id:string;schoolId:string;name:string;disabled?:boolean;onBusyChange:(busy:boolean)=>void;onDeleted:()=>Promise<void>}){
 const lock=useRef(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 async function remove(){
  if(lock.current||disabled||!id||!schoolId)return;
  const isStudent=table==='students';
  const impact=isStudent
   ?'Siswa akan dipindahkan ke Draft Hapus, BUKAN dihapus permanen. Catatan kejadian, pembinaan, tindak lanjut, dan dokumen tetap tersimpan.'
   :'Riwayat kejadian lama tetap menyimpan nama dan poin sebelumnya.';
  if(!window.confirm((isStudent?'Masukkan siswa ke Draft Hapus':'Hapus data')+' "'+name+'"?\n\n'+impact+'\n\nPilih Batal jika tidak ingin melanjutkan.'))return;
  lock.current=true;setBusy(true);onBusyChange(true);setError('');
  try{
   if(isStudent){
    const result=await sb.rpc('manage_students_archive',{p_student_ids:[id],p_all:false,p_restore:false});
    if(result.error)throw result.error;
    if(!result.data)throw new Error('Siswa tidak berubah. Muat ulang dan periksa kembali.');
   }else{
    const result=await sb.from(table).delete().eq('id',id).eq('school_id',schoolId).select('id');
    if(result.error)throw result.error;
    if(result.data?.length!==1)throw new Error('Data tidak terhapus. Muat ulang dan periksa izin akun sekolah.');
   }
   await onDeleted();
  }catch(e:any){setError(e.message||'Tidak dapat memproses data. Silakan coba lagi.');}
  finally{lock.current=false;setBusy(false);onBusyChange(false);}
 }
 const isStudent=table==='students';
 return <div style={{marginTop:20,borderTop:'1px solid #d1d5db',paddingTop:16}}>
  <button type="button" className="ghost danger" disabled={disabled||busy} onClick={remove}>{isStudent?<Archive/>:<Trash2/>}{busy?'Memproses...':isStudent?'Masukkan ke Draft Hapus':'Hapus data'}</button>
  <p style={{fontSize:12,marginTop:8}}>{isStudent?'Data siswa tidak dihapus permanen. Riwayat kejadian, pembinaan, tindak lanjut, dan dokumen tetap aman dan siswa dapat dikembalikan dari Draft Hapus.':'Riwayat kejadian lama tetap tersimpan.'}</p>
  {error&&<p role="alert" className="error">{error}</p>}
 </div>;
}
