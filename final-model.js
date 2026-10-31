export function schoolDate(date=new Date()){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);const get=type=>parts.find(p=>p.type===type).value;return get('year')+'-'+get('month')+'-'+get('day');}
// Private grade, follow-up and calendar logic. No browser or network dependency.
export const finiteScore=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;
export const mean=values=>{const n=values.filter(finiteScore);return n.length?n.reduce((a,b)=>a+b,0)/n.length:null;};
export function latestAttempt(state,sid,semester,kind,testId=''){
 return (state.remedials||[]).filter(r=>r.studentId===sid&&r.semester===semester&&r.kind===kind&&(kind!=='daily'||r.testId===testId)).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt))[0]||null;
}
export function gradeDetails(state,sid,semester,kind,testId=''){
 const student=state.students.find(s=>s.id===sid),test=kind==='daily'?state.tests.find(t=>t.id===testId):null;
 const key=kind==='daily'?sid+'|'+testId:sid+'|'+semester+'|'+kind;
 const original=(kind==='daily'?state.scores:state.main)[key],classId=kind==='daily'?test?.classId:student?.classId,target=state.targets?.[classId+'|'+semester];
 const attempt=latestAttempt(state,sid,semester,kind,testId),hasKKM=finiteScore(target);
 const passed=finiteScore(original)&&hasKKM&&original<target&&!!attempt&&attempt.score>=target;
 const final=finiteScore(original)?passed?target:original:null;
 const stored=state.assessmentStatuses?.[key];
 const status=final===null?(stored==='absent'?'absent':'not_assessed'):(hasKKM&&final<target||stored==='needs_remedial'&&!passed?'needs_remedial':'assessed');
 return {key,original:finiteScore(original)?original:null,final,target:hasKKM?target:null,attempt,passed,status};
}
export function finalDaily(state,sid,tid){const test=state.tests.find(t=>t.id===tid);return gradeDetails(state,sid,test?.semester||1,'daily',tid).final;}
export const finalMain=(state,sid,semester,kind)=>gradeDetails(state,sid,semester,kind).final;
export function finalLM(state,sid,classId,semester,lm){return mean(state.tests.filter(t=>t.classId===classId&&t.semester===semester&&t.lm===lm).map(t=>finalDaily(state,sid,t.id)));}
export function appendAudit(state,record,newId,now=new Date().toISOString()){
 if(JSON.stringify(record.before??null)===JSON.stringify(record.after??null))return;
 state.audit??=[];state.audit.push({id:newId(),at:now,actor:'Miss Bell',...structuredClone(record)});
}
export function changeScore(state,key,value,kind,newId){
 if(value!==null&&!finiteScore(value))throw new Error('Scores must be between 0 and 100.');
 const p=key.split('|'),student=state.students.find(s=>s.id===p[0]),test=kind==='daily'?state.tests.find(t=>t.id===p[1]):null;
 if(!student||kind==='daily'&&!test)throw new Error('Student or test not found.');
 const semester=kind==='daily'?test.semester:Number(p[1]);if(![1,2].includes(semester)||kind!=='daily'&&!['mid','end'].includes(p[2]))throw new Error('Invalid assessment.');
 const field=kind==='daily'?'scores':'main',before=state[field][key]??null;
 appendAudit(state,{classId:kind==='daily'?test.classId:student.classId,semester,studentId:student.id,assessment:kind==='daily'?`LM ${test.lm} K${test.competency}: ${test.name}`:p[2]==='mid'?'Midterm':'End-of-semester',action:'Score',before,after:value},newId);
 if(value===null)delete state[field][key];else state[field][key]=value;
 state.assessmentStatuses??={};if(value!==null)delete state.assessmentStatuses[key];
}
export function planScorePaste(text,roster,mode='named'){
 const rows=[],errors=[],seen=new Set();let lines=String(text).replace(/\r/g,'').split('\n');while(lines.length&&lines.at(-1)==='')lines.pop();
 if(lines.length>5000)throw new Error('Paste up to 5,000 rows.');
 if(mode==='ordered'&&lines.length>roster.length)throw new Error('More score rows than students. Use Name + Score mode or check the selected class.');
 lines.forEach((line,i)=>{
  const cells=line.split('\t'),name=mode==='named'?(cells[0]||'').trim():roster[i]?.name,raw=(mode==='named'?cells[1]:cells[0])?.trim();
  if(mode==='named'&&i===0&&/^(name|student|student name)$/i.test(name)&&/^score$/i.test(raw||''))return;
  if(!line.trim()||raw===''){rows.push({line:i+1,skip:true,name:name||'(blank)'});return;}
  if(mode==='named'&&cells.length!==2||mode==='ordered'&&cells.length!==1){errors.push({line:i+1,message:'Use exactly '+(mode==='named'?'two tab-separated columns: Name and Score.':'one score per row.')});return;}
  const matches=mode==='ordered'?[roster[i]]:roster.filter(s=>s.name.trim().toLowerCase()===name.toLowerCase());
  if(matches.length!==1||!matches[0]){errors.push({line:i+1,message:'Student name not found or ambiguous: '+name});return;}
  const student=matches[0];if(seen.has(student.id)){errors.push({line:i+1,message:'Duplicate student: '+name});return;}
  if(!/^\d+(?:\.\d+)?$/.test(raw||'')||!finiteScore(Number(raw))){errors.push({line:i+1,message:'Invalid score for '+name+'. Use 0–100 and a decimal point.'});return;}
  seen.add(student.id);rows.push({line:i+1,studentId:student.id,name:student.name,score:Number(raw)});
 });return {rows,errors};
}
export const visibleAnnouncement=(a,today)=>a.status!=='draft'&&(a.status!=='scheduled'||Date.parse(a.publishAt)<=Date.now())&&(!a.expires||a.expires>=today);
export function sortedAnnouncements(items){return items.slice().sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)||String(b.date).localeCompare(String(a.date)));}
export function calendarItems(state,semester,scope='all'){
 const include=x=>x.semester===semester&&(scope==='all'||x.classId===scope)&&!state.archivedClasses?.includes(x.classId);
 return [...state.events.filter(include).map(t=>({...t,kind:'test'})),...state.tests.filter(t=>include(t)&&t.date).map(t=>({...t,title:t.name,kind:'test'})),...state.assignments.filter(include).map(a=>({...a,date:a.due,kind:'assignment'}))].sort((a,b)=>a.date.localeCompare(b.date)||a.classId.localeCompare(b.classId));
}
export function missingWork(state,classId,semester,today){
 return state.assignments.filter(a=>a.classId===classId&&a.semester===semester&&a.status!=='draft'&&(a.status!=='scheduled'||Date.parse(a.publishAt)<=Date.now())).flatMap(a=>state.students.filter(s=>s.classId===classId).filter(s=>!['submitted','late'].includes(state.assignmentStatuses[s.id+'|'+a.id])).map(student=>({student,assignment:a,status:a.due<today?'missing':'not_submitted'})));
}
export function validateExtras(src,out,fail){
 const id=v=>typeof v==='string'&&v.length>0&&v.length<=120&&!/[|\s<>"']/u.test(v);
 const classes=['1A','1B','2A','2B','2C','3A','3B','4A','4B','5A','5B','6A','6B'];
 const text=(v,max)=>typeof v==='string'&&v.length<=max;
 const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
 const studentIds=new Set(out.students.map(s=>s.id));
 out.assessmentStatuses={};
 if(src.assessmentStatuses!==undefined){
  if(!plain(src.assessmentStatuses))fail('invalid assessment statuses.');
  for(const [key,status] of Object.entries(src.assessmentStatuses)){
   const p=key.split('|');if(!studentIds.has(p[0])||!['not_assessed','absent','needs_remedial','assessed'].includes(status)||!(p.length===2&&out.tests.some(t=>t.id===p[1])||p.length===3&&['1','2'].includes(p[1])&&['mid','end'].includes(p[2])))fail('invalid assessment status.');
   out.assessmentStatuses[key]=status;
  }
 }
 out.teacherNotes=[];out.audit=[];
 for(const field of ['teacherNotes','audit'])if(src[field]!==undefined){
  if(!Array.isArray(src[field])||src[field].length>100000)fail('invalid '+field+'.');
  for(const item of src[field]){
   if(!plain(item)||!id(item.id)||!classes.includes(item.classId)||![1,2].includes(item.semester))fail('invalid '+field+' record.');
   if(field==='teacherNotes'){
    if(!studentIds.has(item.studentId)||!text(item.text,1000)||!text(item.createdAt,40)||typeof item.done!=='boolean'||!text(item.followUp,10)||(item.followUp&&!/^\d{4}-\d{2}-\d{2}$/.test(item.followUp)))fail('invalid teacher note.');
   }else if(!text(item.at,40)||!text(item.actor,80)||!text(item.studentId,120)||!text(item.assessment,200)||!text(item.action,80)||!('before'in item)||!('after'in item))fail('invalid audit record.');
  }
  if(new Set(src[field].map(x=>x.id)).size!==src[field].length)fail('duplicate '+field+' IDs.');
  out[field]=structuredClone(src[field]);
 }
 for(const a of out.announcements)if(a.pinned!==undefined&&typeof a.pinned!=='boolean'||a.expires!==undefined&&(!text(a.expires,10)||a.expires&&!/^\d{4}-\d{2}-\d{2}$/.test(a.expires)))fail('invalid announcement pin or expiry.');
}
