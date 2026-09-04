import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import config from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp({
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId
});

const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  console.log('Testing Firebase connection...');
  const testEmailA = `test_a_${Date.now()}@example.com`;
  const testEmailB = `test_b_${Date.now()}@example.com`;
  const password = 'Password123!';

  console.log('1. Creating Account A:', testEmailA);
  const credA = await createUserWithEmailAndPassword(auth, testEmailA, password);
  const uidA = credA.user.uid;
  console.log('Account A UID:', uidA);

  console.log('2. Writing Account A profile to /users/' + uidA);
  await setDoc(doc(db, 'users', uidA), {
    id: uidA,
    uid: uidA,
    displayName: 'Account A Real',
    username: `user_a_${Date.now()}`,
    email: testEmailA,
    createdAt: new Date().toISOString()
  });

  console.log('3. Reading Account A profile from Firestore...');
  const snapA = await getDoc(doc(db, 'users', uidA));
  console.log('Profile A data:', snapA.data());

  console.log('4. Signing out A and Creating Account B:', testEmailB);
  await signOut(auth);

  const credB = await createUserWithEmailAndPassword(auth, testEmailB, password);
  const uidB = credB.user.uid;
  console.log('Account B UID:', uidB);

  console.log('5. Writing Account B profile to /users/' + uidB);
  await setDoc(doc(db, 'users', uidB), {
    id: uidB,
    uid: uidB,
    displayName: 'Account B Real',
    username: `user_b_${Date.now()}`,
    email: testEmailB,
    createdAt: new Date().toISOString()
  });

  console.log('6. Account B searching for Account A in Firestore...');
  const searchQ = query(collection(db, 'users'), where('email', '==', testEmailA));
  const searchRes = await getDocs(searchQ);
  console.log('Search found docs:', searchRes.size);
  searchRes.forEach(d => console.log('Found user:', d.id, d.data().displayName));

  console.log('7. Account B creating chat with Account A...');
  const chatId = [uidA, uidB].sort().join('_');
  await setDoc(doc(db, 'chats', chatId), {
    id: chatId,
    type: 'direct',
    participants: [uidA, uidB],
    createdAt: new Date().toISOString(),
    lastMessage: null
  });

  console.log('8. Account B sending message in chat...');
  const msgRef = await addDoc(collection(db, 'chats', chatId, 'messages'), {
    chatId,
    senderId: uidB,
    text: 'Hello from Account B to Account A',
    createdAt: new Date().toISOString(),
    status: 'sent'
  });
  console.log('Message sent with ID:', msgRef.id);

  console.log('9. Switching back to Account A...');
  await signOut(auth);
  await signInWithEmailAndPassword(auth, testEmailA, password);

  console.log('10. Account A reading message from Firestore...');
  const msgsSnap = await getDocs(collection(db, 'chats', chatId, 'messages'));
  console.log('Account A received messages count:', msgsSnap.size);
  msgsSnap.forEach(d => console.log('Msg:', d.id, d.data()));

  console.log('11. Account A replying to Account B...');
  const replyRef = await addDoc(collection(db, 'chats', chatId, 'messages'), {
    chatId,
    senderId: uidA,
    text: 'Hello back from Account A to Account B',
    createdAt: new Date().toISOString(),
    status: 'sent'
  });
  console.log('Reply sent with ID:', replyRef.id);

  console.log('REAL FIREBASE TEST PASSED SUCCESSFULLY!');
  process.exit(0);
}

run().catch(err => {
  console.error('Test Failed with Error:', err);
  process.exit(1);
});
