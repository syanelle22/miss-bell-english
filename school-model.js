export const defaultYear = () => {const d=new Date(),y=d.getMonth()<6?d.getFullYear()-1:d.getFullYear();return `${y}-${y+1}`;};
export const yearLabel = id => String(id).replace('-', '/');
export const validYear = id => /^\d{4}-\d{4}$/.test(id)&&Number(id.slice(5))===Number(id.slice(0,4))+1;
export function safeAttachment(value){
 if(!value?.url)return null;
 try{const u=new URL(value.url);if(u.protocol!=='https:'||u.username||u.password)return null;return {label:String(value.label||'Open document').slice(0,100),url:u.href};}catch{return null;}
}
export function targetFor(data,c,s){const n=data.targets?.[c+'|'+s];return typeof n==='number'&&n>=0&&n<=100?n:null;}
export const belowTarget=(value,target)=>typeof value==='number'&&Number.isFinite(value)&&target!==null&&value<target;
export function copyToClasses(item,selected,archived,newId){
 const ids=[...new Set(selected)].filter(c=>c!==item.classId&&!archived.includes(c));
 return ids.map(classId=>({...structuredClone(item),id:newId(),classId}));
}
