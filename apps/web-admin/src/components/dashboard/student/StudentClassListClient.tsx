"use client";

import React from "react";
import dynamic from "next/dynamic";

const StudentClassList = dynamic(
  () =>
    import("../StudentClassList").then((mod) => mod.StudentClassList),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Loading...
      </div>
    ),
  },
);

export function StudentClassListClient() {
  return <StudentClassList />;
}
