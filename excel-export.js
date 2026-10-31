import {gradeDetails} from './final-model.js?v=6';
// Uses the styled workbook and native chart authored in excel-template.json.
// The package writer only places populated XML parts into the XLSX ZIP container.
const xml=v=>String(v??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const column=n=>{let s='';for(;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
const mean=values=>{const a=values.filter(v=>typeof v==='number'&&Number.isFinite(v));return a.length?a.reduce((a,b)=>a+b,0)/a.length:null;};
function styleAt(sheet,address,fallback=2){return Number(sheet.match(new RegExp('<x:c r="'+address+'" s="(\\d+)"'))?.[1]??fallback);}
function cell(address,value,style=2,formula){
 const attrs=`r="${address}" s="${style}"`;
 if(formula){const numeric=typeof value==='number'&&Number.isFinite(value);return `<x:c ${attrs} t="${numeric?'n':'str'}"><x:f>${xml(formula)}</x:f><x:v>${xml(value)}</x:v></x:c>`;}
 if(value===null||value===undefined||value==='')return `<x:c ${attrs}/>`;
 return typeof value==='number'&&Number.isFinite(value)?`<x:c ${attrs} t="n"><x:v>${value}</x:v></x:c>`:`<x:c ${attrs} t="inlineStr"><x:is><x:t xml:space="preserve">${xml(value)}</x:t></x:is></x:c>`;
}
function row(r,cells,height=25){return `<x:row r="${r}" ht="${height}" customHeight="1">${cells.join('')}</x:row>`;}
function commonRows(sheet,title,subtitle){return [row(2,[cell('B2',title,styleAt(sheet,'B2'))],28),row(3,[cell('B3',subtitle,styleAt(sheet,'B3'))])];}
function replaceSheet(template,rows,lastColumn,lastRow,conditional=false){
 let s=template.replace(/<x:sheetData>[\s\S]*?<\/x:sheetData>/,`<x:sheetData>${rows.join('')}</x:sheetData>`);
 s=s.replace(/<x:dimension[^>]*\/>/g,'');
 if(conditional)s=s.replace(/sqref="D6:[A-Z]+8"/g,`sqref="D6:${lastColumn}${Math.max(lastRow,6)}"`);
 // Native AutoFilter is useful without table-style overrides.
 if(conditional)s=s.replace('</x:sheetData>',`</x:sheetData><x:autoFilter ref="B5:${lastColumn}${Math.max(lastRow,5)}"/>`);
 return s;
}
export function buildWorkbookParts(template,p){
 const entries={...template},summary=entries['xl/worksheets/sheet1.xml'],recap=entries['xl/worksheets/sheet2.xml'],daily=entries['xl/worksheets/sheet3.xml'];
 const subtitle=`Miss Bell. English. Class ${p.classId}. ${p.year}. Semester ${p.semester}.`,n=p.students.length,last=Math.max(n+5,6);
 const state={students:p.students,tests:p.tests,scores:p.scores,main:p.main,remedials:p.remedials||[],assessmentStatuses:p.assessmentStatuses||{},targets:{[p.classId+'|'+p.semester]:p.target}};
 const details=(sid,kind,testId='')=>gradeDetails(state,sid,p.semester,kind,testId);
 const sourceRow=(i,j)=>6+i*(p.tests.length+2)+j;
 const history=(p.remedials||[]).filter(r=>r.semester===p.semester&&p.students.some(st=>st.id===r.studentId)).slice().sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt.localeCompare(b.createdAt));
 const values=p.students.map(st=>[...[1,2,3,4].map(lm=>mean(p.tests.filter(t=>t.lm===lm).map(t=>details(st.id,'daily',t.id).final))),details(st.id,'mid').final,details(st.id,'end').final]);
 const avgs=[0,1,2,3,4,5].map(i=>mean(values.map(v=>v[i])));
 const labels=['LM 1','LM 2','LM 3','LM 4','Midterm','Semester test'];
 const sr=commonRows(summary,'English semester overview',subtitle);
 sr.push(row(4,[cell('B4','KKM'),cell('C4',p.target,styleAt(summary,'C4')),cell('E4','Students'),cell('F4',n)]));
 sr.push(row(6,['Assessment','Class average','KKM','Recorded','Below target'].map((v,i)=>cell(column(i+2)+'6',v,styleAt(summary,'B6'))),36));
 for(let i=0;i<6;i++){
  const r=i+7,col=column(i+4),range=`'Recap'!${col}6:${col}${last}`,recorded=values.filter(v=>typeof v[i]==='number').length,below=p.target===null?null:values.filter(v=>typeof v[i]==='number'&&v[i]<p.target).length;
  sr.push(row(r,[cell('B'+r,labels[i]),cell('C'+r,avgs[i],styleAt(summary,'C7'),`IF(COUNT(${range})=0,"",AVERAGE(${range}))`),cell('D'+r,p.target,styleAt(summary,'D7'),'IF(ISNUMBER($C$4),$C$4,"")'),cell('E'+r,recorded,styleAt(summary,'E7'),`COUNT(${range})`),cell('F'+r,below,styleAt(summary,'F7'),`IF(ISNUMBER($C$4),SUM('Recap'!${column(i+11)}6:${column(i+11)}${last}),"")`)]));
 }
 sr.push(row(16,[cell('B16','Blank scores are excluded. Recorded zeros count.',styleAt(summary,'B16'))]),row(17,[cell('B17','KKM is editable in C4. Recap uses final scores. Sources preserve originals.',styleAt(summary,'B17'))]));
 entries['xl/worksheets/sheet1.xml']=replaceSheet(summary,sr,'P',22);
 const rr=commonRows(recap,'English semester recap · final scores',subtitle),dr=commonRows(daily,'English daily scores · originals',subtitle);
 for(const rows of [rr,dr])rows.push(row(4,[cell('D4','KKM'),cell('E4',p.target,2,'IF(ISNUMBER(Summary!$C$4),Summary!$C$4,"")')]));

 rr.push(row(5,['No.','Student','LM 1 average','LM 2 average','LM 3 average','LM 4 average','Midterm','Semester test'].map((v,i)=>cell(column(i+2)+'5',v,styleAt(recap,'B5'))).concat(labels.map((v,i)=>cell(column(i+11)+'5',v,styleAt(recap,'K5')))),38));
 dr.push(row(5,['No.','Student',...p.tests.map(t=>`LM ${t.lm} K${t.competency}\n${t.name}`)].map((v,i)=>cell(column(i+2)+'5',v,styleAt(daily,'B5'))),60));
 p.students.forEach((st,i)=>{
  const r=i+6,cells=[cell('B'+r,i+1),cell('C'+r,st.name,styleAt(recap,'C6'))];
  for(let lm=1;lm<=4;lm++){
   const refs=p.tests.map((t,j)=>t.lm===lm?`'Grade sources'!F${sourceRow(i,j)}`:null).filter(Boolean),list=refs.join(',');
   cells.push(cell(column(lm+3)+r,values[i][lm-1],styleAt(recap,'D6'),refs.length?`IF(COUNT(${list})=0,"",AVERAGE(${list}))`:'""'));
  }
  cells.push(cell('H'+r,values[i][4],styleAt(recap,'H6'),`IF(ISNUMBER('Grade sources'!F${sourceRow(i,p.tests.length)}),'Grade sources'!F${sourceRow(i,p.tests.length)},"")`),cell('I'+r,values[i][5],styleAt(recap,'I6'),`IF(ISNUMBER('Grade sources'!F${sourceRow(i,p.tests.length+1)}),'Grade sources'!F${sourceRow(i,p.tests.length+1)},"")`));
  for(let j=0;j<6;j++){const ref=column(j+4)+r,flag=p.target===null||values[i][j]===null?null:values[i][j]<p.target?1:0;cells.push(cell(column(j+11)+r,flag,2,`IF(ISNUMBER(${ref}),IF(ISNUMBER($E$4),IF(${ref}<$E$4,1,0),""),"")`));}
  rr.push(row(r,cells,Math.max(25,Math.ceil(st.name.length/30)*16+7)));
  dr.push(row(r,[cell('B'+r,i+1),cell('C'+r,st.name,styleAt(daily,'C6')),...p.tests.map((t,j)=>cell(column(j+4)+r,p.scores[st.id+'|'+t.id]??null,styleAt(daily,'D6')))],Math.max(25,Math.ceil(st.name.length/30)*16+7)));
 });
 entries['xl/worksheets/sheet2.xml']=replaceSheet(recap,rr,'I',n+5,true);
 const dc=column(Math.max(4,p.tests.length+3));let ds=replaceSheet(daily,dr,dc,n+5,true);
 // Daily test columns grow without losing the workbook's header/score styles.
 ds=ds.replace(/<x:cols>[\s\S]*?<\/x:cols>/,`<x:cols><x:col min="1" max="1" width="3" customWidth="1"/><x:col min="2" max="2" width="7" customWidth="1"/><x:col min="3" max="3" width="32" customWidth="1"/><x:col min="4" max="${Math.max(4,p.tests.length+3)}" width="19" customWidth="1"/></x:cols>`);
 entries['xl/worksheets/sheet3.xml']=ds;
 entries['xl/worksheets/sheet2.xml']=entries['xl/worksheets/sheet2.xml'].replace('width="28"','width="32"');
 for(const name of Object.keys(entries))if(/chart\d+\.xml$/.test(name)){
  let chart=entries[name],series=0;
  chart=chart.replace(/<c:ser>[\s\S]*?<\/c:ser>/g,ser=>{
   const vals=series++===0?avgs:Array(6).fill(p.target);
   ser=ser.replace(/<c:strCache>[\s\S]*?<\/c:strCache>/g,`<c:strCache><c:ptCount val="6"/>${labels.map((v,i)=>`<c:pt idx="${i}"><c:v>${xml(v)}</c:v></c:pt>`).join('')}</c:strCache>`);
   return ser.replace(/<c:numCache>[\s\S]*?<\/c:numCache>/g,`<c:numCache><c:formatCode>0.0</c:formatCode><c:ptCount val="6"/>${vals.map((v,i)=>typeof v==='number'?`<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`:'').join('')}</c:numCache>`);
  });
  chart=chart.replace(/<c:valAx>([\s\S]*?)<c:scaling>[\s\S]*?<\/c:scaling>/,'<c:valAx>$1<c:scaling><c:orientation val="minMax"/><c:max val="100"/><c:min val="0"/></c:scaling>');entries[name]=chart;
 }
 const sources=entries['xl/worksheets/sheet4.xml'],attempts=entries['xl/worksheets/sheet5.xml'];
 const gr=commonRows(sources,'Original and final assessment scores',subtitle),hr=commonRows(attempts,'Remedial attempts',subtitle);
 gr.push(row(4,[cell('B4','Daily originals link to Daily scores. Main-test originals are editable in D. Final = KKM after a successful remedial.')]));
 gr.push(row(5,['Student','Assessment','Original','Latest remedial','Final','Assessment status','Remedial date','Recorded status'].map((v,i)=>cell(column(i+2)+'5',v,styleAt(sources,'B5'))),40));
 hr.push(row(4,[cell('B4','All recorded remedial attempts for this class and semester. The latest date, then entry time, determines the active attempt.')]));
 hr.push(row(5,['Student','Assessment','Date','Score','Private note'].map((v,i)=>cell(column(i+2)+'5',v,styleAt(attempts,'B5'))),38));
 const serial=date=>Math.round((Date.parse(date+'T00:00:00Z')-Date.UTC(1899,11,30))/86400000);
 history.forEach((r,i)=>{const test=p.tests.find(t=>t.id===r.testId),label=r.kind==='daily'?`LM ${test?.lm||''} K${test?.competency||''}: ${test?.name||'Daily test'}`:r.kind==='mid'?'Midterm':'End-of-semester',n=i+6;hr.push(row(n,[cell('B'+n,p.students.find(s=>s.id===r.studentId)?.name,styleAt(attempts,'B6')),cell('C'+n,label,styleAt(attempts,'C6')),cell('D'+n,serial(r.date),styleAt(attempts,'D6')),cell('E'+n,r.score,styleAt(attempts,'E6')),cell('F'+n,r.note||'',styleAt(attempts,'F6'))],Math.max(30,Math.ceil((r.note||'').length/60)*16+8)));});
 p.students.forEach((st,i)=>{
  const assessments=[...p.tests.map(t=>({kind:'daily',testId:t.id,label:`LM ${t.lm} K${t.competency}: ${t.name}`})),{kind:'mid',label:'Midterm'},{kind:'end',label:'End-of-semester'}];
  assessments.forEach((a,j)=>{
   const r=sourceRow(i,j),g=details(st.id,a.kind,a.testId),original=a.kind==='daily'?`'Daily scores'!${column(j+4)}${i+6}`:null;
   const latestIndex=g.attempt?history.findIndex(h=>h.id===g.attempt.id):-1,remedialRef=latestIndex>=0?`'Remedial history'!E${latestIndex+6}`:null;
   const passed=`AND(ISNUMBER(Summary!$C$4),D${r}<Summary!$C$4,ISNUMBER(E${r}),E${r}>=Summary!$C$4)`;
   const formula=`IF(ISNUMBER(D${r}),IF(${passed},Summary!$C$4,D${r}),"")`;
   const status=`IF(ISNUMBER(F${r}),IF(OR(AND(ISNUMBER(Summary!$C$4),F${r}<Summary!$C$4),AND(I${r}="needs_remedial",NOT(${passed}))),"Needs remedial","Assessed"),IF(I${r}="absent","Absent","Not assessed"))`;
   gr.push(row(r,[cell('B'+r,st.name,styleAt(sources,'B6')),cell('C'+r,a.label,styleAt(sources,'C6')),cell('D'+r,g.original,styleAt(sources,'D6'),original?`IF(ISNUMBER(${original}),${original},"")`:undefined),cell('E'+r,g.attempt?.score??null,styleAt(sources,'E6'),remedialRef?`IF(ISNUMBER(${remedialRef}),${remedialRef},"")`:undefined),cell('F'+r,g.final,styleAt(sources,'F6'),formula),cell('G'+r,{not_assessed:'Not assessed',absent:'Absent',needs_remedial:'Needs remedial',assessed:'Assessed'}[g.status],styleAt(sources,'G6'),status),cell('H'+r,g.attempt?serial(g.attempt.date):null,styleAt(sources,'H6')),cell('I'+r,p.assessmentStatuses?.[g.key]||'',styleAt(sources,'I6'))],Math.max(32,Math.ceil(Math.max(st.name.length/30,a.label.length/32))*16+8)));
  });
 });
 entries['xl/worksheets/sheet4.xml']=replaceSheet(sources,gr,'I',Math.max(5,5+p.students.length*(p.tests.length+2))).replace('</x:sheetData>',`</x:sheetData><x:autoFilter ref="B5:I${Math.max(5,5+p.students.length*(p.tests.length+2))}"/>`);
 entries['xl/worksheets/sheet5.xml']=replaceSheet(attempts,hr,'F',Math.max(5,5+history.length)).replace('</x:sheetData>',`</x:sheetData><x:autoFilter ref="B5:F${Math.max(5,5+history.length)}"/>`);
 // Force recalculation when opened; cached formula and chart values already match this export.
 entries['xl/workbook.xml']=entries['xl/workbook.xml'].replace(/<x:calcPr[^>]*\/>/,'').replace('</x:workbook>','<x:calcPr calcId="191029" fullCalcOnLoad="1"/></x:workbook>');
 return entries;
}
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xEDB88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let n=0xFFFFFFFF;for(const b of bytes)n=crcTable[(n^b)&255]^(n>>>8);return (n^0xFFFFFFFF)>>>0;}
export function zipWorkbook(entries){
 const enc=new TextEncoder(),local=[],central=[];let offset=0;
 const block=(size,write)=>{const bytes=new Uint8Array(size);write(new DataView(bytes.buffer));return bytes;};
 for(const [name,xml] of Object.entries(entries)){
  const filename=enc.encode(name),data=enc.encode(xml),crc=crc32(data);
  const header=block(30,v=>{v.setUint32(0,0x04034B50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,filename.length,true);});
  local.push(header,filename,data);
  const record=block(46,v=>{v.setUint32(0,0x02014B50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x800,true);v.setUint32(16,crc,true);v.setUint32(20,data.length,true);v.setUint32(24,data.length,true);v.setUint16(28,filename.length,true);v.setUint32(42,offset,true);});
  central.push(record,filename);offset+=header.length+filename.length+data.length;
 }
 const count=Object.keys(entries).length,length=central.reduce((n,b)=>n+b.length,0),end=block(22,v=>{v.setUint32(0,0x06054B50,true);v.setUint16(8,count,true);v.setUint16(10,count,true);v.setUint32(12,length,true);v.setUint32(16,offset,true);});
 const all=[...local,...central,end],result=new Uint8Array(offset+length+22);let pos=0;for(const part of all){result.set(part,pos);pos+=part.length;}return result;
}
export async function exportWorkbook(payload){
 const response=await fetch(new URL('./excel-template.json?v=6',import.meta.url));if(!response.ok)throw new Error('Could not load the Excel template. Refresh after deployment completes.');
 const parts=buildWorkbookParts(await response.json(),payload),bytes=zipWorkbook(parts),url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
 const a=document.createElement('a');a.href=url;a.download=`Miss-Bell-English-${payload.year.replace(/[^0-9A-Za-z-]/g,'-')}-${payload.classId}-Semester-${payload.semester}.xlsx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
