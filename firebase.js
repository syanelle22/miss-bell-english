import {scheduledContent,mergeReleasedPage} from './release-model.js?v=6';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged,setPersistence,browserSessionPersistence} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {getFirestore,doc,runTransaction,onSnapshot,serverTimestamp,Timestamp,getDocFromServer} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
import {CLASS_IDS,splitPrivate,publicPage} from './cloud-model.js?v=6';
import {defaultYear,yearLabel,validYear} from './school-model.js?v=6';
const firebaseConfig = {
  apiKey: 'AIzaSyAJ1d0lFEMH15iAVHfp2NI91hCVISXoNNQ',
  authDomain: 'miss-bell-s-english-classes.firebaseapp.com',
  projectId: 'miss-bell-s-english-classes',
  storageBucket: 'miss-bell-s-english-classes.firebasestorage.app',
  messagingSenderId: '902494203937',
  appId: '1:902494203937:web:ca01e66b3e7ec5dcbf7360'
};
const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app);
const meta=doc(db,'teacherData','meta');
let scheduleRefs={},revision=0,knownPrivate={},knownPublic={},knownYear="";
export const teacherEmail='syawos0@gmail.com';
export function isTeacher(user){return !!user && user.email===teacherEmail && user.emailVerified && user.providerData.some(p=>p.providerId==='google.com');}
export function observeAuth(callback){return onAuthStateChanged(auth,callback);}
export async function login(){await setPersistence(auth,browserSessionPersistence);const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});return signInWithPopup(auth,provider);}
export function logout(){return signOut(auth);}
export async function loadTeacher(requestedYear){
 const loaded=await runTransaction(db,async tx=>{
  const marker=await tx.get(meta),metadata=marker.exists()?marker.data():{};
  const legacy=metadata.schema!==2;
  const years=legacy?[{id:defaultYear(),label:yearLabel(defaultYear()),archived:false,storage:'legacy'}]:metadata.years;
  const activeYear=legacy?years[0].id:metadata.activeYear;
  const year=requestedYear||activeYear,entry=years.find(y=>y.id===year);
  if(!entry||!validYear(year))throw new Error('School year not found.');
  const chunks={};
  for(const c of CLASS_IDS){const key=entry.storage==='legacy'?c:'y-'+year+'-'+c;const snap=await tx.get(doc(db,'teacherData',key));if(snap.exists())chunks[c]=snap.data().json;}
  return {scheduleRefs:metadata.scheduleRefs||{},revision:metadata.revision||0,chunks,years,activeYear,year,legacy:entry.storage==='legacy'};
 });
 scheduleRefs=loaded.scheduleRefs;revision=loaded.revision;knownYear=loaded.year;knownPrivate=loaded.legacy?{}:loaded.chunks;knownPublic={};return loaded;
}
export async function persist(state,context){
 if(!context||!validYear(context.year))throw new Error('Choose a valid school year.');
 const chunks=splitPrivate(state),pages={},scheduled=scheduledContent(state,context.year);
 const active=context.year===context.activeYear;
 const entry=context.years.find(y=>y.id===context.year);
 if(!entry)throw new Error('School year not found.');
 if(active&&entry.archived)throw new Error('Restore a year before making it active.');
 if(active)for(const c of CLASS_IDS)for(const s of [1,2])pages[c+'-'+s]={...publicPage(state,c,s,entry.label,entry.defaultSemester===2?2:1),scheduledRefs:Object.entries(scheduled).filter(([,r])=>r.classId===c&&r.semester===s).map(([id,r])=>({id,publishAt:r.publishAt,revision:revision+1}))};
 const changed=Object.entries(chunks).filter(([c,json])=>context.year!==knownYear||knownPrivate[c]!==json);
 const published=Object.entries(pages).filter(([id,page])=>knownPublic[id]!==JSON.stringify(page));
 const expectedRevision=revision;
 const years=context.years.map(y=>({...y,storage:y.id===context.year?'year':y.storage}));
 await runTransaction(db,async tx=>{
  const marker=await tx.get(meta),remoteRevision=marker.exists()?marker.data().revision:0;
  if(remoteRevision!==expectedRevision)throw new Error('CONFLICT: Data changed in another tab or device. Download a backup, then reload before editing again.');
  tx.set(meta,{schema:2,featureVersion:6,revision:expectedRevision+1,years,activeYear:context.activeYear,scheduleRefs:{...scheduleRefs,[context.year]:Object.keys(scheduled)},updatedAt:serverTimestamp()});
  for(const id of scheduleRefs[context.year]||[])if(!scheduled[id])tx.delete(doc(db,'scheduledContent',id));
  for(const [id,r] of Object.entries(scheduled))tx.set(doc(db,'scheduledContent',id),{...r,publishAt:Timestamp.fromDate(new Date(r.publishAt))});
  for(const [c,json] of changed)tx.set(doc(db,'teacherData','y-'+context.year+'-'+c),{json,updatedAt:serverTimestamp()});
  for(const [id,page] of published)tx.set(doc(db,'classPages',id),{...page,updatedAt:serverTimestamp()});
 });
 scheduleRefs={...scheduleRefs,[context.year]:Object.keys(scheduled)};revision=expectedRevision+1;knownYear=context.year;knownPrivate=chunks;knownPublic=Object.fromEntries(Object.entries(pages).map(([id,p])=>[id,JSON.stringify(p)]));
 context.years=years;
}
export function observePublic(c,s,success,error){
 let closed=false,base=null,generation=0,timer=null,released=new Map(),pending=new Set(),fetched=new Set();
 const emit=()=>{if(!closed)success(base?mergeReleasedPage(base,[...released.values()]):null);};
 const attachDue=()=>{if(closed||!base)return;for(const ref of base.scheduledRefs||[]){if(fetched.has(ref.id)||pending.has(ref.id)||Date.parse(ref.publishAt)>Date.now())continue;pending.add(ref.id);const current=generation;
 getDocFromServer(doc(db,'scheduledContent',ref.id)).then(snap=>{if(closed||current!==generation)return;pending.delete(ref.id);fetched.add(ref.id);if(snap.exists()){const r=snap.data();if(r.classId===c&&r.semester===s)released.set(ref.id,r);}else released.delete(ref.id);emit();}).catch(()=>{if(closed||current!==generation)return;pending.delete(ref.id);released.delete(ref.id);emit();});
 }};
 const stop=onSnapshot(doc(db,'classPages',c+'-'+s),snap=>{if(closed)return;generation++;pending.clear();fetched.clear();released.clear();base=snap.exists()?snap.data():null;emit();attachDue();},error);
 timer=setInterval(attachDue,15000);return ()=>{closed=true;clearInterval(timer);stop();};
}
