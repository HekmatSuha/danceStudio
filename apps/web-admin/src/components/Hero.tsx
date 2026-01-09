import React from 'react';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';

export function Hero() {
  return (
    <div className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1690267647311-eeeac21df6c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBkYW5jZSUyMHN0dWRpb3xlbnwxfHx8fDE3NjU2MjM5NTh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
          alt="Dance Studio"
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/80 to-pink-900/60"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
        <h1 className="mb-6 text-white">
          Move to Your Own Rhythm
        </h1>
        <p className="mb-8 text-xl text-gray-100 max-w-2xl mx-auto">
          Discover your passion for dance in our state-of-the-art studio. From ballet to hip-hop, we offer classes for all ages and skill levels.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#classes"
            className="inline-flex items-center justify-center bg-purple-600 text-white px-8 py-3 rounded-full hover:bg-purple-700 transition-colors"
          >
            Explore Classes
            <ArrowRight className="ml-2" size={20} />
          </a>
          <a
            href="#schedule"
            className="inline-flex items-center justify-center bg-white text-purple-600 px-8 py-3 rounded-full hover:bg-gray-100 transition-colors"
          >
            View Schedule
          </a>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white rounded-full flex items-start justify-center p-2">
          <div className="w-1 h-3 bg-white rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
