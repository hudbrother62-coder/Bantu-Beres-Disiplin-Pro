'use client';
import {useRef,useState} from 'react';
import {Trash2} from 'lucide-react';
import {sb} from './client';

export default function DeleteData({table,id,schoolId,name,disabled,onBusyChange,onDeleted}:{table:'students'|'master_items';id:string;schoolId:string;name:string;disabled?:boolean;onBusyChange:(busy:boolean)=>void;onDeleted:()=>Promise<void>}){
 const lock=useRef(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 async function remove(){
  if(lock.current||disabled||!id||!schoolId)return;
  const impact=table==='students'?'Catatan kejadian, pembinaan, dan tindak lanjut milik siswa ini juga akan terhapus.':'Riwayat kejadian lama tetap menyimpan nama dan poin sebelumnya.';
  if(!window.confirm(`Hapus data "${name}"?\n\n${impact}\n\nPenghapusan permanen dan tidak dapat dibatalkan. Pilih Batal untuk mempertahankan data.`))return;
  lock.current=true;setBusy(true);onBusyChange(true);setError('');
  try{
   const result=await sb.from(table).delete().eq('id',id).eq('school_id',schoolId).select('id');
   if(result.error)throw result.error;
   if(result.data?.length!==1)throw new Error('Data tidak terhapus. Muat ulang dan periksa izin akun sekolah.');
   await onDeleted();
  }catch(e:any){setError(e.message||'Tidak dapat menghapus data. Silakan coba lagi.');}
  finally{lock.current=false;setBusy(false);onBusyChange(false);}
 }
 return <div style={{marginTop:20,borderTop:'1px solid #d1d5db',paddingTop:16}}>
  <button type="button" className="ghost danger" disabled={disabled||busy} onClick={remove}><Trash2/>{busy?'Menghapus...':'Hapus data'}</button>
  <p style={{fontSize:12,marginTop:8}}>Hanya data yang dipilih akan diproses setelah konfirmasi. {table==='students'?'Riwayat terkait siswa ini juga akan terhapus.':'Riwayat kejadian lama tetap tersimpan.'}</p>
  {error&&<p role="alert" className="error">{error}</p>}
 </div>;
}
