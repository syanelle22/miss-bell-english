import * as cloud from './firebase.js?v=2';
import {mergePrivate} from './cloud-model.js?v=2';
import {targetFor,belowTarget,safeAttachment,copyToClasses,yearLabel,validYear} from './school-model.js?v=2';
import {exportWorkbook} from './excel-export.js?v=2';
document.body.dataset.appReady='true';
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>typeof crypto.randomUUID==='function'?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
function average(values){const a=values.filter(v=>typeof v==='number'&&Number.isFinite(v));return a.length?a.reduce((sum,v)=>sum+v,0)/a.length:null;}
const fmt=v=>v===null?'—':Number.isInteger(v)?String(v):v.toFixed(1);
const icons={home:'<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',book:'<path d="M12 5c-4-3-9-2-9-2v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Z"/><path d="M12 5v16"/>',daily:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v4H9Z"/><path d="m8 13 2 2 5-5M8 18h8"/>',tests:'<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2v4m8-4v4M4 10h16m-11 5 2 2 4-4"/>',report:'<path d="M4 20h16M7 16V9m5 7V4m5 12v-5"/>',students:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5v2"/>',class:'<path d="M3 9 12 4l9 5-9 5Zm3 2v7c4 3 8 3 12 0v-7m3-2v8"/>',plus:'<path d="M12 5v14M5 12h14"/>',download:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>'};
const icon=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[k]||icons.book}</svg>`;
const classes=Array.from({length:6},(_,i)=>Array.from({length:i===1?3:2},(_,j)=>(i+1)+String.fromCharCode(65+j))).flat();
const topics=['Greetings & introductions','Colours & numbers','People & places','Everyday activities'];
function defaultTests(c,s){return Array.from({length:8},(_,i)=>({id:`${c}-${s}-${i}`,classId:c,semester:s,lm:Math.floor(i/2)+1,competency:i%2+1,name:`Daily test ${i%2+1}`,date:''}));}
function emptyData(){return {version:1,sample:false,students:[],tests:classes.flatMap(c=>[1,2].flatMap(s=>defaultTests(c,s))),scores:{},main:{},curriculum:{},events:[],announcements:[],assignments:[],assignmentStatuses:{},targets:{},archivedClasses:[]};}
let data=emptyData();
let school={year:"",years:[],activeYear:""};
let teacherReady=false,authUser=null,dirty=false,saving=false,saveTimer,saveBlocked=false,editVersion=0,publicUnsubscribe=null,publicKey='',authGeneration=0,publicState='loading';
const initialParams=new URLSearchParams(window.location.search);let classId=classes.includes(initialParams.get('class'))?initialParams.get('class'):'1A',semester=initialParams.get('semester')==='2'?2:1,view='family',lm=1,query='';
const students=()=>data.students.filter(s=>s.classId===classId),tests=()=>data.tests.filter(t=>t.classId===classId&&t.semester===semester),score=(sid,tid)=>data.scores[sid+'|'+tid],mainScore=(sid,type)=>data.main[sid+'|'+semester+'|'+type];
const lmAverage=(sid,n)=>average(tests().filter(t=>t.lm===n).map(t=>score(sid,t.id)));
const classLM=n=>average(students().map(s=>lmAverage(s.id,n)));
const classMain=type=>average(students().map(s=>mainScore(s.id,type)));
const curr=()=>data.curriculum[classId+'|'+semester]||topics.map((name,i)=>({name,competencies:['Competency 1','Competency 2']}));
function save(){if(!teacherReady)return;dirty=true;editVersion++;setCloudStatus('Unsaved changes');clearTimeout(saveTimer);saveTimer=setTimeout(flushSave,700);}
function toast(t){$('#toast').textContent=t;$('#toast').classList.remove('hidden');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('#toast').classList.add('hidden'),3500);}
function hydrate(){ $$('[data-icon]').forEach(e=>e.innerHTML=icon(e.dataset.icon)); }
function studentCell(s){return `<div class="student-name"><span class="avatar">${escapeHtml(s.name.split(' ').map(n=>n[0]).slice(0,2).join(''))}</span><div><b>${escapeHtml(s.name)}</b><small>Class ${s.classId}</small></div></div>`;}
const meta=()=>`${school.years.find(y=>y.id===school.year)?.label||data.schoolYear||''} · ${classId} · Semester ${semester}`;
const recordedDaily=()=>students().reduce((a,s)=>a+tests().filter(t=>typeof score(s.id,t.id)==='number').length,0);
function stats(){let total=students().length*tests().length,recorded=recordedDaily();$('#stats').innerHTML=[['Students',students().length,'In class '+classId,'students'],['Daily scores',recorded,total?`of ${total} score entries`:'Add a student to begin','daily'],['Midterm average',fmt(classMain('mid')),'Class average · out of 100','tests'],['Semester test average',fmt(classMain('end')),'Class average · out of 100','report']].map(([l,v,n,i],j)=>`<article class="stat ${j===2?'featured':''}"><div class="stat-top"><span>${l}</span>${icon(i)}</div><strong class="number">${v}</strong><small>${n}</small></article>`).join('');$('#classCount').textContent=students().length+' students';}
function render(){ if(!teacherReady)view='family'; portalLayout(); $('#journalHero').classList.toggle('hidden',!['home','family'].includes(view)); $('#classSelect').value=classId;$$('[data-sem]').forEach(b=>b.classList.toggle('active',+b.dataset.sem===semester));$('#classes').innerHTML=classes.map(c=>`<button class="chip ${c===classId?'active':''}" data-class="${c}" aria-pressed="${c===classId}">${c}</button>`).join('');$('#sampleNotice').classList.toggle('hidden',!data.sample);const pages={assignments:['Assignments','Little tasks. Growing confidence.','Track English assignment submissions for every student in your class.'],family:['Parent page','Learning, together.','English class announcements, assignments, and upcoming tests.'],schedule:['Test schedule','A little preparation goes a long way.','Plan upcoming English tests and share topics with students and parents.'],home:['Overview','Hello, Miss Bell ✦','Small steps in English. A brighter view of every learner.'],daily:['Daily scores','Every little lesson counts.','Record daily tests across four Lingkup Materi and eight competencies.'],tests:['Main tests','The bigger milestones.','Midterm and end-of-semester English tests, together in one place.'],report:['Semester recap','A clear picture of progress.','Four LM averages and two main tests. Every student, side by side.'],students:['Students','Your little English learners.','Manage your students and assign each one to the right classroom.']};$('#crumb').textContent=pages[view][0];$('#pageTitle').textContent=pages[view][1];$('#pageSubtitle').textContent=pages[view][2];$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));if(view!=='family')stats();$('#content').innerHTML=({assignments:assignmentsView,family:familyView,schedule:scheduleView,home:homeView,daily:dailyView,tests:testsView,report:reportView,students:studentsView})[view]();hydrate();enhanceUI();window.dispatchEvent(new Event('bell:render')); if(view==='family'&&!teacherReady)ensurePublic();}
function emptyRow(cols,msg='No students in this class yet. Use Add student to begin.'){return `<tr><td colspan="${cols}"><div class="empty">${msg}</div></td></tr>`;}
function homeView(){const missing=students().length*tests().length-recordedDaily();return `<section class="layout"><article class="panel"><div class="panelhead"><div><h2>Lingkup Materi at a glance</h2><p>${meta()} · Average of each student’s LM average</p></div><span class="tag">4 LM · 8 competencies</span></div><div class="lm-grid">${curr().map((c,i)=>{let v=classLM(i+1);return `<button class="lm-card" data-open-lm="${i+1}" aria-label="Open LM ${i+1} daily scores"><span class="lm-label">LINGKUP MATERI ${i+1}</span><strong class="number">${fmt(v)}</strong><small>${escapeHtml(c.name)}</small><div class="progress"><span style="width:${v??0}%"></span></div></button>`;}).join('')}</div><div class="explainer">${icon('info')}<span>Averages ignore blanks. A recorded zero counts. Open an LM to enter its daily scores.</span></div></article><article class="panel"><div class="panelhead"><div><h2>The main milestones</h2><p>Your English semester assessments</p></div>${icon('tests')}</div>${[['mid','Midterm test'],['end','End-of-semester test']].map(([type,label])=>`<div class="test-row"><div><b>${label}</b><small>${students().filter(s=>typeof mainScore(s.id,type)==='number').length} / ${students().length} students graded</small></div><strong class="number">${fmt(classMain(type))}</strong></div>`).join('')}<div style="padding:17px 22px"><button class="textbtn" data-go="tests">Open main tests →</button></div></article></section><section class="panel table-section"><div class="panelhead"><div><h2>A quick classroom check-in</h2><p>${missing} daily score ${missing===1?'entry':'entries'} still blank · ${meta()}</p></div><button class="btn primary" data-go="daily">${icon('plus')}Enter daily scores</button></div><div class="table-scroll">${recapTable(students().slice(0,5),false)}</div><div class="tablefoot"><span>Showing ${Math.min(students().length,5)} of ${students().length} students</span><button class="textbtn" data-go="report">Full semester recap →</button></div></section>`;}
function recapTable(list,footer=true){return `<table><thead><tr><th>Student</th>${[1,2,3,4].map(n=>`<th>LM ${n} average</th>`).join('')}<th>Midterm</th><th>Semester test</th></tr></thead><tbody>${list.map(s=>`<tr><td>${studentCell(s)}</td>${[1,2,3,4].map(n=>`<td class="number average-cell" data-value="${lmAverage(s.id,n)??''}">${fmt(lmAverage(s.id,n))}</td>`).join('')}<td class="number" data-value="${mainScore(s.id,'mid')??''}">${fmt(mainScore(s.id,'mid')??null)}</td><td class="number" data-value="${mainScore(s.id,'end')??''}">${fmt(mainScore(s.id,'end')??null)}</td></tr>`).join('')||emptyRow(7)}</tbody>${footer&&list.length?`<tfoot><tr><th>Class average</th>${[1,2,3,4].map(n=>`<th class="average-cell">${fmt(classLM(n))}</th>`).join('')}<th>${fmt(classMain('mid'))}</th><th>${fmt(classMain('end'))}</th></tr></tfoot>`:''}</table>`;}
function filteredStudents(){return students().filter(s=>s.name.toLowerCase().includes(query.toLowerCase()));}
function dailyView(){const course=curr()[lm-1],ts=tests().filter(t=>t.lm===lm).sort((a,b)=>a.competency-b.competency);return `<div class="tabs" aria-label="Lingkup Materi">${[1,2,3,4].map(n=>`<button data-lm="${n}" class="${n===lm?'active':''}">LM ${n}</button>`).join('')}</div><section class="panel"><div class="panelhead"><div><h2>LM ${lm} · ${escapeHtml(course.name)}</h2><p>${meta()} · ${ts.length} daily tests · Scores from 0 to 100</p></div><div class="buttons"><button class="textbtn" id="editLM">Edit LM & competencies</button><button class="btn primary" id="addTest">${icon('plus')}Daily test</button></div></div><div style="padding:0 22px 17px;display:flex;gap:9px;flex-wrap:wrap"><span class="tag">K1 · ${escapeHtml(course.competencies[0])}</span><span class="tag">K2 · ${escapeHtml(course.competencies[1])}</span></div><div class="table-scroll"><table><thead><tr><th>Student</th>${ts.map(t=>`<th>${escapeHtml(t.name)}<br><span style="font-size:8px;color:#72778f">K${t.competency}${t.date?' · '+escapeHtml(t.date):''}</span></th>`).join('')}<th>LM ${lm} average</th></tr></thead><tbody>${students().map(s=>`<tr><td>${studentCell(s)}</td>${ts.map(t=>`<td><input class="score" type="number" min="0" max="100" step="0.1" inputmode="decimal" aria-label="${escapeHtml(s.name+' '+t.name+' competency '+t.competency)}" data-score="${s.id}|${t.id}" placeholder="—" value="${score(s.id,t.id)??''}"></td>`).join('')}<td class="average-cell number" data-lm-result="${s.id}">${fmt(lmAverage(s.id,lm))}</td></tr>`).join('')||emptyRow(ts.length+2)}</tbody><tfoot><tr><th>Class average</th>${ts.map(t=>`<th data-test-average="${t.id}">${fmt(average(students().map(s=>score(s.id,t.id))))}</th>`).join('')}<th class="average-cell" id="lmClassAverage">${fmt(classLM(lm))}</th></tr></tfoot></table></div><div class="tablefoot"><span>${students().length} students · 2 competencies in this LM</span><span>Edits save automatically</span></div></section><div class="info" style="margin-top:17px"><b>How this average works:</b> each student’s LM average uses all their recorded daily test scores across Competency 1 and Competency 2 within this LM. The total of the recorded scores is divided by the number of recorded scores. Every daily test has equal weight. The class LM average uses students’ LM averages.</div>`;}
function testsView(){return `<div class="info">Enter one score per student for each main test. The <b>class average</b> is calculated separately for Midterm and End-of-semester. Scores are kept separate for each semester.</div><section class="panel"><div class="panelhead"><div><h2>Main English tests</h2><p>${meta()} · Scores out of 100</p></div><span class="tag">2 main tests</span></div><div class="table-scroll"><table><thead><tr><th>Student</th><th>Midterm test</th><th>End-of-semester test</th><th>Recorded</th></tr></thead><tbody>${students().map(s=>`<tr><td>${studentCell(s)}</td>${['mid','end'].map(type=>`<td><input class="score" type="number" inputmode="decimal" min="0" max="100" step="0.1" aria-label="${escapeHtml(s.name+' '+(type==='mid'?'Midterm':'End-of-semester'))}" data-main="${s.id}|${semester}|${type}" placeholder="—" value="${mainScore(s.id,type)??''}"></td>`).join('')}<td class="muted" data-recorded="${s.id}">${['mid','end'].filter(t=>typeof mainScore(s.id,t)==='number').length} / 2</td></tr>`).join('')||emptyRow(4)}</tbody><tfoot><tr><th>Class average</th><th class="average-cell" id="midAverage">${fmt(classMain('mid'))}</th><th class="average-cell" id="endAverage">${fmt(classMain('end'))}</th><th></th></tr></tfoot></table></div><div class="tablefoot"><span>Blank scores are excluded · Zero is included</span><span>Edits save automatically</span></div></section>`;}
function reportView(){return `<div class="info"><b>Semester ${semester} recap · Class ${classId}.</b> LM columns show each student’s daily test average. Main-test columns show their individual test scores. The bottom row shows the class average for each column.</div><section class="panel"><div class="panelhead"><div><h2>English · Semester ${semester} recap</h2><p>Miss Bell · Class ${classId} · ${students().length} students</p></div><div class="buttons"><button class="btn" id="printReport">Print report</button></div></div><div class="table-scroll">${recapTable(students())}</div><div class="tablefoot"><span>4 Lingkup Materi · 2 competencies each · 2 main tests</span><span>Nilai rata-rata · Equal test weights</span></div></section>`;}
function studentsView(){const list=filteredStudents();return `<div class="section-heading"><div><h2>Class ${classId} students</h2><p style="font-size:10px;margin-top:4px">${students().length} learners · ${data.students.length} across all 13 classes</p></div><input class="search" id="studentSearch" aria-label="Search students" placeholder="Search students…" value="${escapeHtml(query)}"></div><div class="roster" id="roster">${studentCards(list)}</div>`;}
function studentCards(list){return list.map(s=>{let v=average([1,2,3,4].map(n=>lmAverage(s.id,n)));return `<article class="student-card"><span class="avatar">${escapeHtml(s.name.split(' ').map(n=>n[0]).slice(0,2).join(''))}</span><h3>${escapeHtml(s.name)}</h3><p>English · Class ${s.classId}</p><div class="result"><div><strong>${fmt(v)}</strong><br><small>Average of recorded LM averages</small></div></div><div class="card-actions"><button class="textbtn" data-edit-student="${s.id}">Edit / move class</button><button class="textbtn danger" data-remove-student="${s.id}">Remove</button></div></article>`;}).join('')||'<div class="empty">'+(query?'No matching students.':'No students yet. Add your first learner.')+'</div>';}
function modal(title,desc,fields,submit,allowArchive=false){if(!teacherReady||saveBlocked||(!allowArchive&&!canEdit()))return;$('#modal').dataset.allowArchive=String(allowArchive);$('#modalTitle').textContent=title;$('#modalDescription').textContent=desc;$('#modalFields').innerHTML=fields;$('#modalForm').onsubmit=e=>{e.preventDefault();if(!teacherReady||saveBlocked||(!allowArchive&&!canEdit()))return;const result=submit(new FormData(e.target));if(result!==false)$('#modal').close();};$('#modal').showModal();$('#modalFields input')?.focus();}
const classOptions=selected=>classes.map(c=>`<option value="${c}" ${c===selected?'selected':''}>Class ${c}</option>`).join('');
function studentForm(id){let st=data.students.find(s=>s.id===id);modal(st?'Edit student':'Welcome a new learner','Choose the student’s class. The roster is shared across both semesters.',`<label for="studentName">Student name</label><input id="studentName" name="name" maxlength="80" required value="${escapeHtml(st?.name||'')}" placeholder="e.g. Alya Putri"><label for="studentClass">Assign to class</label><select id="studentClass" name="classId">${studentClassOptions(st?.classId||classId)}</select>`,f=>{let name=f.get('name').trim();if(!name){toast('Enter a student name.');return false;}let target=f.get('classId');if(data.archivedClasses?.includes(target)){toast('Restore that class before assigning students to it.');return false;}if(st&&st.classId!==target){if(!confirm('Move this student to class '+target+'? Their previous class scores will stay saved, but won’t appear in the new class daily tests. Main-test scores follow the student.'))return false;}if(st){st.name=name;st.classId=target;}else data.students.push({id:uid(),name,classId:target});classId=target;save();render();toast(st?'Student updated':'Student added to class '+target);});}
function addDailyTest(){modal('Add a daily test',`Class ${classId} · Semester ${semester} · LM ${lm}`,`<label for="testName">Test name</label><input id="testName" name="name" required maxlength="45" placeholder="e.g. Vocabulary quiz"><label for="competency">Competency</label><select id="competency" name="competency"><option value="1">Competency 1 · ${escapeHtml(curr()[lm-1].competencies[0])}</option><option value="2">Competency 2 · ${escapeHtml(curr()[lm-1].competencies[1])}</option></select><label for="testDate">Test date (optional)</label><input type="date" id="testDate" name="date">`,f=>{const name=f.get('name').trim();if(!name){toast('Enter a test name.');return false;}data.tests.push({id:uid(),classId,semester,lm,competency:Number(f.get('competency')),name,date:f.get('date')});save();render();toast('Daily test added');});}
function editLM(){const c=curr()[lm-1];modal('Make this LM your own',`Labels apply to class ${classId}, semester ${semester} only.`, `<label for="lmName">LM ${lm} topic</label><input id="lmName" name="name" required maxlength="60" value="${escapeHtml(c.name)}"><label for="k1">Competency 1</label><input id="k1" name="k1" required maxlength="80" value="${escapeHtml(c.competencies[0])}"><label for="k2">Competency 2</label><input id="k2" name="k2" required maxlength="80" value="${escapeHtml(c.competencies[1])}">`,f=>{let name=f.get('name').trim(),k1=f.get('k1').trim(),k2=f.get('k2').trim();if(!name||!k1||!k2){toast('Fill in all three labels.');return false;}const cs=structuredClone(curr());cs[lm-1]={name,competencies:[k1,k2]};data.curriculum[classId+'|'+semester]=cs;save();render();toast('LM labels updated');});}
function updateLiveResults(){stats();if(view==='daily'){students().forEach(s=>{let el=$(`[data-lm-result="${s.id}"]`);if(el)el.textContent=fmt(lmAverage(s.id,lm));});tests().filter(t=>t.lm===lm).forEach(t=>{let el=$(`[data-test-average="${t.id}"]`);if(el)el.textContent=fmt(average(students().map(s=>score(s.id,t.id))));});$('#lmClassAverage').textContent=fmt(classLM(lm));}if(view==='tests'){['mid','end'].forEach(t=>$('#'+t+'Average').textContent=fmt(classMain(t)));students().forEach(s=>$(`[data-recorded="${s.id}"]`).textContent=['mid','end'].filter(t=>typeof mainScore(s.id,t)==='number').length+' / 2');}}
$('#content').addEventListener('input',e=>{const t=e.target;if(t.id==='studentSearch'){query=t.value;$('#roster').innerHTML=studentCards(filteredStudents());return;}if(!t.matches('[data-score],[data-main]'))return;const value=t.value.trim();if(t.validity.badInput||value!==''&&(!Number.isFinite(Number(value))||Number(value)<0||Number(value)>100)){t.setCustomValidity('Enter a score between 0 and 100.');t.reportValidity();return;}t.setCustomValidity('');const store=t.dataset.score?data.scores:data.main,key=t.dataset.score||t.dataset.main;if(value==='')delete store[key];else store[key]=Number(value);save();updateLiveResults();applyTargetMarks();});
$('#content').addEventListener('focusout',e=>{const t=e.target;if(t.matches('[data-score],[data-main]')&&!t.validity.valid){const source=t.dataset.score?data.scores:data.main;t.value=source[t.dataset.score||t.dataset.main]??'';t.setCustomValidity('');toast('Scores must be between 0 and 100. Previous value restored.');}});
$('#content').onclick=e=>{let b=e.target.closest('button');if(!b)return;if(b.dataset.go){view=b.dataset.go;render();}if(b.dataset.openLm){view='daily';lm=+b.dataset.openLm;render();}if(b.dataset.lm){lm=+b.dataset.lm;render();}if(b.id==='addTest')addDailyTest();if(b.id==='editLM')editLM();if(b.dataset.editStudent)studentForm(b.dataset.editStudent);if(b.dataset.removeStudent){const id=b.dataset.removeStudent,s=data.students.find(s=>s.id===id);modal('Remove student?',s.name+' will be removed from both semesters. Their scores will also be deleted.','<p>You can cancel to keep this student.</p>',()=>{data.students=data.students.filter(s=>s.id!==id);[data.scores,data.main,data.assignmentStatuses].forEach(obj=>Object.keys(obj).filter(k=>k.startsWith(id+'|')).forEach(k=>delete obj[k]));save();render();toast('Student removed');});}if(b.id==='printReport')window.print();};
const navs=[['home','home','Home'],['schedule','tests','Schedule'],['assignments','daily','Assignments'],['daily','daily','Daily scores'],['tests','tests','Main tests'],['report','report','Recap'],['students','students','Students']];$('#nav').innerHTML=navs.map(([id,i,label])=>`<button data-view="${id}" class="${id===view?'active':''}">${icon(i)}<span>${label}</span></button>`).join('');$('#nav').onclick=e=>{const b=e.target.closest('[data-view]');if(b){view=b.dataset.view;query='';render();window.scrollTo({top:0,behavior:'smooth'});}};$('#classSelect').innerHTML=classOptions(classId);$('#classSelect').onchange=e=>{classId=e.target.value;query='';render();};$('#classes').onclick=e=>{const c=e.target.dataset.class;if(c){classId=c;query='';render();}};$$('[data-sem]').forEach(b=>b.onclick=()=>{semester=+b.dataset.sem;render();});$('#addStudent').onclick=()=>studentForm();$('#cancel').onclick=()=>$('#modal').close();$('#startFresh').onclick=()=>modal('Start your own classroom','This clears the fictional students and sample scores across all 13 classes.','<p>The 13 classes, 4 LM, and 2 competencies per LM will stay ready for you. Your older Scorebook data is kept separately.</p>',()=>{data=emptyData();save();render();toast('Ready for Miss Bell’s students.');});
function parentURL(){const url=new URL(window.location.href);url.search='';url.searchParams.set('view','parents');url.searchParams.set('class',classId);url.searchParams.set('semester',semester);return url.pathname+url.search;}
function initializePortal(){if(!data.portalVersion){data.events=[];data.announcements=[];if(data.sample){const next=days=>{let d=new Date();d.setDate(d.getDate()+days);return d.toISOString().slice(0,10);};classes.forEach(c=>data.events.push({id:uid(),classId:c,semester:1,title:'Vocabulary & greetings quiz',date:next(3),type:'daily',lm:1,topic:'Greetings, introducing yourself, and classroom vocabulary',notes:'Review your English notebook. Bring a pencil and an eraser.'},{id:uid(),classId:c,semester:1,title:'Midterm English test',date:next(10),type:'mid',lm:0,topic:'Review Lingkup Materi 1 and 2',notes:'Practise the vocabulary and short sentences from both units.'}));}data.portalVersion=1;}data.events??=[];data.announcements??=[];$('#portalToggle').onclick=()=>{window.location.href=parentURL();};const oldClick=$('#content').onclick;$('#content').onclick=e=>{const b=e.target.closest('button');if(b){if(b.id==='addAssignment'){assignmentForm();return;}if(b.dataset.editAssignment){assignmentForm(b.dataset.editAssignment);return;}if(b.dataset.removeAssignment){const id=b.dataset.removeAssignment;modal('Remove assignment?','This removes the class assignment and its teacher submission records.','',()=>{data.assignments=data.assignments.filter(a=>a.id!==id);Object.keys(data.assignmentStatuses).filter(k=>k.endsWith('|'+id)).forEach(k=>delete data.assignmentStatuses[k]);save();render();toast('Assignment removed');});return;}if(b.id==='scheduleTest'){scheduleTest();return;}if(b.id==='postAnnouncement'){postAnnouncement();return;}if(b.dataset.deleteEvent){const id=b.dataset.deleteEvent;modal('Remove this scheduled test?','It will no longer appear in the class or parent test schedule.','',()=>{data.events=data.events.filter(t=>t.id!==id);save();render();toast('Scheduled test removed');});return;}}oldClick(e);};$('#content').addEventListener('change',e=>{if(e.target.matches('[data-assignment]'))updateAssignmentStatus(e.target);});}
function portalLayout(){
 const parent=view==='family';document.body.classList.toggle('family-mode',parent);
 $('#portalToggle').textContent='Parent page';$('#portalToggle').classList.toggle('hidden',parent);
 for(const id of ['addStudent','exportBtn','stats','classCount'])$('#'+id).classList.toggle('hidden',parent);
 $('#sampleNotice').classList.add('hidden');$('.header-right .local').classList.toggle('hidden',parent);
 $('.header-right .avatar').classList.toggle('hidden',parent);$('.header-right .pill').textContent=parent?'CLASS NOTICEBOARD':'MISS BELL · TEACHER';
 $('#loginBtn').textContent=teacherReady?(parent?'Teacher dashboard':'Sign out'):'Teacher login';
 $('#backupBtn').classList.toggle('hidden',!teacherReady);$('#retrySave').classList.toggle('hidden',!teacherReady||!dirty);
 $('.footer').innerHTML='<span>English with Miss Bell · A little learning, every day.</span><span>Class announcements, assignments & upcoming tests</span>';
 if(parent)window.history.replaceState(null,'',parentURL());
}
function getSchedule(){const planned=data.events.filter(t=>t.classId===classId&&t.semester===semester);const daily=tests().filter(t=>t.date).map(t=>({...t,type:'daily',topic:`LM ${t.lm} · Competency ${t.competency}`,title:t.name,linked:true,notes:''}));return [...planned,...daily].sort((a,b)=>a.date.localeCompare(b.date));}
function localToday(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
function dateLabel(date){return new Date(date+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short',year:'numeric'});}
function scheduleCards(items,teacher){return items.length?items.map(t=>`<article class="event-card"><div class="event-date">${icon('tests')}<span>${escapeHtml(dateLabel(t.date))}</span><span class="tag ${t.date<localToday()?'':'green'}">${t.date<localToday()?'Past test':t.date===localToday()?'Today':'Upcoming'}</span></div><h3>${escapeHtml(t.title)}</h3><p>${escapeHtml(t.topic||'Topic to be announced')}</p>${t.notes?`<p class="event-notes">${escapeHtml(t.notes)}</p>`:''}<div class="event-bottom"><span class="tag">${t.type==='mid'?'Midterm test':t.type==='end'?'End-of-semester test':'Daily test'+(t.lm?' · LM '+t.lm:'')}</span>${teacher&&!t.linked?`<button class="textbtn" data-copy-event="${t.id}">Copy to classes</button><button class="textbtn danger" data-delete-event="${t.id}">Remove</button>`:''}</div></article>`).join(''):'<div class="empty">No tests scheduled yet. Check back for Miss Bell’s next update.</div>';}
function announcements(){const list=data.announcements.filter(a=>a.classId===classId&&a.semester===semester);return list.length?list.slice().reverse().map(a=>`<div class="announcement"><span class="tag">From Miss Bell</span><p>${escapeHtml(a.text)}</p>${attachmentLink(a.document)}${teacherReady?`<button class="textbtn" data-edit-announcement="${a.id}">Edit announcement</button>`:''}<small>${escapeHtml(new Date(a.date).toLocaleDateString())}</small></div>`).join(''):'<div class="empty">No announcements for this class yet.</div>';}
function scheduleView(){return `<div class="info"><b>Class information for parents.</b> Test dates, study topics, assignments, and announcements appear on the parent page. Students’ scores and individual submission statuses stay in the teacher tools. Public updates appear after Firebase confirms the save.</div><section class="panel"><div class="panelhead"><div><h2>English test calendar</h2><p>${meta()} · ${getSchedule().length} scheduled tests</p></div><button class="btn primary" id="scheduleTest">${icon('plus')}Schedule a test</button></div><div class="event-list">${scheduleCards(getSchedule(),true)}</div></section><section class="panel table-section"><div class="panelhead"><div><h2>Class announcements</h2><p>Reminders and preparation notes for families</p></div><button class="btn" id="postAnnouncement">+ Announcement</button></div>${announcements()}</section>`;}
function scheduleTest(){
 modal('Schedule an English test',meta(),`<label for="eventTitle">Test name</label><input id="eventTitle" name="title" required maxlength="80" placeholder="e.g. LM 2 vocabulary quiz"><label for="eventDate">Test date</label><input id="eventDate" name="date" type="date" required><label for="eventType">Test type</label><select id="eventType" name="type"><option value="daily">Daily test</option><option value="mid">Midterm test</option><option value="end">End-of-semester test</option></select><label for="eventLM">Lingkup Materi (daily tests)</label><select id="eventLM" name="lm">${[1,2,3,4].map(n=>`<option value="${n}">LM ${n}</option>`).join('')}</select><label for="eventTopic">Topics to study</label><input id="eventTopic" name="topic" required maxlength="200"><label for="eventNotes">Preparation notes</label><input id="eventNotes" name="notes" maxlength="300">${classPicker()}`,f=>{
  const selected=chosenClasses(f),title=f.get('title').trim(),topic=f.get('topic').trim();
  if(!selected.length||!title||!topic){toast('Enter the title, topic, and at least one class.');return false;}
  for(const c of selected)data.events.push({id:uid(),classId:c,semester,title,topic,date:f.get('date'),type:f.get('type'),lm:f.get('type')==='daily'?Number(f.get('lm')):0,notes:f.get('notes').trim()});
  save();render();toast(`Test scheduled for ${selected.length} classes. Waiting for Firebase save.`);
 });
}
function postAnnouncement(id){
 const a=data.announcements.find(a=>a.id===id);
 modal(a?'Edit announcement':'A note from Miss Bell',meta(),`<label for="announcementText">Announcement</label><textarea id="announcementText" name="text" required maxlength="1000" rows="5">${escapeHtml(a?.text||'')}</textarea>${attachmentFields(a?.document)}`,f=>{
  const text=f.get('text').trim();if(!text){toast('Enter your announcement.');return false;}
  let document;try{document=readAttachment(f);}catch(e){toast(e.message);return false;}
  if(a)Object.assign(a,{text,document});else data.announcements.push({id:uid(),classId,semester,text,document,date:new Date().toISOString()});
  save();render();toast('Announcement updated. Waiting for Firebase save.');
 });
}
function familyView(){if(!teacherReady&&publicState!=='ready')return `<section class="panel"><div class="empty">${publicState==='error'?'Could not load this class. Check your connection and try again. <button class="btn" id="retryPublic">Try again</button>':'Loading class noticeboard…'}</div></section>`;const upcoming=getSchedule().filter(t=>t.date>=localToday());return `<div class="family-demo"><b>Class noticeboard · No account needed</b><p>Choose your child’s class and semester to see English announcements, assignment instructions, and upcoming tests. Updates from Miss Bell are shared here. Student records are private.</p></div><div class="family-selector"><div><span class="eyebrow">LEARNING WITH MISS BELL</span><h2>Welcome, class ${classId} families ✦</h2><p>English · ${escapeHtml(data.schoolYear||yearEntry()?.label||'')} · Semester ${semester}</p></div><span class="tag">Class information</span></div><section class="panel"><div class="panelhead"><div><h2>Announcements from Miss Bell</h2><p>The latest notes and reminders for class ${classId}</p></div>${icon('book')}</div>${announcements()}</section><section class="panel table-section"><div class="panelhead"><div><h2>English assignments</h2><p>What to do, what to prepare, and when to submit</p></div><span class="tag">${classAssignments().length} assignments</span></div>${classAssignmentCards()}</section><section class="panel table-section"><div class="panelhead"><div><h2>Upcoming English tests</h2><p>Dates, study topics, and preparation notes</p></div><span class="tag green">${upcoming.length} upcoming</span></div><div class="event-list">${scheduleCards(upcoming,false)}</div></section>`;}

const assignmentLabels={not_submitted:'Not submitted',submitted:'Submitted',late:'Late',missing:'Missing'};
function classAssignments(){return data.assignments.filter(a=>a.classId===classId&&a.semester===semester).sort((a,b)=>a.due.localeCompare(b.due));}
function assignmentStatus(studentId,assignment){const stored=data.assignmentStatuses[studentId+'|'+assignment.id];if(stored&&stored!=='not_submitted')return stored;return assignment.due<localToday()?'missing':'not_submitted';}
function statusTag(status){return `<span class="tag ${status==='submitted'?'green':status==='missing'?'pink':status==='late'?'orange':''}">${assignmentLabels[status]||'Not submitted'}</span>`;}
function initializeAssignments(){data.assignments??=[];data.assignmentStatuses??={};if(!data.assignmentVersion){if(data.sample){const date=offset=>{let d=new Date();d.setDate(d.getDate()+offset);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};classes.forEach(c=>{const a={id:'sample-'+c+'-vocab',classId:c,semester:1,lm:1,title:'My English word collection',due:date(5),instructions:'Write five classroom objects in English. Add a small drawing beside each word.'};const b={id:'sample-'+c+'-greeting',classId:c,semester:1,lm:1,title:'Introduce yourself',due:date(-2),instructions:'Write three short sentences introducing yourself. Bring your work to the next lesson.'};data.assignments.push(a,b);data.students.filter(s=>s.classId===c).forEach((s,i)=>{if(i%3===0)data.assignmentStatuses[s.id+'|'+a.id]='submitted';data.assignmentStatuses[s.id+'|'+b.id]=['submitted','late','not_submitted'][i%3];});});}data.assignmentVersion=1;}}
function classAssignmentCards(){const items=classAssignments();return items.length?`<div class="assignment-family-list">${items.map(a=>`<article class="event-card"><div class="event-date">${icon('daily')}<span>Due ${escapeHtml(dateLabel(a.due))}</span></div><h3>${escapeHtml(a.title)}</h3><p style="white-space:pre-wrap">${escapeHtml(a.instructions)}</p>${attachmentLink(a.document)}<div class="event-bottom"><span class="tag">English · LM ${a.lm}</span></div></article>`).join('')}</div>`:'<div class="empty">No assignments for this class yet.</div>';}

function assignmentsView(){const list=classAssignments(),roster=students();const counts={not_submitted:0,submitted:0,late:0,missing:0};list.forEach(a=>roster.forEach(s=>counts[assignmentStatus(s.id,a)]++));return `<div class="info"><b>Submission tracking only.</b> These statuses do not change daily-test scores or averages. Unsubmitted work becomes Missing after its due date. Individual submission statuses are visible only in the teacher tools; parents see assignment instructions and deadlines.</div><div class="assignment-counts">${Object.entries(assignmentLabels).map(([k,label])=>`<div><span class="muted">${label}</span><strong id="count-${k}">${counts[k]}</strong></div>`).join('')}</div><section class="panel"><div class="panelhead"><div><h2>English assignments</h2><p>${meta()} · ${list.length} assignments · ${roster.length} learners</p></div><button class="btn primary" id="addAssignment">${icon('plus')}Add assignment</button></div>${list.length?list.map(a=>`<article class="assignment-block"><div class="assignment-head"><div><h3>${escapeHtml(a.title)}</h3><p>Due ${escapeHtml(dateLabel(a.due))} · LM ${a.lm}</p><p class="assignment-instructions">${escapeHtml(a.instructions)}</p>${attachmentLink(a.document)}</div><div class="buttons"><button class="textbtn" data-copy-assignment="${a.id}">Copy to classes</button><button class="textbtn" data-edit-assignment="${a.id}">Edit</button><button class="textbtn danger" data-remove-assignment="${a.id}">Remove</button></div></div><div class="table-scroll"><table><thead><tr><th>Student</th><th>Assignment status</th><th>Current status</th></tr></thead><tbody>${roster.map(st=>{const status=assignmentStatus(st.id,a);return `<tr><td>${studentCell(st)}</td><td><select class="status-select" aria-label="${escapeHtml(st.name+' assignment '+a.title)}" data-assignment="${a.id}" data-assignment-student="${st.id}">${Object.entries(assignmentLabels).map(([k,label])=>`<option value="${k}" ${k===status?'selected':''}>${label}</option>`).join('')}</select></td><td data-assignment-badge="${st.id}|${a.id}">${statusTag(status)}</td></tr>`;}).join('')||emptyRow(3)}</tbody></table></div></article>`).join(''):'<div class="empty">Create your first assignment for class '+classId+'.</div>'}<div class="tablefoot"><span>Late = submitted after the due date · Missing = not submitted after the due date</span><span>Changes save automatically</span></div></section>`;}
function assignmentForm(id){
 const a=data.assignments.find(a=>a.id===id);
 modal(a?'Edit assignment':'A new English assignment',meta(),`<label for="assignmentTitle">Assignment name</label><input id="assignmentTitle" name="title" required maxlength="100" value="${escapeHtml(a?.title||'')}"><label for="assignmentDue">Due date</label><input id="assignmentDue" name="due" type="date" required value="${a?.due||''}"><label for="assignmentLM">Lingkup Materi</label><select id="assignmentLM" name="lm">${[1,2,3,4].map(n=>`<option value="${n}" ${n===(a?.lm||1)?'selected':''}>LM ${n}</option>`).join('')}</select><label for="assignmentInstructions">Instructions</label><textarea id="assignmentInstructions" name="instructions" required maxlength="1000" rows="4">${escapeHtml(a?.instructions||'')}</textarea>${attachmentFields(a?.document)}${a?'':classPicker()}`,f=>{
  const title=f.get('title').trim(),instructions=f.get('instructions').trim(),selected=a?[a.classId]:chosenClasses(f);
  if(!title||!instructions||!selected.length){toast('Enter a name, instructions, and at least one class.');return false;}
  let document;try{document=readAttachment(f);}catch(e){toast(e.message);return false;}
  const fields={title,instructions,due:f.get('due'),lm:Number(f.get('lm')),document};
  if(a)Object.assign(a,fields);else for(const c of selected)data.assignments.push({id:uid(),classId:c,semester,...structuredClone(fields)});
  save();render();toast(a?'Assignment updated. Waiting for Firebase save.':`Assignment added to ${selected.length} classes. Waiting for Firebase save.`);
 });
}

function updateAssignmentStatus(target){const a=data.assignments.find(a=>a.id===target.dataset.assignment);if(!a||!Object.hasOwn(assignmentLabels,target.value))return;data.assignmentStatuses[target.dataset.assignmentStudent+'|'+a.id]=target.value;save();const result=assignmentStatus(target.dataset.assignmentStudent,a);target.value=result;const badge=$(`[data-assignment-badge="${target.dataset.assignmentStudent}|${a.id}"]`);if(badge)badge.innerHTML=statusTag(result);const counts={not_submitted:0,submitted:0,late:0,missing:0};classAssignments().forEach(a=>students().forEach(s=>counts[assignmentStatus(s.id,a)]++));Object.keys(counts).forEach(k=>{let el=$('#count-'+k);if(el)el.textContent=counts[k];});toast(result==='missing'&&data.assignmentStatuses[target.dataset.assignmentStudent+'|'+a.id]==='not_submitted'?'Past-due unsubmitted work is marked Missing.':'Assignment status updated');}

// Excel can use semicolons in regional settings. Declare the delimiter explicitly.
function buildScoreCSV(rows){
 const neutral=value=>/^[=+@\-\t\r\n]/.test(String(value))?"'"+value:value;
 const quote=value=>'"'+String(neutral(value??'')).replace(/"/g,'""')+'"';
 return '\uFEFFsep=,\r\n'+rows.map(row=>row.map(quote).join(',')).join('\r\n');
}
function exportCSV(){
 const ts=tests();
 const number=value=>value===null||value===undefined?'':Number(value.toFixed(2));
 const rows=[
  ['Teacher','Subject','Class','Semester','Student',...ts.map(t=>`LM${t.lm} K${t.competency}: ${t.name}`),'LM1 average','LM2 average','LM3 average','LM4 average','Midterm test','End-of-semester test'],
  ...students().map(s=>['Miss Bell','English',classId,semester,s.name,...ts.map(t=>score(s.id,t.id)??''),...[1,2,3,4].map(n=>number(lmAverage(s.id,n))),mainScore(s.id,'mid')??'',mainScore(s.id,'end')??'']),
  ['Class average','English',classId,semester,'',...ts.map(t=>number(average(students().map(s=>score(s.id,t.id))))),...[1,2,3,4].map(n=>number(classLM(n))),number(classMain('mid')),number(classMain('end'))]
 ];
 const blob=new Blob([buildScoreCSV(rows)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=`Miss-Bell-English-${classId}-Semester-${semester}.csv`;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Class scores exported for Excel');
}
$('#exportBtn').onclick=exportMenu;initializePortal();initializeAssignments();initializeFeatures();render();startCloud();

function setCloudStatus(message){$('#saveStatus').textContent=message;$('#retrySave').classList.toggle('hidden',!teacherReady||!dirty);}
function banner(message,error=false){const b=$('#cloudBanner');b.textContent=message;b.classList.toggle('hidden',!message);b.classList.toggle('cloud-error',error);}
function friendlyError(error){
 const code=error?.code||'';
 if(code==='auth/unauthorized-domain')return 'Login domain is not authorized. In Firebase Authentication → Settings → Authorized domains, add syanelle22.github.io.';
 if(code==='auth/popup-blocked')return 'The browser blocked Google login. Allow pop-ups for this website, then try Teacher login again.';
 if(code==='auth/popup-closed-by-user')return 'Google login was closed. Click Teacher login to try again.';
 if(code==='permission-denied')return 'Firebase denied access. Check the published Firestore rules and the Google account used to log in.';
 if(code==='unavailable'||code==='auth/network-request-failed')return 'Cannot reach Firebase. Check your internet connection, then retry.';
 return error?.message||'Something went wrong. Please try again.';
}
let savePromise=null;
async function flushSave(){
 clearTimeout(saveTimer);
 if(saving)return savePromise;
 if(!teacherReady||!dirty||saveBlocked)return;
 const generation=authGeneration,version=editVersion,snapshot=structuredClone(data),context=structuredClone(school);
 saving=true;setCloudStatus('Saving to Firebase…');
 savePromise=(async()=>{
  try{
   await cloud.persist(snapshot,context);
   for(const current of school.years){const saved=context.years.find(y=>y.id===current.id);if(saved)current.storage=saved.storage;}
   if(generation!==authGeneration)return;
   if(version===editVersion)dirty=false;
   setCloudStatus(dirty?'Unsaved changes':'Saved to Firebase');
   if(!dirty)banner('');
  }catch(error){
   if(generation!==authGeneration)return;
   saveBlocked=String(error.message).startsWith('CONFLICT:');
   setCloudStatus('NOT SAVED');
   banner('Not saved to Firebase. '+friendlyError(error)+' Your edits are still in this tab. Use Backup before closing.',true);
  }finally{
   saving=false;
   if(generation===authGeneration&&dirty&&!saveBlocked&&version!==editVersion)saveTimer=setTimeout(flushSave,700);
  }
 })();return savePromise;
}
function stopPublic(){publicUnsubscribe?.();publicUnsubscribe=null;publicKey='';}
function ensurePublic(){
 const key=classId+'-'+semester;if(publicKey===key)return;
 stopPublic();publicKey=key;const c=classId,s=semester;publicState='loading';
 // Clear the previous class immediately. Public sessions never fetch teacherData.
 data=emptyData();data.portalVersion=1;data.assignmentVersion=1;
 queueMicrotask(()=>{if(!teacherReady&&publicKey===key)render();});
 publicUnsubscribe=cloud.observePublic(c,s,page=>{
  if(teacherReady||publicKey!==key)return;
  data=emptyData();data.portalVersion=1;data.assignmentVersion=1;
  if(page){
   data.schoolYear=page.schoolYear||'';
   data.announcements=(page.announcements||[]).map(a=>({...a,classId:c,semester:s}));
   data.assignments=(page.assignments||[]).map(a=>({...a,classId:c,semester:s}));
   data.events=(page.tests||[]).map(a=>({...a,classId:c,semester:s}));
  }
  publicState='ready';render();
 },()=>{if(publicKey!==key||teacherReady)return;data=emptyData();publicState='error';render();});
}
function backup(){
 if(!teacherReady)return;
 const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),subject:'English',schoolYear:school.year,data},null,2)],{type:'application/json'});
 const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='Miss-Bell-private-backup-'+localToday()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 toast('Private backup downloaded. Keep this file out of the public repository.');
}
function startCloud(){
 let loginClicked=false;
 $('#backupBtn').onclick=backup;$('#retrySave').onclick=()=>{if(saveBlocked){banner('Another device changed the database. Download Backup, then reload this page. Your draft has not overwritten the other device.',true);return;}flushSave();};
 document.addEventListener('click',e=>{if(e.target.closest('#retryPublic')){publicKey='';ensurePublic();}});
 $('#loginBtn').onclick=async()=>{
  if(teacherReady&&view==='family'){view='home';window.history.replaceState(null,'',location.pathname);render();return;}
  if(teacherReady){
   await flushSave();if(saving)await savePromise;
   if(dirty&&!confirm('Some edits have not saved. Cancel and use Backup to keep them. Sign out and discard the unsaved edits?'))return;
   try{await cloud.logout();}catch(e){banner(friendlyError(e),true);}return;
  }
  loginClicked=true;$('#loginBtn').disabled=true;banner('Opening Google login…');
  try{await cloud.login();}catch(e){loginClicked=false;banner(friendlyError(e),true);}finally{$('#loginBtn').disabled=false;}
 };
 cloud.observeAuth(async user=>{
  const generation=++authGeneration;teacherReady=false;stopPublic();authUser=user;
  clearTimeout(saveTimer);dirty=false;saveBlocked=false;data=emptyData();view='family';publicState='loading';render();
  if(!user){banner('');return;}
  if(!cloud.isTeacher(user)){banner('This Google account has no teacher access. Please use Miss Bell’s registered account.',true);await cloud.logout();banner('This account has no teacher access. Use Miss Bell’s Google account.',true);return;}
  stopPublic();banner('Loading Miss Bell’s classroom from Firebase…');
  try{
   const loaded=await cloud.loadTeacher();const {chunks}=loaded;
   if(generation!==authGeneration)return;
   stopPublic();school={year:loaded.year,years:loaded.years,activeYear:loaded.activeYear};data=Object.keys(chunks).length?mergePrivate(chunks,emptyData):emptyData();data.portalVersion=1;data.assignmentVersion=1;
   teacherReady=true;view=loginClicked||initialParams.get('view')!=='parents'?'home':'family';loginClicked=false;
   if(view!=='family')window.history.replaceState(null,'',location.pathname);
   setCloudStatus('Loaded from Firebase');render();
   banner(Object.keys(chunks).length?'':'Your classroom is ready. Start with Add student. Data saves automatically to Firebase.');
  }catch(e){if(generation!==authGeneration)return;teacherReady=false;data=emptyData();banner('Could not load the teacher database. '+friendlyError(e),true);render();}
 });
 window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
 // Capture prevents the visible teacher controls from mutating after session loss or a conflict.
 for(const type of ['click','input','change','submit'])document.addEventListener(type,e=>{
  const teacherControl=e.target.closest('#nav,#addStudent,#exportBtn,#modal,#content [data-score],#content [data-main],#content [data-assignment],#content button');
  if(!teacherControl||e.target.closest('#retryPublic'))return;
  if(!teacherReady||saveBlocked){e.preventDefault();e.stopImmediatePropagation();if(teacherReady)banner('Editing paused because another device changed the data. Download Backup and reload.',true);}
 },true);
}

function yearEntry(){return school.years.find(y=>y.id===school.year);}
function canEdit(){return teacherReady&&!yearEntry()?.archived&&!data.archivedClasses?.includes(classId);}
function attachmentLink(value){const a=safeAttachment(value);return a?`<a class="attachment" href="${escapeHtml(a.url)}" target="_blank" rel="noopener noreferrer">Document: ${escapeHtml(a.label)} ↗</a>`:'';}
function attachmentFields(value){const a=safeAttachment(value);return `<label for="documentLabel">Document name (optional)</label><input name="documentLabel" id="documentLabel" maxlength="100" value="${escapeHtml(a?.label||'')}" placeholder="e.g. English worksheet PDF"><label for="documentURL">Google Drive document link (optional)</label><input type="url" name="documentURL" id="documentURL" maxlength="2000" value="${escapeHtml(a?.url||'')}" placeholder="https://drive.google.com/…"><p class="form-help">Upload the document to Drive first. Set its viewing permission for the intended families, then paste the HTTPS sharing link here. Only attach documents intended for parents and students. Leave the link blank to remove the attachment.</p>`;}
function readAttachment(f){const url=String(f.get('documentURL')||'').trim();if(!url)return null;const a=safeAttachment({url,label:String(f.get('documentLabel')||'Document').trim()});if(!a)throw new Error('Use a valid HTTPS document link.');return a;}
function classPicker(selected=[classId]){return `<label>Classes</label><div class="copy-classes">${classes.map(c=>`<label><input type="checkbox" name="targetClasses" value="${c}" ${selected.includes(c)?'checked':''} ${data.archivedClasses?.includes(c)?'disabled':''}>${c}${data.archivedClasses?.includes(c)?' (archived)':''}</label>`).join('')}</div>`;}
function chosenClasses(f){return [...new Set(f.getAll('targetClasses'))].filter(c=>classes.includes(c)&&!data.archivedClasses?.includes(c));}
function applyTargetMarks(){
 const target=targetFor(data,classId,semester);
 for(const e of $$('[data-score],[data-main],[data-value],[data-lm-result]')){
  let value=null;
  if(e.dataset.score)value=data.scores[e.dataset.score];else if(e.dataset.main)value=data.main[e.dataset.main];else if(e.dataset.lmResult)value=lmAverage(e.dataset.lmResult,lm);else if(e.dataset.value!=='')value=Number(e.dataset.value);
  const low=belowTarget(value,target);e.classList.toggle('below-target',low);if(low)e.title=`Below target ${target}`;else e.removeAttribute('title');
 }
}
function enhanceUI(){
 $('#yearTools').classList.toggle('hidden',!teacherReady);
 $('#yearSelect').innerHTML=school.years.map(y=>`<option value="${y.id}" ${y.id===school.year?'selected':''}>${escapeHtml(y.label)}${y.id===school.activeYear?' · Active':''}${y.archived?' · Archived':''}</option>`).join('');
 $('#yearBadge').textContent=school.year===school.activeYear?'Public year':yearEntry()?.archived?'Archived year':'Not public';
 const readonly=teacherReady&&!canEdit();$('#archiveNotice').classList.toggle('hidden',!readonly);$('#archiveNotice').textContent=readonly?'This year or class is archived. You can browse and export. Use Manage archives to restore editing.':'';
 $('#targetInput').value=targetFor(data,classId,semester)??'';$('#targetInput').disabled=!canEdit();
 $('#targetHint').innerHTML=targetFor(data,classId,semester)===null?'Set a target to highlight low scores.':'<span class="low-key">Below target</span> · Blank scores are excluded';
 $('#addStudent').disabled=!canEdit();
 const mutators='#addTest,#editLM,#addAssignment,#scheduleTest,#postAnnouncement,[data-edit-student],[data-remove-student],[data-edit-assignment],[data-remove-assignment],[data-copy-assignment],[data-copy-event],[data-edit-announcement],[data-delete-event],[data-score],[data-main],[data-assignment]';
 $$(mutators).forEach(e=>e.disabled=!canEdit());
 applyTargetMarks();
}
async function savedBeforeSwitch(){clearTimeout(saveTimer);await flushSave();if(saving)await savePromise;if(dirty){banner('Save or resolve the pending edits before switching school years. Use Backup to keep a private copy.',true);return false;}return true;}
async function switchYear(id){
 if(!teacherReady||!school.years.some(y=>y.id===id)||!await savedBeforeSwitch()){enhanceUI();return;}
 const old=school.year;$('#yearSelect').disabled=true;
 try{const loaded=await cloud.loadTeacher(id);school={year:loaded.year,years:loaded.years,activeYear:loaded.activeYear};data=Object.keys(loaded.chunks).length?mergePrivate(loaded.chunks,emptyData):emptyData();data.portalVersion=1;data.assignmentVersion=1;view='home';render();banner('');setCloudStatus('Loaded from Firebase');}
 catch(e){$('#yearSelect').value=old;banner('Could not switch school year. '+friendlyError(e),true);}
 finally{$('#yearSelect').disabled=false;}
}
function newYearForm(){
 const next=Number((school.year||'2026-2027').slice(0,4))+1;
 modal('Start a school year','Previous years remain saved. A new year starts with blank scores, assignments, and test schedules.',`<label for="yearStart">Starting year</label><input id="yearStart" name="start" type="number" min="2000" max="9998" required value="${next}"><p class="form-help">For 2027/2028, enter 2027.</p><label style="display:flex;gap:8px"><input type="checkbox" name="copyRoster" style="width:auto">Copy student names into the same classes (no scores)</label>`,f=>{
  const start=Number(f.get('start')),id=start+'-'+(start+1);if(!validYear(id)||school.years.some(y=>y.id===id)){toast('Choose a new school year.');return false;}
  const copy=!!f.get('copyRoster'),roster=copy?structuredClone(data.students):[];
  queueMicrotask(async()=>{if(!await savedBeforeSwitch())return;school.years.push({id,label:yearLabel(id),archived:false,storage:'year'});school.year=id;data=emptyData();data.students=roster.map(st=>({...st,id:uid()}));data.portalVersion=1;data.assignmentVersion=1;view='home';save();render();await flushSave();if(!dirty)banner('New school year saved. Use Manage archives → Make this year public when ready.');});
 },true);
}
function manageYearForm(){
 const y=yearEntry();if(!y)return;
 modal('School years & class archives',`${y.label}. Choose the year in the toolbar before managing it.`, `<p class="form-help">Public pages show only the active year. Archiving keeps records and pauses editing. Restore an archive to edit again.</p><label for="yearAction">Action</label><select name="action" id="yearAction"><option value="label">Update year label</option><option value="activate" ${y.archived?'disabled':''}>Make this year public</option><option value="archiveYear" ${school.year===school.activeYear?'disabled':''}>Archive this year</option><option value="restoreYear">Restore this year</option><option value="archiveClass">Archive class ${classId}</option><option value="restoreClass">Restore class ${classId}</option></select><label for="yearLabel">Year label</label><input id="yearLabel" name="label" required maxlength="40" value="${escapeHtml(y.label)}"><p class="form-help">The current public year cannot be archived until another year is made public. An archived class is removed from the public noticeboard after saving.</p>`,f=>{
  const action=f.get('action');
  if(action==='archiveYear'&&school.year===school.activeYear){toast('Make another year public first.');return false;}
  if(action==='activate'&&y.archived){toast('Restore this year first.');return false;}
  const label=String(f.get('label')).trim();if(!label){toast('Enter a year label.');return false;}
  if(!confirm('Apply this change to '+y.label+'?'))return false;
  if(action==='label')y.label=label;
  if(action==='activate')school.activeYear=school.year;
  if(action==='archiveYear')y.archived=true;if(action==='restoreYear')y.archived=false;
  if(action==='archiveClass')data.archivedClasses=[...new Set([...(data.archivedClasses||[]),classId])];
  if(action==='restoreClass')data.archivedClasses=(data.archivedClasses||[]).filter(c=>c!==classId);
  save();render();toast('Archive settings updated. Waiting for Firebase save.');
 },true);
}
function copyForm(type,id){
 const collection=type==='assignment'?'assignments':'events',item=data[collection].find(a=>a.id===id);if(!item)return;
 modal('Copy '+(type==='assignment'?'assignment':'test schedule'),'Each class receives an independent copy. Student submission statuses and scores are not copied.',`<p class="form-help">${escapeHtml(item.title)}</p>${classPicker([])}<label for="copyDate">${type==='assignment'?'Due date':'Test date'}</label><input id="copyDate" type="date" name="date" required value="${item.due||item.date}">`,f=>{
  const selected=chosenClasses(f).filter(c=>c!==item.classId);if(!selected.length){toast('Select at least one different class.');return false;}
  const copies=copyToClasses(item,selected,data.archivedClasses||[],uid);for(const copy of copies){if(type==='assignment')copy.due=f.get('date');else copy.date=f.get('date');}
  data[collection].push(...copies);save();render();toast(`Copied to ${copies.length} classes. Waiting for Firebase save.`);
 });
}
function exportMenu(){
 modal('Export class scores',meta(),'<label for="exportFormat">Format</label><select name="format" id="exportFormat"><option value="xlsx">Excel workbook (.xlsx) with chart</option><option value="csv">CSV for Excel</option></select><p class="form-help">Excel includes Summary, Recap, and Daily scores sheets. It uses the selected class, year, semester, and target. Student records stay private.</p>',f=>{
  if(f.get('format')==='csv'){exportCSV();return;}
  const snapshot={classId,semester,year:yearEntry()?.label||school.year,target:targetFor(data,classId,semester),students:structuredClone(students()),tests:structuredClone(tests()).sort((a,b)=>a.lm-b.lm||a.competency-b.competency),scores:structuredClone(data.scores),main:structuredClone(data.main)};
  exportWorkbook(snapshot).then(()=>toast('Excel workbook downloaded')).catch(e=>banner('Excel export failed. '+e.message,true));
 },true);
}
function initializeFeatures(){
 $('#yearSelect').onchange=e=>switchYear(e.target.value);$('#newYear').onclick=newYearForm;$('#manageYear').onclick=manageYearForm;
 $('#targetInput').onchange=e=>{if(!canEdit())return;const value=e.target.value.trim();if(value!==''&&(!e.target.validity.valid||!Number.isFinite(Number(value)))){toast('Target must be between 0 and 100.');e.target.value=targetFor(data,classId,semester)??'';return;}data.targets??={};if(value==='')delete data.targets[classId+'|'+semester];else data.targets[classId+'|'+semester]=Number(value);save();enhanceUI();};
 $('#content').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.copyAssignment)copyForm('assignment',b.dataset.copyAssignment);if(b.dataset.copyEvent)copyForm('event',b.dataset.copyEvent);if(b.dataset.editAnnouncement)postAnnouncement(b.dataset.editAnnouncement);});
 document.addEventListener('click',e=>{if(canEdit()||!teacherReady)return;const b=e.target.closest('#content button');if(b&&b.matches('[data-edit-student],[data-remove-student],[data-edit-assignment],[data-remove-assignment],[data-copy-assignment],[data-copy-event],[data-edit-announcement],[data-delete-event],#addTest,#editLM,#addAssignment,#scheduleTest,#postAnnouncement')){e.preventDefault();e.stopImmediatePropagation();}},true);
}

function studentClassOptions(selected){return classes.map(c=>`<option value="${c}" ${c===selected?'selected':''} ${data.archivedClasses?.includes(c)?'disabled':''}>Class ${c}${data.archivedClasses?.includes(c)?' (archived)':''}</option>`).join('');}
