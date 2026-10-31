import {validateExtras,gradeDetails} from './final-model.js?v=6';
// Private teacher workflows. None of these records are projected to classPages.
export const CLASS_IDS=['1A','1B','2A','2B','2C','3A','3B','4A','4B','5A','5B','6A','6B'];
export const isPublished=item=>item.status!=='draft'&&(item.status!=='scheduled'||(Number.isFinite(Date.parse(item.publishAt))&&Date.parse(item.publishAt)<=Date.now())); // Existing posts remain published.
const clone=value=>structuredClone(value);
export function binItem(state,kind,id,newId,now=new Date().toISOString()){
 state.trash??=[];state.remedials??=[];state.teacherNotes??=[];state.assessmentStatuses??={};
 const collection={announcement:'announcements',assignment:'assignments',event:'events',student:'students',dailySchedule:'tests'}[kind];
 if(!collection)throw new Error('Unknown item type.');
 const item=state[collection].find(x=>x.id===id);if(!item)throw new Error('Item no longer exists.');
 const entry={id:newId(),kind,classId:item.classId,semester:item.semester||0,deletedAt:now,item:clone(item),records:{}};
 if(kind==='student'){
  for(const field of ['scores','main','assignmentStatuses','assessmentStatuses']){
   entry.records[field]=Object.fromEntries(Object.entries(state[field]).filter(([k])=>k.startsWith(id+'|')));
   for(const key of Object.keys(entry.records[field]))delete state[field][key];
  }
  entry.records.teacherNotes=state.teacherNotes.filter(r=>r.studentId===id);state.teacherNotes=state.teacherNotes.filter(r=>r.studentId!==id);
  entry.records.remedials=state.remedials.filter(r=>r.studentId===id);state.remedials=state.remedials.filter(r=>r.studentId!==id);
 }else if(kind==='assignment'){
  entry.records.assignmentStatuses=Object.fromEntries(Object.entries(state.assignmentStatuses).filter(([k])=>k.endsWith('|'+id)));
  for(const key of Object.keys(entry.records.assignmentStatuses))delete state.assignmentStatuses[key];
 }
 if(kind==='dailySchedule'){item.date='';item.status='draft';}else state[collection]=state[collection].filter(x=>x.id!==id);
 state.trash.push(entry);return entry;
}
export function restoreBin(state,id){
 const entry=state.trash?.find(x=>x.id===id);if(!entry)throw new Error('Trash item not found.');
 if(state.archivedClasses?.includes(entry.classId))throw new Error('Restore this class from the archive first.');
 const collection={announcement:'announcements',assignment:'assignments',event:'events',student:'students',dailySchedule:'tests'}[entry.kind];
 if(!collection)throw new Error('Unknown trash item.');
 if(entry.kind==='dailySchedule'){
  const test=state.tests.find(t=>t.id===entry.item.id);if(!test)throw new Error('The original daily test no longer exists.');
  if(test.date)throw new Error('This test already has a schedule. Remove it first before restoring the old schedule.');
  test.date=entry.item.date;test.status=entry.item.status||'published';
 }else{
  if(state[collection].some(x=>x.id===entry.item.id))throw new Error('This item already exists.');
  const item=clone(entry.item);state[collection].push(item);
  for(const field of ['scores','main','assignmentStatuses','assessmentStatuses']){
   // Restore only references which still exist, and never overwrite a newer record.
   for(const [key,value] of Object.entries(entry.records[field]||{})){
    const parts=key.split('|'),student=state.students.some(s=>s.id===parts[0]);
    const present=field==='assessmentStatuses'?(parts.length===3||state.tests.some(t=>t.id===parts[1])):field==='scores'?state.tests.some(t=>t.id===parts[1]):field==='assignmentStatuses'?state.assignments.some(a=>a.id===parts[1]):true;
    state[field]??={};if(student&&present&&!Object.hasOwn(state[field],key))state[field][key]=value;
   }
  }
  state.teacherNotes??=[];for(const note of entry.records.teacherNotes||[])if(state.students.some(s=>s.id===note.studentId)&&!state.teacherNotes.some(n=>n.id===note.id))state.teacherNotes.push(clone(note));
  state.remedials??=[];for(const r of entry.records.remedials||[])if(state.students.some(s=>s.id===r.studentId)&&!state.remedials.some(x=>x.id===r.id))state.remedials.push(clone(r));
 }
 state.trash=state.trash.filter(x=>x.id!==id);return entry;
}
export function latestRemedial(state,studentId,semester,kind,testId=''){
 return (state.remedials||[]).filter(r=>r.studentId===studentId&&r.semester===semester&&r.kind===kind&&(kind!=='daily'||r.testId===testId)).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt))[0]||null;
}
export function supportRows(state,classId,semester,today){
 const target=state.targets?.[classId+'|'+semester];
 const validTarget=typeof target==='number'&&Number.isFinite(target);
 const tests=state.tests.filter(t=>t.classId===classId&&t.semester===semester);
 const assignments=state.assignments.filter(a=>a.classId===classId&&a.semester===semester&&isPublished(a));
 return state.students.filter(s=>s.classId===classId).map(student=>{
  const low=[];
  for(const t of tests){const value=state.scores[student.id+'|'+t.id];if(gradeDetails(state,student.id,semester,'daily',t.id).status==='needs_remedial')low.push({label:`LM ${t.lm} · K${t.competency} · ${t.name}`,score:value,remedial:latestRemedial(state,student.id,semester,'daily',t.id)});}
  for(const kind of ['mid','end']){const value=state.main[student.id+'|'+semester+'|'+kind];if(gradeDetails(state,student.id,semester,kind).status==='needs_remedial')low.push({label:kind==='mid'?'Midterm':'End-of-semester',score:value,remedial:latestRemedial(state,student.id,semester,kind)});}
  const missing=assignments.filter(a=>a.due<today&&['not_submitted','missing'].includes(state.assignmentStatuses[student.id+'|'+a.id]||'not_submitted'));
  return {student,low,missing};
 }).filter(r=>r.low.length||r.missing.length);
}
export function planRoster(rows,state,defaultClass){
 const known=new Set(state.students.map(s=>s.classId+'|'+s.name.trim().toLocaleLowerCase().replace(/\s+/g,' ')));
 const add=[],issues=[];
 rows.forEach((row,i)=>{
  const name=String(row.name??'').trim().replace(/\s+/g,' '),classId=(String(row.classId??'').trim()||defaultClass).toUpperCase().replace(/\s+/g,'');
  const line=row.line||i+2;
  if(!name||name.length>80||/[\u0000-\u001f]/.test(name)){issues.push({line,message:'Missing or invalid name (maximum 80 characters).'});return;}
  if(!CLASS_IDS.includes(classId)||state.archivedClasses?.includes(classId)){issues.push({line,message:'Invalid or archived class: '+classId});return;}
  const key=classId+'|'+name.toLocaleLowerCase();
  if(known.has(key)){issues.push({line,message:'Duplicate name in class '+classId+': '+name});return;}
  known.add(key);add.push({name,classId});
 });return {add,issues};
}
// Validate before displaying or applying any imported backup. Missing optional fields
// are normalized for backups produced by previous Miss Bell versions.
export function validateBackup(payload,emptyData){
 const fail=message=>{throw new Error('Invalid backup: '+message);};
 let nodes=0;function safeTree(v,depth=0){if(++nodes>500000||depth>20)fail('file is too complex.');if(v&&typeof v==='object')for(const [key,value] of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(key))fail('unsafe field.');safeTree(value,depth+1);}else if(typeof v==='number'&&!Number.isFinite(v))fail('invalid number.');}
 safeTree(payload);
 if(!payload||payload.subject!=='English'||!payload.data||payload.data.version!==1)fail('this is not a Miss Bell English backup.');
 if(payload.backupVersion!==undefined&&![4,5,6].includes(payload.backupVersion))fail('unsupported backup version.');
 const src=payload.data,out=emptyData();out.tests=[];
 const text=(v,max,required=false)=>typeof v==='string'&&v.length<=max&&(!required||v.trim().length>0);
 const id=v=>text(v,120,true)&&!/[|\s<>"']/u.test(v);
 const sem=v=>v===1||v===2;
 const date=v=>text(v,10)&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
 const grade=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;
 const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const doc=v=>v==null||(obj(v)&&text(v.label||'',100)&&text(v.url,2000)&&(()=>{try{const u=new URL(v.url);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}})());
 function validItem(kind,x){
  if(!obj(x)||!id(x.id)||!CLASS_IDS.includes(x.classId))return false;
  if(kind==='students')return text(x.name,80,true);
  if(!sem(x.semester)||!doc(x.document)||x.status!==undefined&&!['draft','published','scheduled'].includes(x.status)||x.status==='scheduled'&&(!text(x.publishAt,40,true)||!Number.isFinite(Date.parse(x.publishAt))))return false;
  if(kind==='announcements')return text(x.text,1000,true)&&text(x.date,40,true)&&Number.isFinite(Date.parse(x.date));
  if(kind==='assignments')return text(x.title,100,true)&&text(x.instructions,1000,true)&&date(x.due)&&[1,2,3,4].includes(x.lm);
  if(kind==='tests')return text(x.name,80,true)&&[1,2,3,4].includes(x.lm)&&[1,2].includes(x.competency)&&(x.date===''||date(x.date))&&text(x.topic||'',200)&&text(x.notes||'',500);
  return text(x.title,80,true)&&date(x.date)&&['daily','mid','end'].includes(x.type)&&[0,1,2,3,4].includes(x.lm)&&text(x.topic||'',200)&&text(x.notes||'',500);
 }
 for(const field of ['students','tests','events','announcements','assignments']){
  if(!Array.isArray(src[field])||src[field].length>10000)fail('missing or oversized '+field+'.');
  const ids=new Set();for(const item of src[field]){if(!validItem(field,item)||ids.has(item.id))fail('invalid or duplicate '+field+' record.');ids.add(item.id);}
  out[field]=clone(src[field]);
 }
 for(const field of ['learningPlans','vocabulary']){
 const list=src[field]||[];if(!Array.isArray(list)||list.length>10000)fail('invalid '+field+'.');
 const ids=new Set();for(const x of list){if(!obj(x)||!id(x.id)||ids.has(x.id)||!CLASS_IDS.includes(x.classId)||!sem(x.semester)||!date(x.weekStart)||!['draft','published','scheduled'].includes(x.status)||x.status==='scheduled'&&!Number.isFinite(Date.parse(x.publishAt)))fail('invalid '+field+' record.');ids.add(x.id);
 if(field==='learningPlans'&&(!text(x.topic,1000,true)||!text(x.practice,1000)))fail('invalid weekly plan.');
 if(field==='vocabulary'&&(!Array.isArray(x.words)||!x.words.length||x.words.length>20||!x.words.every(w=>Array.isArray(w)&&w.length===3&&w.every(v=>text(v,200,true)))))fail('invalid vocabulary.');
 }out[field]=clone(list);
 }
 const studentIds=new Set(out.students.map(s=>s.id)),testIds=new Set(out.tests.map(t=>t.id)),assignmentIds=new Set(out.assignments.map(a=>a.id));
 for(const field of ['scores','main','curriculum','assignmentStatuses'])if(!obj(src[field]))fail('missing '+field+'.');
 function validMap(field,map,checkRefs=true){
  if(!obj(map))return false;
  return Object.entries(map).every(([key,v])=>{const p=key.split('|');if(!id(p[0])||checkRefs&&!studentIds.has(p[0]))return false;
   if(field==='scores')return p.length===2&&id(p[1])&&grade(v)&&(!checkRefs||testIds.has(p[1]));
   if(field==='main')return p.length===3&&['1','2'].includes(p[1])&&['mid','end'].includes(p[2])&&grade(v);
   return p.length===2&&id(p[1])&&['not_submitted','submitted','late','missing'].includes(v)&&(!checkRefs||assignmentIds.has(p[1]));
  });
 }
 for(const field of ['scores','main','assignmentStatuses']){if(!validMap(field,src[field]))fail('invalid '+field+' entries.');out[field]=clone(src[field]);}
 for(const [key,items] of Object.entries(src.curriculum)){const p=key.split('|');if(p.length!==2||!CLASS_IDS.includes(p[0])||!['1','2'].includes(p[1])||!Array.isArray(items)||items.length!==4||!items.every(x=>obj(x)&&text(x.name,60,true)&&Array.isArray(x.competencies)&&x.competencies.length===2&&x.competencies.every(c=>text(c,80,true))))fail('invalid LM labels.');}
 out.curriculum=clone(src.curriculum);
 if(src.targets!==undefined){if(!obj(src.targets)||!Object.entries(src.targets).every(([key,v])=>CLASS_IDS.some(c=>key===c+'|1'||key===c+'|2')&&grade(v)))fail('invalid targets.');out.targets=clone(src.targets);}
 if(src.archivedClasses!==undefined){if(!Array.isArray(src.archivedClasses)||!src.archivedClasses.every(c=>CLASS_IDS.includes(c)))fail('invalid class archives.');out.archivedClasses=[...new Set(src.archivedClasses)];}
 function validRemedial(r){return obj(r)&&id(r.id)&&id(r.studentId)&&CLASS_IDS.includes(r.classId)&&sem(r.semester)&&['daily','mid','end'].includes(r.kind)&&(r.kind!=='daily'||id(r.testId))&&grade(r.score)&&date(r.date)&&text(r.note||'',500)&&text(r.createdAt,40,true);}
 if(src.remedials!==undefined){if(!Array.isArray(src.remedials)||!src.remedials.every(r=>validRemedial(r)&&studentIds.has(r.studentId)&&(r.kind!=='daily'||testIds.has(r.testId)))||new Set(src.remedials.map(r=>r.id)).size!==src.remedials.length)fail('invalid remedial records.');out.remedials=clone(src.remedials);}
 if(src.trash!==undefined){
  if(!Array.isArray(src.trash)||src.trash.length>10000)fail('invalid trash.');
  for(const entry of src.trash){const kind={student:'students',announcement:'announcements',assignment:'assignments',event:'events',dailySchedule:'tests'}[entry.kind];
   if(!kind||!id(entry.id)||!validItem(kind,entry.item)||entry.classId!==entry.item.classId||entry.semester!==(entry.item.semester||0)||!text(entry.deletedAt,40,true)||!Number.isFinite(Date.parse(entry.deletedAt))||!obj(entry.records))fail('invalid trash item.');
   for(const field of ['scores','main','assignmentStatuses'])if(entry.records[field]!==undefined&&!validMap(field,entry.records[field],false))fail('invalid deleted scores.');
   if(entry.records.remedials!==undefined&&(!Array.isArray(entry.records.remedials)||!entry.records.remedials.every(validRemedial)))fail('invalid deleted remedials.');
   if(entry.records.assessmentStatuses!==undefined||entry.records.teacherNotes!==undefined){const temp={...out,students:entry.kind==='student'?[...out.students,entry.item]:out.students};validateExtras({assessmentStatuses:entry.records.assessmentStatuses||{},teacherNotes:entry.records.teacherNotes||[]},temp,fail);}
  }
  if(new Set(src.trash.map(r=>r.id)).size!==src.trash.length)fail('duplicate trash IDs.');out.trash=clone(src.trash);
 }
 validateExtras(src,out,fail);out.portalVersion=1;out.assignmentVersion=1;
 const year=payload.schoolYear||'';if(year&&!/^\d{4}-\d{4}$/.test(year))fail('invalid school year.');
 return {data:out,year,exportedAt:payload.exportedAt||'',label:payload.yearLabel||year};
}
