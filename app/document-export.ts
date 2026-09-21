'use client';

function clean(v:any){return String(v??'').replace(/\s+/g,' ').trim()}
function filename(v:any){return clean(v||'laporan').replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,100)||'laporan'}
function dateOnly(v:any){try{return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(v))}catch{return clean(v)||'-'}}
function dateTime(v:any){try{return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch{return clean(v)||'-'}}
function saveBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1800)}

export async function exportRecapDocx(args:any){
 const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,WidthType,AlignmentType,PageOrientation,BorderStyle,ShadingType}=await import('docx');
 const {school,start,end,filtersText,summaryRows,timeline,metrics}=args;
 const border={style:BorderStyle.SINGLE,size:1,color:'999999'};
 const borders={top:border,bottom:border,left:border,right:border};
 const p=(text:any,opts:any={})=>new Paragraph({alignment:opts.align||AlignmentType.LEFT,spacing:{after:opts.after??70},children:[new TextRun({text:clean(text)||'-',bold:!!opts.bold,size:opts.size||18,font:'Arial'})]});
 const cell=(text:any,opts:any={})=>new TableCell({borders,shading:opts.header?{type:ShadingType.CLEAR,fill:'EDEAF7'}:undefined,children:[p(text,{bold:opts.bold||opts.header,align:opts.align,size:opts.size||16,after:0})]});
 const headerRow=(labels:string[])=>new TableRow({tableHeader:true,children:labels.map(x=>cell(x,{header:true,align:AlignmentType.CENTER}))});
 const rowsA=(summaryRows||[]).map((r:any,i:number)=>new TableRow({children:[
   cell(i+1,{align:AlignmentType.CENTER}),cell(r.name),cell(r.nis||'-'),cell(r.class_name||'-'),
   cell(r.violations,{align:AlignmentType.CENTER}),cell(r.violation_points,{align:AlignmentType.CENTER}),cell(r.achievements,{align:AlignmentType.CENTER}),
   cell(r.coaching,{align:AlignmentType.CENTER}),cell(r.open_coaching,{align:AlignmentType.CENTER})
 ]}));
 const rowsB=(timeline||[]).map((r:any)=>new TableRow({children:[
   cell(dateTime(r.date)),cell(r.student),cell(r.class_name||'-'),cell(r.type),cell(r.title),cell(r.detail),cell(r.status),cell(r.recorder||'-')
 ]}));
 const summaryTable=new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[
  new TableRow({children:[
   cell('Siswa tercatat',{header:true}),cell('Catatan kejadian',{header:true}),cell('Pembinaan',{header:true}),cell('Pembinaan aktif',{header:true}),
   cell('Poin pelanggaran',{header:true}),cell('Poin prestasi',{header:true}),cell('Tindak lanjut aktif',{header:true})
  ]}),
  new TableRow({children:[
   cell(metrics.studentCount,{align:AlignmentType.CENTER,bold:true}),cell(metrics.incidentCount,{align:AlignmentType.CENTER,bold:true}),
   cell(metrics.coachingCount,{align:AlignmentType.CENTER,bold:true}),cell(metrics.coachingOpen,{align:AlignmentType.CENTER,bold:true}),
   cell(metrics.violationPoints,{align:AlignmentType.CENTER,bold:true}),cell(metrics.achievementPoints,{align:AlignmentType.CENTER,bold:true}),
   cell(metrics.pendingActions,{align:AlignmentType.CENTER,bold:true})
  ]})
 ]});
 const tableA=new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[headerRow(['No','Nama','NIS','Kelas','Pelanggaran','Poin','Prestasi','Pembinaan','Belum selesai']),...rowsA]});
 const tableB=new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[headerRow(['Tanggal','Siswa','Kelas','Jenis','Catatan','Uraian / Hasil','Status / Poin','Pencatat']),...rowsB]});
 const noborder={style:BorderStyle.NIL,size:0,color:'FFFFFF'};
 const noBorders={top:noborder,bottom:noborder,left:noborder,right:noborder,insideHorizontal:noborder,insideVertical:noborder};
 const signature=new Table({width:{size:100,type:WidthType.PERCENTAGE},borders:noBorders,rows:[new TableRow({children:[
   new TableCell({borders:noBorders,children:[p('Disusun oleh,',{align:AlignmentType.CENTER}),p('BK / Kesiswaan',{align:AlignmentType.CENTER,bold:true}),p('\n\n'+clean(school?.discipline_lead||'........................'),{align:AlignmentType.CENTER,bold:true})]}),
   new TableCell({borders:noBorders,children:[p('Mengetahui,',{align:AlignmentType.CENTER}),p('Kepala Sekolah',{align:AlignmentType.CENTER,bold:true}),p('\n\n'+clean(school?.principal_name||'........................'),{align:AlignmentType.CENTER,bold:true})]})
 ]})]});
 const doc=new Document({sections:[{properties:{page:{size:{orientation:PageOrientation.LANDSCAPE},margin:{top:650,right:650,bottom:650,left:650}}},children:[
  p(clean(school?.name||'NAMA SEKOLAH').toUpperCase(),{bold:true,size:28,align:AlignmentType.CENTER,after:20}),
  p(['NPSN '+clean(school?.npsn||'-'),clean(school?.address),clean(school?.city)].filter(Boolean).join(' · '),{size:17,align:AlignmentType.CENTER,after:110}),
  p('LAPORAN REKAP PEMBINAAN DAN CATATAN KEJADIAN SISWA',{bold:true,size:24,align:AlignmentType.CENTER,after:25}),
  p('Periode '+dateOnly(start)+' s.d. '+dateOnly(end),{size:18,align:AlignmentType.CENTER,after:20}),
  p(filtersText,{size:16,align:AlignmentType.CENTER,after:130}),
  summaryTable,
  p('A. Rekapitulasi Per Siswa',{bold:true,size:20,after:70}),
  tableA,
  p('B. Rincian Kejadian dan Pembinaan',{bold:true,size:20,after:70}),
  tableB,
  p('Dokumen ini disusun berdasarkan data yang tercatat pada Bantu Beres Disiplin Pro untuk kepentingan operasional, evaluasi, dan dokumentasi sekolah.',{size:16,after:120}),
  signature
 ]}]});
 const blob=await Packer.toBlob(doc);
 saveBlob(blob,filename('Rekap Disiplin '+(school?.name||'Sekolah')+' '+start+' '+end)+'.docx');
}

