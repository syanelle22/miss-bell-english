// Whitelisted classroom content. No student records or scores enter this projection.
import {safeAttachment} from './school-model.js?v=6';
export const isReleased=(item,now=Date.now())=>item.status!=='draft'&&(item.status!=='scheduled'||(Number.isFinite(Date.parse(item.publishAt))&&Date.parse(item.publishAt)<=now));
export function publicItem(kind,x){
 const base={id:x.id,updatedAt:x.updatedAt||x.date||'',document:safeAttachment(x.document)};
 if(kind==='announcements')return {...base,text:x.text,date:x.date,pinned:!!x.pinned,expires:x.expires||''};
 if(kind==='assignments')return {...base,title:x.title,due:x.due,lm:x.lm,instructions:x.instructions};
 if(kind==='tests')return {...base,title:x.title||x.name,date:x.date,type:x.type||'daily',lm:x.lm,topic:x.topic||`LM ${x.lm} · Competency ${x.competency}`,notes:x.notes||''};
 if(kind==='learningPlans')return {...base,weekStart:x.weekStart,topic:x.topic,practice:x.practice};
 if(kind==='vocabulary')return {...base,weekStart:x.weekStart,words:x.words.map(([word,meaning,example])=>[word,meaning,example])};
 throw new Error('Unknown public content type.');
}
export function scheduledContent(state,yearId){
 const out={};for(const [field,kind] of [['announcements','announcements'],['assignments','assignments'],['events','tests'],['tests','tests'],['learningPlans','learningPlans'],['vocabulary','vocabulary']])for(const x of state[field]||[]){
 if(x.status!=='scheduled'||state.archivedClasses?.includes(x.classId))continue;
 if(!Number.isFinite(Date.parse(x.publishAt)))throw new Error('A scheduled post needs a valid publication time.');
 const id=yearId+'_'+field+'_'+encodeURIComponent(x.id);out[id]={yearId,classId:x.classId,semester:x.semester,kind,publishAt:x.publishAt,item:publicItem(kind,x)};
 }if(Object.keys(out).length>200)throw new Error('Keep at most 200 scheduled items per school year. Publish or remove older scheduled items first.');return out;
}
export function mergeReleasedPage(page,records){const out=structuredClone(page);for(const kind of ['announcements','assignments','tests','learningPlans','vocabulary']){const map=new Map((out[kind]||[]).map(x=>[x.id,x]));for(const r of records)if(r.kind===kind)map.set(r.item.id,r.item);out[kind]=[...map.values()];}return out;}
