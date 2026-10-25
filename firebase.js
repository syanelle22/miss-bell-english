import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged,setPersistence,browserSessionPersistence} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {getFirestore,doc,runTransaction,onSnapshot,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
import {CLASS_IDS,splitPrivate,publicPage} from './cloud-model.js';
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
let revision=0,knownPrivate={},knownPublic={};
export const teacherEmail='syawos0@gmail.com';
export function isTeacher(user){return !!user && user.email===teacherEmail && user.emailVerified && user.providerData.some(p=>p.providerId==='google.com');}
export function observeAuth(callback){return onAuthStateChanged(auth,callback);}
export async function login(){await setPersistence(auth,browserSessionPersistence);const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});return signInWithPopup(auth,provider);}
export function logout(){return signOut(auth);}
export async function loadTeacher(){
  const loaded=await runTransaction(db,async tx=>{
    const marker=await tx.get(meta);
    const chunks={};
    for(const c of CLASS_IDS){const snap=await tx.get(doc(db,'teacherData',c));if(snap.exists())chunks[c]=snap.data().json;}
    return {revision:marker.exists()?marker.data().revision:0,chunks};
  });
  revision=loaded.revision;knownPrivate=loaded.chunks;knownPublic={};return loaded.chunks;
}
export async function persist(state){
  const chunks=splitPrivate(state),pages={};
  for(const c of CLASS_IDS)for(const s of [1,2])pages[c+'-'+s]=publicPage(state,c,s);
  const changed=Object.entries(chunks).filter(([c,json])=>knownPrivate[c]!==json);
  const published=Object.entries(pages).filter(([id,page])=>knownPublic[id]!==JSON.stringify(page));
  const expectedRevision=revision;
  await runTransaction(db,async tx=>{
    const marker=await tx.get(meta),remoteRevision=marker.exists()?marker.data().revision:0;
    if(remoteRevision!==expectedRevision)throw new Error('CONFLICT: Data changed in another tab or device. Download a backup, then reload before editing again.');
    tx.set(meta,{revision:expectedRevision+1,updatedAt:serverTimestamp()});
    for(const [c,json] of changed)tx.set(doc(db,'teacherData',c),{json,updatedAt:serverTimestamp()});
    for(const [id,page] of published)tx.set(doc(db,'classPages',id),{...page,updatedAt:serverTimestamp()});
  });
  revision=expectedRevision+1;knownPrivate=chunks;knownPublic=Object.fromEntries(Object.entries(pages).map(([id,p])=>[id,JSON.stringify(p)]));
}
export function observePublic(c,s,success,error){return onSnapshot(doc(db,'classPages',c+'-'+s),snap=>success(snap.exists()?snap.data():null),error);}
