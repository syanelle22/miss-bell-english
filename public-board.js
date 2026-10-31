import {isPublished} from './workflow-model.js?v=6';
import {visibleAnnouncement,sortedAnnouncements} from './final-model.js?v=6';
// Derive assessment announcements from their source, so edits/removals never leave duplicate posts.
export function announcementFeed(notes,assessments,{classId,semester,today,query=''}){
 const matches=x=>x.classId===classId&&x.semester===semester;
 const search=x=>String(x).toLowerCase().includes(query.trim().toLowerCase());
 const seen=new Set();
 const tests=assessments.filter(x=>matches(x)&&isPublished(x)&&x.date>=today&&search([x.title,x.topic,x.notes,x.date].join(' '))).sort((a,b)=>a.date.localeCompare(b.date)).filter(x=>{if(seen.has(x.id))return false;seen.add(x.id);return true;}).map(item=>({kind:'test',item,pinned:true}));
 const announcements=sortedAnnouncements(notes.filter(x=>matches(x)&&visibleAnnouncement(x,today)&&search([x.title,x.text].join(' ')))).map(item=>({kind:'note',item,pinned:!!item.pinned}));
 return [...tests,...announcements];
}
