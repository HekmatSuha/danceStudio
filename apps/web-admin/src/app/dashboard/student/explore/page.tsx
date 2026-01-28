import React from "react";
import dynamic from "next/dynamic";

const StudentClassList = dynamic(
  () =>
    import("../../../../components/dashboard/StudentClassList").then(
      (mod) => mod.StudentClassList,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Loading classes...
      </div>
    ),
  },
);

export default function StudentExplorePage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Explore Classes</h1>
       <StudentClassList />
    </div>
  );
}
