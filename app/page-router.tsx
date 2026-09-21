'use client';
import {PageRouter as LegacyPageRouter} from './modules';
import {ProfessionalReportsPage,TemplateReportPage} from './report-template-v3';
import StyledSettingsPage from './settings-page';
import PolishedIncidentPage from './incident-page';
import StudentsPageV2 from './students-page-v2';
import DisciplineRecapPage from './discipline-recap';

export function PageRouter(p:any){
 const activeStudents=(p.students||[]).filter((s:any)=>s.status!=='inactive');
 if(p.active==='Template Laporan')return <TemplateReportPage {...p}/>;
 if(p.active==='Laporan')return <ProfessionalReportsPage {...p}/>;
 if(p.active==='Rekap Disiplin')return <DisciplineRecapPage {...p}/>;
 if(p.active==='Pengaturan')return <StyledSettingsPage {...p}/>;
 if(p.active==='Catat Kejadian')return <PolishedIncidentPage {...p} students={activeStudents}/>;
 if(p.active==='Data Siswa')return <StudentsPageV2 {...p}/>;
 if(['Dashboard','Pembinaan','Analitik'].includes(p.active))return <LegacyPageRouter {...p} students={activeStudents}/>;
 return <LegacyPageRouter {...p}/>;
}
