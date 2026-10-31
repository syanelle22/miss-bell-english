// Local-only roster reader. Files never leave the browser.
const MAX=10*1024*1024,EXPANDED=40*1024*1024;
export function parseDelimited(text){
 text=text.replace(/^\uFEFF/,'');let separator;
 const declaration=text.match(/^sep=(.)\r?\n/i);if(declaration){separator=declaration[1];text=text.slice(declaration[0].length);}
 if(!separator){const first=text.split(/\r?\n/)[0];separator=['\t',';',','].sort((a,b)=>first.split(b).length-first.split(a).length)[0];}
 const rows=[];let row=[],value='',quoted=false,closed=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];if(quoted){if(ch==='"'){if(text[i+1]==='"'){value+='"';i++;}else{quoted=false;closed=true;}}else value+=ch;}
  else if(ch==='"'&&!value&&!closed)quoted=true;
  else if(ch===separator){row.push(value);value='';closed=false;}
  else if(ch==='\r'||ch==='\n'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(value);rows.push(row);row=[];value='';closed=false;}
  else{if(closed&&ch.trim())throw new Error('Invalid CSV quotation. Export again as CSV UTF-8.');value+=ch;}
 }
 if(quoted)throw new Error('A CSV quote is not closed.');if(value||row.length){row.push(value);rows.push(row);}return rows;
}
export function rosterRows(matrix){
 matrix=matrix.filter(row=>row.some(v=>String(v??'').trim()));
 if(!matrix.length)throw new Error('The file is empty.');
 const norm=v=>String(v??'').trim().toLowerCase().replace(/[ _-]+/g,' ');
 const headers=matrix[0].map(norm),names=['name','nama','nama siswa','student','student name'];
 const ni=headers.findIndex(h=>names.includes(h)),ci=headers.findIndex(h=>['class','kelas','class id'].includes(h));
 if(ni<0)throw new Error('Add a Name or Nama siswa column header in the first row. An optional Class or Kelas column can assign classes.');
 if(matrix.length>5001)throw new Error('Import up to 5,000 students at once.');
 return matrix.slice(1).map((row,i)=>({name:row[ni]??'',classId:ci>=0?row[ci]??'':'',line:i+2}));
}
function xml(text){const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.querySelector('parsererror'))throw new Error('Invalid Excel XML. Save again as .xlsx.');return doc;}
const elements=(node,tag)=>[...node.getElementsByTagNameNS('*',tag)];
const textNodes=node=>elements(node,'t').map(t=>t.textContent).join('');
export async function readXlsx(buffer){
 const bytes=new Uint8Array(buffer),dv=new DataView(buffer);let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(dv.getUint32(i,true)===0x06054b50){end=i;break;}
 if(end<0)throw new Error('Not a valid .xlsx file. Old .xls files must be saved as .xlsx.');
 const count=dv.getUint16(end+10,true),offset=dv.getUint32(end+16,true);if(count>2000)throw new Error('Workbook contains too many files.');
 const entries=new Map();let pos=offset,total=0;
 for(let n=0;n<count;n++){
  if(pos+46>bytes.length||dv.getUint32(pos,true)!==0x02014b50)throw new Error('Invalid Excel archive.');
  const flags=dv.getUint16(pos+8,true),method=dv.getUint16(pos+10,true),packed=dv.getUint32(pos+20,true),size=dv.getUint32(pos+24,true),nl=dv.getUint16(pos+28,true),el=dv.getUint16(pos+30,true),cl=dv.getUint16(pos+32,true),local=dv.getUint32(pos+42,true);
  total+=size;if(total>EXPANDED||size>EXPANDED)throw new Error('Workbook is too large after extraction. Use a simple roster workbook.');
  if(flags&1)throw new Error('Password-protected Excel files are not supported.');
  const name=new TextDecoder().decode(bytes.slice(pos+46,pos+46+nl));
  entries.set(name,{method,packed,size,local});pos+=46+nl+el+cl;
 }
 async function read(path){
  const entry=entries.get(path);if(!entry)throw new Error('Missing Excel file: '+path);
  const {method,packed,size,local}=entry;
  if(local+30>bytes.length||dv.getUint32(local,true)!==0x04034b50)throw new Error('Invalid Excel archive entry.');
  const start=local+30+dv.getUint16(local+26,true)+dv.getUint16(local+28,true);if(start+packed>bytes.length)throw new Error('Truncated Excel file.');
  const compressed=bytes.slice(start,start+packed);let output;
  if(method===0)output=compressed;
  else if(method===8){
   let stream;try{stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));}catch{throw new Error('This browser cannot read compressed Excel files. Update Chrome or save the roster as CSV UTF-8.');}
   const reader=stream.getReader(),parts=[];let length=0;
   for(;;){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>size||length>EXPANDED){await reader.cancel();throw new Error('Excel extraction limit exceeded.');}parts.push(value);}
   output=new Uint8Array(length);let at=0;for(const p of parts){output.set(p,at);at+=p.length;}
  }else throw new Error('Unsupported Excel compression. Save as CSV UTF-8.');
  if(output.length!==size)throw new Error('Invalid Excel entry size.');return new TextDecoder().decode(output);
 }
 const workbook=xml(await read('xl/workbook.xml')),relationships=xml(await read('xl/_rels/workbook.xml.rels'));
 const sheet=elements(workbook,'sheet')[0];if(!sheet)throw new Error('No worksheet in this workbook.');
 const rid=sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||sheet.getAttribute('r:id');
 const rel=elements(relationships,'Relationship').find(r=>r.getAttribute('Id')===rid);
 if(!rel||rel.getAttribute('TargetMode')==='External')throw new Error('Worksheet link is invalid.');
 const segments=('xl/'+rel.getAttribute('Target')).replace(/^xl\/\//,'').split('/'),path=[];
 for(const p of segments){if(p==='..')path.pop();else if(p&&p!=='.')path.push(p);}
 const shared=entries.has('xl/sharedStrings.xml')?elements(xml(await read('xl/sharedStrings.xml')),'si').map(textNodes):[];
 const doc=xml(await read(path.join('/'))),matrix=[];
 for(const row of elements(doc,'row')){
  const values=[];for(const cell of elements(row,'c')){
   const reference=cell.getAttribute('r')||'',letters=reference.match(/^[A-Z]+/)?.[0];if(!letters)throw new Error('Excel cell address is invalid.');
   const index=[...letters].reduce((v,l)=>v*26+l.charCodeAt(0)-64,0)-1;if(index>100)throw new Error('Use a simple roster with at most 101 columns.');
   if(elements(cell,'f').length)throw new Error('The roster contains formulas. Copy and paste values into a new workbook before importing.');
   const value=elements(cell,'v')[0]?.textContent||'',type=cell.getAttribute('t');
   values[index]=type==='s'?shared[Number(value)]||'':type==='inlineStr'?textNodes(cell):value;
  }
  matrix.push(values);if(matrix.length>5001)throw new Error('Import up to 5,000 students at once.');
 }
 return {matrix,sheetName:sheet.getAttribute('name')||'First sheet'};
}
export async function readRosterFile(file){
 if(file.size>MAX)throw new Error('Maximum file size is 10 MB.');
 const ext=file.name.split('.').pop().toLowerCase();
 if(ext==='xlsx'){const result=await readXlsx(await file.arrayBuffer());return {rows:rosterRows(result.matrix),sheetName:result.sheetName};}
 if(['csv','tsv'].includes(ext))return {rows:rosterRows(parseDelimited(await file.text())),sheetName:'CSV / TSV'};
 throw new Error('Choose .xlsx, .csv, or .tsv. Save older .xls files as .xlsx first.');
}