export async function exportRecapPdf(args:any){
 const [{jsPDF},{autoTable}]=await Promise.all([import('jspdf'),import('jspdf-autotable')]);
 const {school,start,end,filtersText,summaryRows,timeline,metrics}=args;
 const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
 const W=doc.internal.pageSize.getWidth(),margin=12;
 const drawHeader=(pageNo:number)=>{
  doc.setTextColor(25,25,25);doc.setFont('helvetica','bold');doc.setFontSize(12);
  doc.text(clean(school?.name||'NAMA SEKOLAH').toUpperCase(),W/2,10,{align:'center'});
  doc.setFont('helvetica','normal');doc.setFontSize(7.5);
  doc.text(['NPSN '+clean(school?.npsn||'-'),clean(school?.address),clean(school?.city)].filter(Boolean).join(' · '),W/2,14,{align:'center'});
  doc.setDrawColor(30);doc.line(margin,17,W-margin,17);
  doc.setFontSize(7);doc.setTextColor(90);doc.text('Halaman '+pageNo,W-margin,202,{align:'right'});
 };
 let page=1;drawHeader(page);
 doc.setTextColor(20);doc.setFont('helvetica','bold');doc.setFontSize(11);
 doc.text('LAPORAN REKAP PEMBINAAN DAN CATATAN KEJADIAN SISWA',W/2,24,{align:'center'});
 doc.setFont('helvetica','normal');doc.setFontSize(7.5);
 doc.text('Periode '+dateOnly(start)+' s.d. '+dateOnly(end),W/2,28,{align:'center'});
 doc.text(filtersText,W/2,32,{align:'center',maxWidth:W-30});
 autoTable(doc,{startY:37,theme:'grid',styles:{fontSize:7,halign:'center',cellPadding:2,textColor:20},headStyles:{fillColor:[235,232,247],textColor:30,fontStyle:'bold'},head:[['Siswa','Kejadian','Pembinaan','Pembinaan Aktif','Poin Pelanggaran','Poin Prestasi','Tindak Lanjut']],body:[[metrics.studentCount,metrics.incidentCount,metrics.coachingCount,metrics.coachingOpen,metrics.violationPoints,metrics.achievementPoints,metrics.pendingActions]],margin:{left:margin,right:margin}});
 let y=(doc as any).lastAutoTable.finalY+8;
 doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('A. Rekapitulasi Per Siswa',margin,y);
 autoTable(doc,{startY:y+3,theme:'grid',styles:{fontSize:6.7,cellPadding:1.6,overflow:'linebreak',valign:'top'},headStyles:{fillColor:[235,232,247],textColor:25,fontStyle:'bold'},head:[['No','Nama','NIS','Kelas','Pelanggaran','Poin','Prestasi','Pembinaan','Belum selesai']],body:(summaryRows||[]).map((r:any,i:number)=>[i+1,r.name,r.nis||'-',r.class_name||'-',r.violations,r.violation_points,r.achievements,r.coaching,r.open_coaching]),margin:{left:margin,right:margin},didDrawPage:()=>{page=doc.getNumberOfPages();drawHeader(page)}});
 y=(doc as any).lastAutoTable.finalY+8;
 if(y>180){doc.addPage();page=doc.getNumberOfPages();drawHeader(page);y=23}
 doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('B. Rincian Kejadian dan Pembinaan',margin,y);
 autoTable(doc,{startY:y+3,theme:'grid',styles:{fontSize:6.2,cellPadding:1.4,overflow:'linebreak',valign:'top'},headStyles:{fillColor:[235,232,247],textColor:25,fontStyle:'bold'},columnStyles:{0:{cellWidth:24},1:{cellWidth:31},2:{cellWidth:19},3:{cellWidth:20},4:{cellWidth:34},5:{cellWidth:70},6:{cellWidth:23},7:{cellWidth:28}},head:[['Tanggal','Siswa','Kelas','Jenis','Catatan','Uraian / Hasil','Status / Poin','Pencatat']],body:(timeline||[]).map((r:any)=>[dateTime(r.date),r.student,r.class_name||'-',r.type,r.title,r.detail,r.status,r.recorder||'-']),margin:{left:margin,right:margin},didDrawPage:()=>{page=doc.getNumberOfPages();drawHeader(page)}});
 y=(doc as any).lastAutoTable.finalY+8;
 if(y>178){doc.addPage();page=doc.getNumberOfPages();drawHeader(page);y=27}
 doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(80);
 doc.text('Dokumen ini disusun berdasarkan data yang tercatat pada Bantu Beres Disiplin Pro.',margin,y);
 y+=13;doc.setTextColor(30);doc.setFontSize(8);
 doc.text('Disusun oleh,',55,y,{align:'center'});doc.text('Mengetahui,',W-55,y,{align:'center'});
 doc.setFont('helvetica','bold');doc.text('BK / Kesiswaan',55,y+4,{align:'center'});doc.text('Kepala Sekolah',W-55,y+4,{align:'center'});
 doc.text(clean(school?.discipline_lead||'........................'),55,y+20,{align:'center'});
 doc.text(clean(school?.principal_name||'........................'),W-55,y+20,{align:'center'});
 doc.save(filename('Rekap Disiplin '+(school?.name||'Sekolah')+' '+start+' '+end)+'.pdf');
}

