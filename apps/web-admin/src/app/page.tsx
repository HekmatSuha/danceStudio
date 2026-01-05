import React from 'react';
import { Hero } from '../components/Hero';
import { About } from '../components/About';
import { Classes } from '../components/Classes';
import { Schedule } from '../components/Schedule';
import { Instructors } from '../components/Instructors';
import { Contact } from '../components/Contact';
import { Navigation } from '../components/Navigation';
import { BookingRequest } from '../components/BookingRequest';

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <Hero />
      <About />
      <Classes />
      <Schedule />
      <Instructors />
      <BookingRequest />
      <Contact />
    </div>
  );
}
