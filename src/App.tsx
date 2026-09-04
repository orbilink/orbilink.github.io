import React, { useState } from 'react';
import { CURRENT_USER } from './services/mockStorage';
import { User } from './types';
import { MainMessenger } from './pages/MainMessenger';
import { AuthPage } from './pages/AuthPage';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(CURRENT_USER);

  if (!currentUser) {
    return <AuthPage onLogin={(u) => setCurrentUser(u)} />;
  }

  return (
    <MainMessenger
      currentUser={currentUser}
      onLogout={() => setCurrentUser(null)}
    />
  );
}

export default App;
