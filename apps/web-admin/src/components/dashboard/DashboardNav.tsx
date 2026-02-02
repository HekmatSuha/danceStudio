"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Building2,
  LogOut,
  Menu,
  X,
  Settings,
  History,
  UserCircle,
  ChevronRight,
  DoorOpen,
  DollarSign,
  Home,
  Inbox,
  Bell,
  Megaphone,
  MessageCircle,
  Search,
  BarChart3,
  TrendingUp,
  MapPin,
} from "lucide-react";
import { useAuthUser } from "../../lib/useAuthUser";
import { signOut, type UserRole } from "../../lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { fetchMyStudios } from "../../lib/studios";
import { useAuthedSWR } from "../../lib/useAuthedSWR";

type RequestSummary = { bookingCount: number; rentalCount: number };
type UnreadSummary = { hasUnread: boolean; count: number };

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

export function DashboardNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, loading } = useAuthUser();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [studioIdsParam, setStudioIdsParam] = useState("");
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  useEffect(() => {
    if (!user || role !== "owner") {
      setStudioIdsParam("");
      return;
    }

    let mounted = true;
    fetchMyStudios()
      .then((studios) => {
        if (!mounted) return;
        setStudioIdsParam(studios.map((studio) => studio.uuid).join(","));
      })
      .catch(() => {
        if (!mounted) return;
        setStudioIdsParam("");
      });

    return () => {
      mounted = false;
    };
  }, [role, user]);

  const { data: requestSummary } = useAuthedSWR<RequestSummary>(
    role === "owner" && studioIdsParam
      ? `/api/owner/requests/summary?studioIds=${studioIdsParam}`
      : null
  );

  const { data: unreadSummary } = useAuthedSWR<UnreadSummary>(
    role === "owner" ? "/api/chat/unread" : null
  );

  const hasPendingRequests = useMemo(() => {
    if (role !== "owner") return false;
    const bookingCount = requestSummary?.bookingCount ?? 0;
    const rentalCount = requestSummary?.rentalCount ?? 0;
    return bookingCount + rentalCount > 0;
  }, [requestSummary, role]);

  useEffect(() => {
    if (!user || role !== "owner") {
      setHasUnreadMessages(false);
      return;
    }

    if (unreadSummary) {
      setHasUnreadMessages(unreadSummary.hasUnread);
    }
  }, [role, unreadSummary, user]);

  // Define navigation items based on role
  const getNavItems = (role: UserRole | null): NavItem[] => {
    switch (role) {
      case "student":
        return [
          { label: "Overview", href: "/dashboard/student", icon: <LayoutDashboard size={20} /> },
          { label: "My Bookings", href: "/dashboard/student/bookings", icon: <CalendarDays size={20} /> },
          { label: "History", href: "/dashboard/student/history", icon: <History size={20} /> },
          { label: "Messages", href: "/dashboard/student/chat", icon: <MessageCircle size={20} /> },
        ];
      case "instructor":
        return [
          { label: "Overview", href: "/dashboard/instructor", icon: <LayoutDashboard size={20} /> },
          { label: "My Schedule", href: "/dashboard/instructor/schedule", icon: <CalendarDays size={20} /> },
          { label: "Students", href: "/dashboard/instructor/students", icon: <Users size={20} /> },
          { label: "Requests", href: "/dashboard/instructor/requests", icon: <Inbox size={20} /> },
          { label: "Studio Rentals", href: "/dashboard/instructor/rentals", icon: <Search size={20} /> },
          { label: "Payments", href: "/dashboard/instructor/payments", icon: <DollarSign size={20} /> },
          { label: "Notifications", href: "/dashboard/instructor/notifications", icon: <Bell size={20} /> },
          { label: "Activity Analytics", href: "/dashboard/instructor/analytics", icon: <BarChart3 size={20} /> },
          { label: "Income Analytics", href: "/dashboard/instructor/income", icon: <TrendingUp size={20} /> },
          { label: "Advertisements", href: "/dashboard/instructor/advertisements", icon: <Megaphone size={20} /> },
          { label: "City Events", href: "/dashboard/instructor/events", icon: <MapPin size={20} /> },
          { label: "Messages", href: "/dashboard/instructor/chat", icon: <MessageCircle size={20} /> },
        ];
      case "owner":
        return [
          { label: "Overview", href: "/dashboard/owner", icon: <LayoutDashboard size={20} /> },
          { label: "Classes & Events", href: "/dashboard/owner/classes", icon: <CalendarDays size={20} /> },
          { label: "Instructors", href: "/dashboard/owner/instructors", icon: <UserCircle size={20} /> },
          { label: "Rooms", href: "/dashboard/owner/rooms", icon: <DoorOpen size={20} /> },
          { label: "Students", href: "/dashboard/owner/students", icon: <Users size={20} /> },
          { label: "Requests", href: "/dashboard/owner/requests", icon: <Inbox size={20} /> },
          { label: "Finance", href: "/dashboard/owner/payments", icon: <DollarSign size={20} /> },
          { label: "Notifications", href: "/dashboard/owner/notifications", icon: <Bell size={20} /> },
          { label: "Advertisements", href: "/dashboard/owner/advertisements", icon: <Megaphone size={20} /> },
          { label: "Messages", href: "/dashboard/owner/chat", icon: <MessageCircle size={20} /> },
        ];
      case "super_admin":
        return [
          { label: "Overview", href: "/dashboard/super-admin", icon: <LayoutDashboard size={20} /> },
          { label: "Manage Studios", href: "/dashboard/super-admin/studios", icon: <Building2 size={20} /> },
          { label: "System Users", href: "/dashboard/super-admin/users", icon: <Users size={20} /> },
          { label: "Messages", href: "/dashboard/super-admin/chat", icon: <MessageCircle size={20} /> },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems(role);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Image
            src="/tance-logo.png"
            alt="Tance"
            width={40}
            height={40}
            className="rounded"
          />
          <span className="font-bold text-gray-900">Tance</span>
        </div>
        <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="p-2 text-gray-600">
          {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:h-screen lg:overflow-y-auto ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } pt-16 lg:pt-0`}
      >
        <div className="h-full flex flex-col">
          {/* Logo Area (Desktop) */}
          <div className="hidden lg:flex items-center gap-2 h-16 px-6 border-b border-gray-100">
            <Image
              src="/tance-logo.png"
              alt="Tance"
              width={44}
              height={44}
              className="rounded"
            />
            <span className="font-bold text-xl text-gray-900 tracking-tight">Tance</span>
          </div>

          {/* User Profile Summary */}
          <div className="px-6 py-6">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-gray-200">
                <AvatarImage src={user?.avatar_url || undefined} />
                <AvatarFallback className="bg-purple-100 text-purple-700 font-medium">
                  {user?.first_name?.[0] || user?.email?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.email}
                </p>
                <p className="text-xs text-gray-500 capitalize truncate">{role}</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 space-y-1">
            <Link
              href="/"
              onClick={() => setIsMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              <span className="text-gray-400">
                <Home size={20} />
              </span>
              Home
            </Link>
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2">
              Menu
            </p>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const showIndicator = (role === "owner" && item.href === "/dashboard/owner/requests" && hasPendingRequests)
                || (role === "owner" && item.href === "/dashboard/owner/chat" && hasUnreadMessages);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? "bg-purple-50 text-purple-700"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span className={`${isActive ? "text-purple-600" : "text-gray-400"}`}>
                    {item.icon}
                  </span>
                  {item.label}
                  <span className="ml-auto flex items-center gap-2">
                    {showIndicator && (
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                    )}
                    {isActive && <ChevronRight size={16} className="opacity-50" />}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Footer Actions */}
          <div className="p-4 border-t border-gray-100 space-y-1">
             <Link
              href="/profile"
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Settings size={20} className="text-gray-400" />
              Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut size={20} className="text-red-400" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-auto pt-16 lg:pt-0">
        {children}
      </main>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </div>
  );
}