export async function exportStudentDocx(args:any){
 const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,WidthType,AlignmentType,BorderStyle,ShadingType}=await import('docx');
 const {school,settings,student,history,violation,achievement,score,title,number,meetingDate,extra}=args;
 const border={style:BorderStyle.SINGLE,size:1,color:'999999'},borders={top:border,bottom:border,left:border,right:border};
 const p=(text:any,opts:any={})=>new Paragraph({alignment:opts.align||AlignmentType.LEFT,spacing:{after:opts.after??90},children:[new TextRun({text:clean(text)||'-',bold:!!opts.bold,size:opts.size||21,font:'Times New Roman'})]});
 const cell=(text:any,opts:any={})=>new TableCell({borders,shading:opts.header?{type:ShadingType.CLEAR,fill:'EEEEEE'}:undefined,children:[p(text,{bold:opts.bold||opts.header,align:opts.align,size:opts.size||18,after:0})]});
 const identity=new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[
  new TableRow({children:[cell('Nama',{bold:true}),cell(student?.name||'-')]}),new TableRow({children:[cell('NIS',{bold:true}),cell(student?.nis||'-')]}),
  new TableRow({children:[cell('Kelas',{bold:true}),cell(student?.class_name||'-')]}),new TableRow({children:[cell('Orang Tua/Wali',{bold:true}),cell(student?.parent_name||'-')]})
 ]});
 const scores=new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[new TableRow({children:[
  cell('Pelanggaran\n'+violation+' poin',{align:AlignmentType.CENTER}),cell('Prestasi\n'+achievement+' poin',{align:AlignmentType.CENTER}),cell('Poin Bersih\n'+score+' poin',{align:AlignmentType.CENTER})
 ]})]});
 const historyTable=(history||[]).length?new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[
  new TableRow({tableHeader:true,children:[cell('Tanggal',{header:true}),cell('Catatan',{header:true}),cell('Jenis',{header:true}),cell('Poin',{header:true})]}),
  ...(history||[]).map((x:any)=>new TableRow({children:[cell(dateOnly(x.occurred_at)),cell(x.item_name_snapshot||'-'),cell(x.type==='violation'?'Pelanggaran':'Prestasi'),cell(x.points_snapshot||0,{align:AlignmentType.CENTER})]}))
 ]}):null;
 const intro=String(title).includes('RIWAYAT')?'Berikut adalah ringkasan riwayat kedisiplinan peserta didik:':'Yth. Bapak/Ibu Orang Tua/Wali Peserta Didik\ndi Tempat\n\nDengan hormat,\nSehubungan dengan proses pembinaan dan pemantauan kedisiplinan peserta didik, sekolah menyampaikan informasi mengenai:';
 const special=String(title).includes('PANGGILAN')?'Dimohon kehadiran Bapak/Ibu pada '+(meetingDate?dateTime(meetingDate):'waktu yang akan disepakati bersama sekolah')+' untuk koordinasi tindak lanjut pembinaan.':String(title).includes('PEMBINAAN')?'Surat ini menjadi bagian dari dokumentasi pembinaan peserta didik dan digunakan sebagai bahan tindak lanjut bersama sekolah dan orang tua/wali.':'';
 const city=settings?.letter_city||school?.city||'................';
 const children:any[]=[
  p(clean(school?.name||'NAMA SEKOLAH').toUpperCase(),{bold:true,size:30,align:AlignmentType.CENTER,after:15}),
  p([clean(school?.address),clean(school?.city),clean(school?.province)].filter(Boolean).join(', '),{size:18,align:AlignmentType.CENTER,after:15}),
  p(['NPSN '+clean(school?.npsn||'-'),clean(school?.phone),clean(school?.email_contact)].filter(Boolean).join(' · '),{size:17,align:AlignmentType.CENTER,after:130}),
  p(title,{bold:true,size:24,align:AlignmentType.CENTER,after:20}),
  p('Nomor: '+number,{size:20,align:AlignmentType.CENTER,after:150}),
  ...intro.split('\n').map((line:string)=>p(line||' ',{after:55})),identity,p(' ',{after:30}),scores
 ];
 if(special)children.push(p(special,{after:90}));
 if(extra)children.push(p(extra,{after:90}));
 if(historyTable){children.push(p('Riwayat Terkait',{bold:true,size:21,after:50}),historyTable)}
 if(!String(title).includes('RIWAYAT'))children.push(p('Demikian surat ini disampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami mengucapkan terima kasih.',{after:140}));
 children.push(p(city+', '+dateOnly(new Date()),{align:AlignmentType.RIGHT,after:20}),p(settings?.signer_title||'Kepala Sekolah',{bold:true,align:AlignmentType.RIGHT,after:220}),p(school?.principal_name||'Nama Kepala Sekolah',{bold:true,align:AlignmentType.RIGHT,after:20}));
 if(school?.principal_nip)children.push(p('NIP. '+school.principal_nip,{align:AlignmentType.RIGHT,after:20}));
 const doc=new Document({sections:[{properties:{page:{margin:{top:700,right:780,bottom:760,left:780}}},children}]});
 const blob=await Packer.toBlob(doc);saveBlob(blob,filename(title+' '+student?.name+' '+number)+'.docx');
}

