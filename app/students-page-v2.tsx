'use client';
import OfficialStudentsPage from './official-students';
import {StudentArchiveTools} from './student-archive-tools';

export default function StudentsPageV2(props:any){
 const activeStudents=(props.students||[]).filter((s:any)=>s.status!=='inactive');
 return <div>
  <StudentArchiveTools school={props.school} students={props.students||[]} reload={props.reload}/>
  <OfficialStudentsPage school={props.school} students={activeStudents} reload={props.reload}/>
 </div>;
}