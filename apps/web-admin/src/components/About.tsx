import React from 'react';
import { Award, Users, Heart, Star } from 'lucide-react';

export function About() {
  const features = [
    {
      icon: Award,
      title: 'Expert Instructors',
      description: 'Learn from award-winning dancers and certified professionals',
    },
    {
      icon: Users,
      title: 'Community',
      description: 'Join a supportive community of passionate dancers',
    },
    {
      icon: Heart,
      title: 'All Levels Welcome',
      description: 'From beginners to advanced, everyone has a place here',
    },
    {
      icon: Star,
      title: 'Modern Facilities',
      description: 'Train in our state-of-the-art studios with premium equipment',
    },
  ];

  return (
    <section id="about" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="mb-4">About Elevate Dance Studio</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            For over 15 years, we`ve been inspiring dancers of all ages to reach new heights. 
            Our mission is to provide exceptional dance education in a welcoming, inclusive environment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="text-purple-600" size={24} />
              </div>
              <h3 className="mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
