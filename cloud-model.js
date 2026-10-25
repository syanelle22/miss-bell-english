// Only explicit public fields may leave the teacher collection.
export const CLASS_IDS = ['1A','1B','2A','2B','2C','3A','3B','4A','4B','5A','5B','6A','6B'];
export function splitPrivate(state) {
  return Object.fromEntries(CLASS_IDS.map(classId => {
    const students = state.students.filter(s => s.classId === classId);
    const ids = new Set(students.map(s => s.id));
    const own = obj => Object.fromEntries(Object.entries(obj).filter(([key]) => ids.has(key.split('|')[0])));
    const chunk = {
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
  result.tests=[];
  for (const json of Object.values(chunks)) {
    const chunk=JSON.parse(json);
    for (const field of ['students','tests','events','announcements','assignments']) result[field].push(...chunk[field]);
    for (const field of ['scores','main','curriculum','assignmentStatuses']) Object.assign(result[field],chunk[field]);
  }
  return result;
}
export function publicPage(state,classId,semester) {
  const select = list => list.filter(a => a.classId===classId && a.semester===semester);
  const planned = select(state.events).map(t=>({id:t.id,title:t.title,date:t.date,type:t.type,lm:t.lm,topic:t.topic,notes:t.notes}));
  const daily = select(state.tests).filter(t=>t.date).map(t=>({id:t.id,title:t.name,date:t.date,type:'daily',lm:t.lm,topic:`LM ${t.lm} · Competency ${t.competency}`,notes:''}));
  return { classId, semester,
    announcements: select(state.announcements).map(a=>({id:a.id,text:a.text,date:a.date})),
    assignments: select(state.assignments).map(a=>({id:a.id,title:a.title,due:a.due,lm:a.lm,instructions:a.instructions})),
    tests: [...planned,...daily]
  };
}
