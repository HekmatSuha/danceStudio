"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, LogOut, UserRound } from 'lucide-react';
import { AuthModal } from './AuthModal';
import { useAuthUser } from '../lib/useAuthUser';
import { signOut, type UserRole } from '../lib/auth';

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const { user, role, loading } = useAuthUser();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        event.target instanceof Node &&
        !profileRef.current.contains(event.target)
      ) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { label: 'Studios', href: '#studios' },
    { label: 'Classes', href: '#classes' },
    { label: 'Instructors', href: '#instructors' },
    { label: 'Contact', href: '#contact' },
  ];

  const openAuthModal = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  const dashboardPath = useMemo(() => {
    if (!role) return '/dashboard';
    const slugMap: Record<UserRole, string> = {
      super_admin: 'super-admin',
      owner: 'owner',
      instructor: 'instructor',
      student: 'student',
    };
    return `/dashboard/${slugMap[role]}`;
  }, [role]);

  const fullName = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();
  const initials =
    fullName
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || (user?.email ? user.email[0]?.toUpperCase() : '');

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white shadow-md' : 'bg-white/90'
      } backdrop-blur border-b border-slate-200/70`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <a href="#" className="flex items-center space-x-2">
            <Image
              src="/tance-logo.png"
              alt="Tance"
              width={56}
              height={56}
              className="rounded"
            />
            <span className="transition-colors text-slate-900">Tance</span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="transition-colors text-slate-600 hover:text-purple-600"
              >
                {item.label}
              </a>
            ))}
            {!loading && user ? (
              <>
                <Link
                  href={dashboardPath}
                  className="transition-colors text-slate-600 hover:text-purple-600"
                >
                  Dashboard
                </Link>
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setIsProfileOpen((v) => !v)}
                    className="flex items-center gap-3 rounded-full px-3 py-1 hover:bg-slate-100 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-semibold">
                      {initials || 'U'}
                    </div>
                    <div className="text-slate-800 leading-tight text-left">
                      <div className="text-sm font-semibold">
                        {fullName || user.email || 'Signed in'}
                      </div>
                      {role && (
                        <div className="text-xs opacity-75 capitalize">{role}</div>
                      )}
                    </div>
                  </button>
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-44 rounded-lg border border-gray-200 bg-white shadow-lg z-50">
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 px-4 py-3 text-sm text-gray-800 hover:bg-gray-50"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <UserRound size={16} /> Profile
                      </Link>
                      <button
                        className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setIsProfileOpen(false);
                          signOut();
                        }}
                      >
                        <LogOut size={16} /> Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => openAuthModal('signin')}
                  className="transition-colors text-slate-600 hover:text-purple-600"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuthModal('signup')}
                  className="bg-purple-600 text-white px-6 py-2 rounded-full hover:bg-purple-700 transition-colors"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden transition-colors text-slate-900"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-4 py-4 space-y-3">
            {!loading && user && (
              <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                <div className="h-10 w-10 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-semibold">
                  {initials || 'U'}
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold">
                    {fullName || user.email || 'Signed in'}
                  </div>
                  {role && (
                    <div className="text-xs text-gray-500 capitalize">{role}</div>
                  )}
                </div>
              </div>
            )}
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="block text-gray-700 hover:text-purple-600 py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            {!loading && user ? (
              <>
                <Link
                  href={dashboardPath}
                  className="block w-full text-left text-gray-700 hover:text-purple-600 py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 text-left text-gray-700 hover:text-purple-600 py-2"
                >
                  <LogOut size={18} /> Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => openAuthModal('signin')}
                  className="block w-full text-left text-gray-700 hover:text-purple-600 py-2"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuthModal('signup')}
                  className="block w-full bg-purple-600 text-white px-6 py-2 rounded-full hover:bg-purple-700 transition-colors text-center"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {!user && (
        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
          initialMode={authMode}
        />
      )}
    </nav>
  );
}
