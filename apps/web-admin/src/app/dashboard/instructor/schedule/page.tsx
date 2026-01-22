"use client";

import React from "react";
import { ClassList } from "../../../../components/dashboard/ClassList";

export default function InstructorSchedulePage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <ClassList filter="upcoming" refreshTrigger={0} />
    </div>
  );
}
