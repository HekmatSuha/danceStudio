import React from 'react';
import { Clock, Users } from 'lucide-react';

export function Classes() {
  const classes = [
    {
      title: 'Ballet',
      description: 'Classical ballet technique for grace, strength, and precision',
      image: 'https://images.unsplash.com/photo-1495791185843-c73f2269f669?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWxsZXQlMjBkYW5jZXJ8ZW58MXx8fHwxNzY1NzAzMjU2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      duration: '60 min',
      level: 'All Levels',
      color: 'bg-pink-500',
    },
    {
      title: 'Hip-Hop',
      description: 'Urban dance styles with energy, attitude, and creative expression',
      image: 'https://images.unsplash.com/photo-1609602961949-eddbb90383cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaXAlMjBob3AlMjBkYW5jZXxlbnwxfHx8fDE3NjU2NzE4MjB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      duration: '75 min',
      level: 'Intermediate',
      color: 'bg-orange-500',
    },
    {
      title: 'Contemporary',
      description: 'Fluid movements blending ballet, modern, and jazz techniques',
      image: 'https://images.unsplash.com/photo-1550026593-cb89847b168d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb250ZW1wb3JhcnklMjBkYW5jZXxlbnwxfHx8fDE3NjU3MDMyNTZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      duration: '60 min',
      level: 'All Levels',
      color: 'bg-purple-500',
    },
    {
      title: 'Jazz',
      description: 'High-energy choreography with sharp movements and style',
      image: 'https://images.unsplash.com/photo-1547153760-18fc86324498?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYXp6JTIwZGFuY2V8ZW58MXx8fHwxNzY1NzAzMjU3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      duration: '60 min',
      level: 'Beginner',
      color: 'bg-blue-500',
    },
  ];

  return (
    <section id="classes" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="mb-4">Our Classes</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Explore our diverse range of dance styles and find the perfect class for you
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {classes.map((classItem, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer"
            >
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src={classItem.image}
                  alt={classItem.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-6 text-white">
                <div className={`inline-block ${classItem.color} px-3 py-1 rounded-full mb-2 self-start`}>
                  {classItem.level}
                </div>
                <h3 className="mb-2 text-white">{classItem.title}</h3>
                <p className="text-gray-200 mb-4">{classItem.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-300">
                  <div className="flex items-center gap-1">
                    <Clock size={16} />
                    <span>{classItem.duration}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users size={16} />
                    <span>Max 15</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
