import React from "react";
import { StudentClassListClient } from "../../../../components/dashboard/student/StudentClassListClient";

export default function StudentBookingsPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">My Bookings</h1>
      <StudentClassListClient />
    </div>
  );
}
