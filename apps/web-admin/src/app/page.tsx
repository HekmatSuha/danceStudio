import React, { Suspense } from 'react';
import { DanceStyleSearch } from '../components/DanceStyleSearch';
import { About } from '../components/About';
import { Classes } from '../components/Classes';
import { Instructors } from '../components/Instructors';
import { Contact } from '../components/Contact';
import { Navigation } from '../components/Navigation';
import { BookingRequest } from '../components/BookingRequest';

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading search...</div>}>
        <DanceStyleSearch />
      </Suspense>
      <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading classes...</div>}>
        <Classes />
      </Suspense>
      <About />
      <Instructors />
      <BookingRequest />
      <Contact />
    </div>
  );
}
