"use client";

import React from "react";
import { ClassList } from "../../../../components/dashboard/ClassList";

export default function InstructorSchedulePage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">My Schedule</h1>
      <ClassList filter="upcoming" refreshTrigger={0} />
    </div>
  );
}
