import React from 'react';
import { Instagram, Mail } from 'lucide-react';

export function Instructors() {
  const instructors = [
    {
      name: 'Emma Wilson',
      specialty: 'Ballet & Contemporary',
      bio: 'Former principal dancer with 20+ years of experience',
      image: 'https://images.unsplash.com/photo-1732612712493-e81f9f9efc6e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYW5jZSUyMGluc3RydWN0b3J8ZW58MXx8fHwxNzY1NzAzMjU3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    },
    {
      name: 'Jordan Smith',
      specialty: 'Hip-Hop & Urban',
      bio: 'Award-winning choreographer and street dance champion',
      image: 'https://images.unsplash.com/photo-1609602961949-eddbb90383cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaXAlMjBob3AlMjBkYW5jZXxlbnwxfHx8fDE3NjU2NzE4MjB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    },
    {
      name: 'Sarah Johnson',
      specialty: 'Jazz & Musical Theater',
      bio: 'Broadway performer with a passion for teaching',
      image: 'https://images.unsplash.com/photo-1547153760-18fc86324498?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYXp6JTIwZGFuY2V8ZW58MXx8fHwxNzY1NzAzMjU3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    },
    {
      name: 'Marcus Lee',
      specialty: 'Contemporary & Modern',
      bio: 'International dancer and certified movement specialist',
      image: 'https://images.unsplash.com/photo-1550026593-cb89847b168d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb250ZW1wb3JhcnklMjBkYW5jZXxlbnwxfHx8fDE3NjU3MDMyNTZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    },
  ];

  return (
    <section id="instructors" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="mb-4">Meet Our Instructors</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Learn from passionate professionals dedicated to helping you achieve your dance goals
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {instructors.map((instructor, index) => (
            <div
              key={index}
              className="group relative"
            >
              <div className="aspect-[3/4] overflow-hidden rounded-lg mb-4">
                <img
                  src={instructor.image}
                  alt={instructor.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="text-center">
                <h3 className="mb-1">{instructor.name}</h3>
                <p className="text-purple-600 mb-2">{instructor.specialty}</p>
                <p className="text-gray-600 mb-4">{instructor.bio}</p>
                <div className="flex justify-center gap-3">
                  <a
                    href="#"
                    className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-purple-100 hover:text-purple-600 transition-colors"
                  >
                    <Instagram size={18} />
                  </a>
                  <a
                    href="#"
                    className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-purple-100 hover:text-purple-600 transition-colors"
                  >
                    <Mail size={18} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
