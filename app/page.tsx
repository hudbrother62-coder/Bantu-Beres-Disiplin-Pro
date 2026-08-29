'use client';
import {useEffect,useState} from 'react';
import {LayoutDashboard,Users,PlusCircle,ClipboardCheck,FileText,Database,Settings,Sun,Moon,Menu,X,LogOut,School,UserRound,BarChart3,ListChecks,FileSpreadsheet} from 'lucide-react';
import {sb,credentialToEmail,friendlyAuthError} from './client';
import {PageRouter} from './modules';

const nav=[['Dashboard',LayoutDashboard],['Data Siswa',Users],['Catat Kejadian',PlusCircle],['Pembinaan',ClipboardCheck],['Tindak Lanjut',ListChecks],['Laporan',FileText],['Analitik',BarChart3],['Master Data',Database],['Import & Export',FileSpreadsheet],['Pengaturan',Settings]] as const;

export default function Home(){
 const [dark,setDark]=useState(false);
 const [drawer,setDrawer]=useState(false);
 const [active,setActive]=useState('Dashboard');
 const [session,setSession]=useState<any>(null);
 const [loading,setLoading]=useState(true);
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [authMode,setAuthMode]=useState<'login'|'signup'>('login');
 const [msg,setMsg]=useState('');
 const [students,setStudents]=useState<any[]>([]);
 const [school,setSchool]=useState<any>(null);
 const [master,setMaster]=useState<any[]>([]);
 const [incidents,setIncidents]=useState<any[]>([]);
 const [coaching,setCoaching]=useState<any[]>([]);
 const [actions,setActions]=useState<any[]>([]);
 const [schoolName,setSchoolName]=useState('');
 const [principalName,setPrincipalName]=useState('');
 const [npsn,setNpsn]=useState('');
 const [busy,setBusy]=useState(false);

 useEffect(()=>{const stored=localStorage.getItem('bb-theme');if(stored==='dark')setDark(true);sb.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)});const {data:{subscription}}=sb.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>subscription.unsubscribe()},[]);
 useEffect(()=>{localStorage.setItem('bb-theme',dark?'dark':'light')},[dark]);
 useEffect(()=>{if(session)load()},[session]);

 async function load(){
  if(!session?.user)return;
  let {data:s}=await sb.from('schools').select('*').eq('owner_user_id',session.user.id).maybeSingle();
  if(!s){const m=session.user.user_metadata||{};const created=await sb.from('schools').insert({owner_user_id:session.user.id,name:m.school_name||'Sekolah Baru',principal_name:m.principal_name||null,npsn:m.npsn||null}).select().single();s=created.data}
  setSchool(s||null);if(!s)return;
  const [a,b,c,d,e]=await Promise.all([
   sb.from('students').select('*').eq('school_id',s.id).order('name'),
   sb.from('master_items').select('*').eq('school_id',s.id).order('type').order('name'),
   sb.from('incidents').select('*,students(name,class_name,nis)').eq('school_id',s.id).order('occurred_at',{ascending:false}).limit(500),
   sb.from('coaching_sessions').select('*,students(name,class_name)').eq('school_id',s.id).order('happened_at',{ascending:false}).limit(300),
   sb.from('student_actions').select('*,students(name,class_name)').eq('school_id',s.id).order('created_at',{ascending:false}).limit(300)
  ]);
  setStudents(a.data||[]);setMaster(b.data||[]);setIncidents(c.data||[]);setCoaching(d.data||[]);setActions(e.data||[]);
 }

 async function auth(e:any){
  e.preventDefault();setMsg('');setBusy(true);const authEmail=credentialToEmail(email);
  try{
   if(authMode==='login'){const {error}=await sb.auth.signInWithPassword({email:authEmail,password});if(error)setMsg(friendlyAuthError(error.message));return}
   if(!schoolName.trim()){setMsg('Nama sekolah wajib diisi.');return}
   if(!principalName.trim()){setMsg('Nama kepala sekolah wajib diisi.');return}
   const metadata={school_name:schoolName.trim(),principal_name:principalName.trim(),npsn:npsn.trim(),login_label:email.trim()};
   const {data,error}=await sb.auth.signUp({email:authEmail,password,options:{data:metadata}});
   if(error){await sb.rpc('activate_recent_signup_by_email',{p_email:authEmail});const retry=await sb.auth.signInWithPassword({email:authEmail,password});if(!retry.error){setMsg('');return}setMsg(friendlyAuthError(error.message));return}
   if(data.user&&!data.session){await sb.rpc('activate_new_signup',{p_user_id:data.user.id,p_email:authEmail});const signed=await sb.auth.signInWithPassword({email:authEmail,password});if(signed.error){setMsg(friendlyAuthError(signed.error.message));return}}
   setMsg('');
  }finally{setBusy(false)}
 }
 async function logout(){await sb.auth.signOut();setSession(null)}
 function switchMode(){setAuthMode(authMode==='login'?'signup':'login');setMsg('');setPassword('')}

 if(loading)return <main className="center"><div className="loader"/></main>;
 if(!session)return <main className={'login '+(dark?'dark':'')}><button className="theme floating" onClick={()=>setDark(!dark)}>{dark?<Sun/>:<Moon/>}</button><section className={'authCard '+(authMode==='signup'?'signupCard':'loginCard')}><Brand/><div className="authModeBadge">{authMode==='login'?<><UserRound/> AKSES SEKOLAH</>:<><School/> SEKOLAH BARU</>}</div><div className="authIntro"><h1>{authMode==='login'?'Masuk ke Disiplin Pro':'Daftarkan sekolah'}</h1><p>{authMode==='login'?'Gunakan email atau username sekolah dan password yang sudah dibuat.':'Isi identitas dasar sekolah. Setelah menekan Buat Akun, Anda langsung masuk tanpa verifikasi email.'}</p></div><form onSubmit={auth}>{authMode==='signup'&&<div className="signupFields"><label>Nama Sekolah<input type="text" value={schoolName} onChange={e=>setSchoolName(e.target.value)} required placeholder="Contoh: SMP Negeri 1"/></label><label>Nama Kepala Sekolah<input type="text" value={principalName} onChange={e=>setPrincipalName(e.target.value)} required placeholder="Nama kepala sekolah"/></label><label>NPSN <span className="optional">(Opsional)</span><input type="text" value={npsn} onChange={e=>setNpsn(e.target.value)} placeholder="Boleh dikosongkan"/></label></div>}<label>{authMode==='login'?'Email / Username':'Email / Username sekolah'}<input type="text" value={email} onChange={e=>setEmail(e.target.value)} required autoCapitalize="none" autoCorrect="off" placeholder={authMode==='login'?'nama@email.com atau sekolahku':'nama@email.com atau username bebas'}/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} placeholder="Minimal 6 karakter"/></label>{msg&&<p className="error">{msg}</p>}<button className="primary" disabled={busy}>{busy?'Memproses...':authMode==='login'?'Masuk':'Buat Akun & Masuk'}</button></form><div className="authDivider"><span>{authMode==='login'?'Belum punya akun sekolah?':'Sudah memiliki akun sekolah?'}</span></div><button className="link switchAuth" onClick={switchMode}>{authMode==='login'?'Daftarkan Sekolah Baru':'Kembali ke Login'}</button></section></main>;

 return <div className={dark?'app dark':'app'}><aside className={drawer?'side open':'side'}><div className="sideTop"><Brand/><button className="close" onClick={()=>setDrawer(false)}><X/></button></div><nav>{nav.map(([n,I])=><button key={n} className={active===n?'nav active':'nav'} onClick={()=>{setActive(n);setDrawer(false)}}><I/><span>{n}</span></button>)}</nav><div className="sideFoot"><div className="schoolMini"><div className="avatar">{(school?.name||'S')[0]}</div><div><b>{school?.name||'Sekolah'}</b><small>{school?.academic_year||'2026/2027'}</small></div></div><button className="nav" onClick={logout}><LogOut/><span>Keluar</span></button></div></aside>{drawer&&<div className="backdrop" onClick={()=>setDrawer(false)}/>}<main className="content"><header><button className="hamb" onClick={()=>setDrawer(true)}><Menu/></button><div><h2>{active}</h2><p>{school?.name||'Bantu Beres Disiplin Pro'}</p></div><div className="headerActions"><button className="theme" onClick={()=>setDark(!dark)}>{dark?<Sun/>:<Moon/>}</button><button className="primary small" onClick={()=>setActive('Catat Kejadian')}><PlusCircle/> Catat Kejadian</button></div></header><PageRouter active={active} setActive={setActive} school={school} students={students} master={master} incidents={incidents} coaching={coaching} actions={actions} reload={load} dark={dark} setDark={setDark}/></main></div>;
}

function Brand(){return <div className="brand"><div className="brandIcon">B</div><div><b>Bantu Beres</b><span>Disiplin Pro</span></div></div>}
