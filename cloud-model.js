import {publicItem} from './release-model.js?v=6';
import {schoolDate,visibleAnnouncement,sortedAnnouncements} from './final-model.js?v=6';
import {isPublished} from './workflow-model.js?v=6';
import {safeAttachment} from './school-model.js?v=6';
// Only explicit public fields may leave the teacher collection.
export const CLASS_IDS = ['1A','1B','2A','2B','2C','3A','3B','4A','4B','5A','5B','6A','6B'];
export function splitPrivate(state) {
  return Object.fromEntries(CLASS_IDS.map(classId => {
    const students = state.students.filter(s => s.classId === classId);
    const ids = new Set(students.map(s => s.id));
    const own = obj => Object.fromEntries(Object.entries(obj).filter(([key]) => ids.has(key.split('|')[0])));
    const chunk = {
      learningPlans:(state.learningPlans||[]).filter(t=>t.classId===classId),vocabulary:(state.vocabulary||[]).filter(t=>t.classId===classId),
      targetEntries:Object.fromEntries(Object.entries(state.targets||{}).filter(([key])=>key.startsWith(classId+'|'))),archived:!!state.archivedClasses?.includes(classId),
      trash:(state.trash||[]).filter(t=>t.classId===classId),remedials:(state.remedials||[]).filter(r=>ids.has(r.studentId)),
      assessmentStatuses:own(state.assessmentStatuses||{}),teacherNotes:(state.teacherNotes||[]).filter(r=>ids.has(r.studentId)),audit:(state.audit||[]).filter(r=>r.classId===classId),
      students, tests: state.tests.filter(t => t.classId === classId),
      scores: own(state.scores), main: own(state.main), assignmentStatuses: own(state.assignmentStatuses),
      curriculum: Object.fromEntries(Object.entries(state.curriculum).filter(([key]) => key.startsWith(classId+'|'))),
      events: state.events.filter(t => t.classId === classId),
      announcements: state.announcements.filter(t => t.classId === classId),
      assignments: state.assignments.filter(t => t.classId === classId)
    };
    const json = JSON.stringify(chunk);
    if (new TextEncoder().encode(json).length > 800000) throw new Error('Class '+classId+' is too large. Export a backup before continuing.');
    return [classId, json];
  }));
}
export function mergePrivate(chunks, blank) {
  const result = blank(); result.portalVersion=1; result.assignmentVersion=1;
  result.tests=[];result.learningPlans=[];result.vocabulary=[];result.trash=[];result.remedials=[];result.assessmentStatuses={};result.teacherNotes=[];result.audit=[];
  for (const [classId,json] of Object.entries(chunks)) {
    const chunk=JSON.parse(json);result.learningPlans.push(...(chunk.learningPlans||[]));result.vocabulary.push(...(chunk.vocabulary||[]));Object.assign(result.assessmentStatuses,chunk.assessmentStatuses||{});result.teacherNotes.push(...(chunk.teacherNotes||[]));result.audit.push(...(chunk.audit||[]));result.trash.push(...(chunk.trash||[]));result.remedials.push(...(chunk.remedials||[]));
    result.targets??={};Object.assign(result.targets,chunk.targetEntries||{});result.archivedClasses??=[];if(chunk.archived)result.archivedClasses.push(classId);
    for (const field of ['students','tests','events','announcements','assignments']) result[field].push(...chunk[field]);
    for (const field of ['scores','main','curriculum','assignmentStatuses']) Object.assign(result[field],chunk[field]);
  }
  return result;
}
export function publicPage(state,classId,semester,schoolYear,defaultSemester=1,today=schoolDate()) {
 const select=list=>(state.archivedClasses?.includes(classId)?[]:(list||[])).filter(x=>x.classId===classId&&x.semester===semester&&x.status!=='draft'&&x.status!=='scheduled');
 return {classId,semester,defaultSemester,...(schoolYear?{schoolYear}:{}),
 announcements:sortedAnnouncements(select(state.announcements).filter(x=>visibleAnnouncement(x,today))).map(x=>publicItem('announcements',x)),
 assignments:select(state.assignments).map(x=>publicItem('assignments',x)),
 tests:[...select(state.events),...select(state.tests).filter(x=>x.date)].map(x=>publicItem('tests',x)),
 learningPlans:select(state.learningPlans).map(x=>publicItem('learningPlans',x)),
 vocabulary:select(state.vocabulary).map(x=>publicItem('vocabulary',x))};
}
