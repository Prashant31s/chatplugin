'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ChatWindow from './components/ChatWindow'; // Adjust the path if needed

// Main Home component
const Home = () => {
  const searchParams = useSearchParams();
  const [appId, setAppId] = useState('default-app-id');
  const [roomId,setRoomId]= useState('room15');
  const [userid,setUserId]= useState('CATCHER001');

  useEffect(() => {
    const appIdFromUrl = searchParams.get('appId');
    const roomIdFromUrl=searchParams.get('roomId');
    const userFromUrl= searchParams.get('userid');
    if (appIdFromUrl) {
      setAppId(appIdFromUrl);
      setRoomId(roomIdFromUrl);
      setUserId(userFromUrl);
    }
  }, [searchParams]);

  console.log("AppId being used:", appId);

  return (
    <div className='h-100%'>
      <ChatWindow userid={userid}/>
    </div>
  );
};

// Fallback UI while loading
const LoadingFallback = () => <div>Loading chat...</div>;

// Wrapping Home component with Suspense in HomePage
export default function HomePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Home />
    </Suspense>
  );
}