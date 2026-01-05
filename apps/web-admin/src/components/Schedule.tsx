"use client";

import React, { useState } from 'react';
import { Calendar } from 'lucide-react';

export function Schedule() {
  const [selectedDay, setSelectedDay] = useState('Monday');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const schedule = {
    Monday: [
      { time: '9:00 AM', class: 'Ballet Basics', instructor: 'Emma Wilson', level: 'Beginner' },
      { time: '11:00 AM', class: 'Contemporary', instructor: 'Marcus Lee', level: 'Intermediate' },
      { time: '4:00 PM', class: 'Kids Jazz', instructor: 'Sarah Johnson', level: 'Kids' },
      { time: '6:00 PM', class: 'Hip-Hop', instructor: 'Jordan Smith', level: 'All Levels' },
    ],
    Tuesday: [
      { time: '10:00 AM', class: 'Jazz Technique', instructor: 'Sarah Johnson', level: 'Intermediate' },
      { time: '12:00 PM', class: 'Ballet', instructor: 'Emma Wilson', level: 'Advanced' },
      { time: '5:00 PM', class: 'Contemporary', instructor: 'Marcus Lee', level: 'Beginner' },
      { time: '7:00 PM', class: 'Hip-Hop Fusion', instructor: 'Jordan Smith', level: 'Intermediate' },
    ],
    Wednesday: [
      { time: '9:00 AM', class: 'Ballet Basics', instructor: 'Emma Wilson', level: 'Beginner' },
      { time: '11:00 AM', class: 'Modern Dance', instructor: 'Marcus Lee', level: 'All Levels' },
      { time: '4:00 PM', class: 'Kids Ballet', instructor: 'Emma Wilson', level: 'Kids' },
      { time: '6:00 PM', class: 'Jazz', instructor: 'Sarah Johnson', level: 'Beginner' },
    ],
    Thursday: [
      { time: '10:00 AM', class: 'Contemporary', instructor: 'Marcus Lee', level: 'Advanced' },
      { time: '12:00 PM', class: 'Hip-Hop', instructor: 'Jordan Smith', level: 'Beginner' },
      { time: '5:00 PM', class: 'Ballet', instructor: 'Emma Wilson', level: 'Intermediate' },
      { time: '7:00 PM', class: 'Jazz Funk', instructor: 'Sarah Johnson', level: 'All Levels' },
    ],
    Friday: [
      { time: '9:00 AM', class: 'Ballet', instructor: 'Emma Wilson', level: 'All Levels' },
      { time: '11:00 AM', class: 'Hip-Hop', instructor: 'Jordan Smith', level: 'Intermediate' },
      { time: '4:00 PM', class: 'Kids Hip-Hop', instructor: 'Jordan Smith', level: 'Kids' },
      { time: '6:00 PM', class: 'Contemporary', instructor: 'Marcus Lee', level: 'Beginner' },
    ],
    Saturday: [
      { time: '9:00 AM', class: 'Ballet Workshop', instructor: 'Emma Wilson', level: 'All Levels' },
      { time: '11:00 AM', class: 'Hip-Hop Workshop', instructor: 'Jordan Smith', level: 'All Levels' },
      { time: '2:00 PM', class: 'Contemporary Workshop', instructor: 'Marcus Lee', level: 'All Levels' },
      { time: '4:00 PM', class: 'Jazz Workshop', instructor: 'Sarah Johnson', level: 'All Levels' },
    ],
    Sunday: [
      { time: '10:00 AM', class: 'Open Practice', instructor: 'All Instructors', level: 'All Levels' },
      { time: '2:00 PM', class: 'Stretch & Flexibility', instructor: 'Emma Wilson', level: 'All Levels' },
      { time: '4:00 PM', class: 'Choreography Session', instructor: 'Marcus Lee', level: 'Intermediate' },
    ],
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner':
        return 'bg-green-100 text-green-700';
      case 'Intermediate':
        return 'bg-yellow-100 text-yellow-700';
      case 'Advanced':
        return 'bg-red-100 text-red-700';
      case 'Kids':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-purple-100 text-purple-700';
    }
  };

  return (
    <section id="schedule" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
            <Calendar className="text-purple-600" size={32} />
          </div>
          <h2 className="mb-4">Weekly Schedule</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Browse our weekly class schedule and find the perfect time to dance
          </p>
        </div>

        {/* Day Selector */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-6 py-2 rounded-full transition-colors ${
                selectedDay === day
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-purple-50'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Schedule Grid */}
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
          <div className="space-y-4">
            {schedule[selectedDay as keyof typeof schedule].map((item, index) => (
              <div
                key={index}
                className="flex flex-col md:flex-row md:items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50/30 transition-colors"
              >
                <div className="md:w-32 flex-shrink-0">
                  <div className="text-purple-600">{item.time}</div>
                </div>
                <div className="flex-1">
                  <h4 className="mb-1">{item.class}</h4>
                  <p className="text-gray-600">with {item.instructor}</p>
                </div>
                <div className="md:w-32 flex-shrink-0">
                  <span className={`inline-block px-3 py-1 rounded-full ${getLevelColor(item.level)}`}>
                    {item.level}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