export async function exportStudentPdf(args:any){
 const [{jsPDF},{autoTable}]=await Promise.all([import('jspdf'),import('jspdf-autotable')]);
 const {school,settings,student,history,violation,achievement,score,title,number,meetingDate,extra}=args;
 const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'}),W=doc.internal.pageSize.getWidth(),margin=18;
 let y=14;doc.setTextColor(20);doc.setFont('helvetica','bold');doc.setFontSize(14);doc.text(clean(school?.name||'NAMA SEKOLAH').toUpperCase(),W/2,y,{align:'center'});
 y+=5;doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text([clean(school?.address),clean(school?.city),clean(school?.province)].filter(Boolean).join(', '),W/2,y,{align:'center',maxWidth:W-30});
 y+=4;doc.text(['NPSN '+clean(school?.npsn||'-'),clean(school?.phone),clean(school?.email_contact)].filter(Boolean).join(' · '),W/2,y,{align:'center'});
 y+=4;doc.setDrawColor(20);doc.setLineWidth(.8);doc.line(margin,y,W-margin,y);y+=7;
 doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text(title,W/2,y,{align:'center',maxWidth:W-25});y+=5;
 doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.text('Nomor: '+number,W/2,y,{align:'center'});y+=9;
 const intro=String(title).includes('RIWAYAT')?'Berikut adalah ringkasan riwayat kedisiplinan peserta didik:':'Yth. Bapak/Ibu Orang Tua/Wali Peserta Didik\ndi Tempat\n\nDengan hormat,\nSehubungan dengan proses pembinaan dan pemantauan kedisiplinan peserta didik, sekolah menyampaikan informasi mengenai:';
 doc.setFontSize(9);for(const para of intro.split('\n')){if(!para){y+=3;continue}const lines=doc.splitTextToSize(para,W-margin*2);doc.text(lines,margin,y);y+=lines.length*4.2}
 autoTable(doc,{startY:y+2,theme:'plain',styles:{fontSize:9,cellPadding:1.2},columnStyles:{0:{cellWidth:36,fontStyle:'bold'},1:{cellWidth:130}},body:[['Nama',student?.name||'-'],['NIS',student?.nis||'-'],['Kelas',student?.class_name||'-'],['Orang Tua/Wali',student?.parent_name||'-']],margin:{left:margin,right:margin}});
 y=(doc as any).lastAutoTable.finalY+5;
 autoTable(doc,{startY:y,theme:'grid',styles:{fontSize:8.5,halign:'center',cellPadding:2},headStyles:{fillColor:[238,238,238],textColor:20},body:[['Pelanggaran\n'+violation+' poin','Prestasi\n'+achievement+' poin','Poin Bersih\n'+score+' poin']],margin:{left:margin,right:margin}});
 y=(doc as any).lastAutoTable.finalY+6;
 const special=String(title).includes('PANGGILAN')?'Dimohon kehadiran Bapak/Ibu pada '+(meetingDate?dateTime(meetingDate):'waktu yang akan disepakati bersama sekolah')+' untuk koordinasi tindak lanjut pembinaan.':String(title).includes('PEMBINAAN')?'Surat ini menjadi bagian dari dokumentasi pembinaan peserta didik dan digunakan sebagai bahan tindak lanjut bersama sekolah dan orang tua/wali.':'';
 for(const txt of [special,extra].filter(Boolean)){const lines=doc.splitTextToSize(clean(txt),W-margin*2);doc.text(lines,margin,y);y+=lines.length*4.2+2}
 if((history||[]).length){
  if(y>235){doc.addPage();y=18}
  doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('Riwayat Terkait',margin,y);y+=2;
  autoTable(doc,{startY:y+2,theme:'grid',styles:{fontSize:7.5,cellPadding:1.6,overflow:'linebreak'},headStyles:{fillColor:[238,238,238],textColor:20},head:[['Tanggal','Catatan','Jenis','Poin']],body:(history||[]).map((x:any)=>[dateOnly(x.occurred_at),x.item_name_snapshot||'-',x.type==='violation'?'Pelanggaran':'Prestasi',x.points_snapshot||0]),margin:{left:margin,right:margin}});
  y=(doc as any).lastAutoTable.finalY+6;
 }
 if(!String(title).includes('RIWAYAT')){if(y>250){doc.addPage();y=18}const lines=doc.splitTextToSize('Demikian surat ini disampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami mengucapkan terima kasih.',W-margin*2);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text(lines,margin,y);y+=lines.length*4.2+8}
 if(y>245){doc.addPage();y=30}
 const sx=W-65;doc.setFontSize(9);doc.text((settings?.letter_city||school?.city||'................')+', '+dateOnly(new Date()),sx,y,{align:'center'});doc.setFont('helvetica','bold');doc.text(settings?.signer_title||'Kepala Sekolah',sx,y+5,{align:'center'});doc.text(clean(school?.principal_name||'Nama Kepala Sekolah'),sx,y+28,{align:'center'});if(school?.principal_nip)doc.setFont('helvetica','normal').text('NIP. '+school.principal_nip,sx,y+33,{align:'center'});
 doc.save(filename(title+' '+student?.name+' '+number)+'.pdf');
}
