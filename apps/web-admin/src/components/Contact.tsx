"use client";

import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

export function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    alert('Thank you for your interest! We will contact you soon.');
    setFormData({ name: '', email: '', phone: '', message: '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const contactInfo = [
    {
      icon: MapPin,
      title: 'Location',
      content: '123 Dance Avenue, Studio City, CA 90210',
    },
    {
      icon: Phone,
      title: 'Phone',
      content: '(555) 123-4567',
    },
    {
      icon: Mail,
      title: 'Email',
      content: 'info@elevatedance.com',
    },
    {
      icon: Clock,
      title: 'Hours',
      content: 'Mon-Fri: 9AM-9PM, Sat-Sun: 10AM-6PM',
    },
  ];

  return (
    <section id="contact" className="py-20 bg-gradient-to-br from-purple-900 to-pink-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="mb-4 text-white">Get In Touch</h2>
          <p className="text-gray-200 max-w-2xl mx-auto">
            Ready to start your dance journey? Contact us to book a trial class or learn more about our programs
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-white/10 backdrop-blur-sm p-8 rounded-lg">
            <h3 className="mb-6 text-white">Send us a message</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block mb-2 text-gray-200">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:border-white"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label htmlFor="email" className="block mb-2 text-gray-200">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:border-white"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block mb-2 text-gray-200">
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:border-white"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label htmlFor="message" className="block mb-2 text-gray-200">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:border-white resize-none"
                  placeholder="Tell us about your dance goals..."
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full bg-white text-purple-600 px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Send Message
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h3 className="mb-6 text-white">Contact Information</h3>
              <div className="space-y-6">
                {contactInfo.map((info, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <info.icon size={24} />
                    </div>
                    <div>
                      <h4 className="mb-1 text-white">{info.title}</h4>
                      <p className="text-gray-200">{info.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-lg">
              <h4 className="mb-4 text-white">First Class Free!</h4>
              <p className="text-gray-200 mb-4">
                New students receive their first class absolutely free. Come experience our studio and find your passion for dance.
              </p>
              <a
                href="#classes"
                className="inline-block bg-white text-purple-600 px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Book Your Free Class
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-white/20 text-center text-gray-200">
          <p>© 2025 Tance. All rights reserved.</p>
        </div>
      </div>
    </section>
  );
}
