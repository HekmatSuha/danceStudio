import React from "react";
import Link from "next/link";
import { Building2, Users, ShieldCheck } from "lucide-react";

export default function SuperAdminDashboard() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Super Admin Dashboard</h1>
        <p className="text-slate-600 mt-1">System-wide overview and management.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Card 1: Studios */}
        <Link href="/dashboard/super-admin/studios" className="block group">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                <Building2 size={24} />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">Manage Studios</h3>
            <p className="text-slate-500 text-sm mt-1">Create, edit, and monitor all dance studios on the platform.</p>
          </div>
        </Link>

        {/* Card 2: Users */}
        <Link href="/dashboard/super-admin/users" className="block group">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
             <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                  <Users size={24} />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 group-hover:text-green-600 transition-colors">Manage Users</h3>
              <p className="text-slate-500 text-sm mt-1">View and manage owner, instructor, and student accounts.</p>
          </div>
        </Link>

        {/* Card 3: System Health */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                <ShieldCheck size={24} />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900">System Status</h3>
            <p className="text-slate-500 text-sm mt-1">All systems operational. Database connected.</p>
        </div>
      </div>
    </div>
  );
}
