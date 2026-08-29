'use client';
import {PageRouter as LegacyPageRouter} from './modules';
import {ProfessionalReportsPage,TemplateReportPage} from './report-template';
import StyledSettingsPage from './settings-page';
import PolishedIncidentPage from './incident-page';

export function PageRouter(p:any){
 if(p.active==='Template Laporan')return <TemplateReportPage {...p}/>;
 if(p.active==='Laporan')return <ProfessionalReportsPage {...p}/>;
 if(p.active==='Pengaturan')return <StyledSettingsPage {...p}/>;
 if(p.active==='Catat Kejadian')return <PolishedIncidentPage {...p}/>;
 return <LegacyPageRouter {...p}/>;
}
