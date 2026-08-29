import {createClient} from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

export const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
export const typeLabel:any={violation:'Pelanggaran',achievement:'Prestasi',sanction:'Sanksi'};
export function norm(v:any){return String(v??'').trim().toLowerCase().replace(/[._-]+/g,' ').replace(/\s+/g,' ')}
export function val(row:any,names:string[]){for(const [k,v] of Object.entries(row||{})){if(names.includes(norm(k)))return v}return ''}
export function num(v:any){const n=Number(String(v??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?Math.abs(Math.round(n)):0}
export function localDateTime(){const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)}
export function humanDate(v:any){try{return new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v))}catch{return String(v||'')}}
export function downloadBook(book:XLSX.WorkBook,name:string){XLSX.writeFile(book,name)}
export function credentialToEmail(value:string){const v=value.trim().toLowerCase();if(v.includes('@'))return v;const safe=v.replace(/[^a-z0-9._-]/g,'').replace(/^\.+|\.+$/g,'')||`sekolah-${Date.now()}`;return `${safe}@login.bantuberes.local`}
export function friendlyAuthError(message:string){const m=message.toLowerCase();if(m.includes('invalid login'))return 'Email/username atau password tidak cocok.';if(m.includes('email not confirmed'))return 'Akun sedang diaktifkan. Coba tekan Masuk sekali lagi.';if(m.includes('already registered')||m.includes('already been registered'))return 'Akun ini sudah terdaftar. Silakan masuk.';if(m.includes('password'))return 'Password minimal 6 karakter.';if(m.includes('security purposes')||m.includes('rate limit'))return 'Akun sudah pernah dibuat. Silakan masuk menggunakan akun tersebut.';return message}
