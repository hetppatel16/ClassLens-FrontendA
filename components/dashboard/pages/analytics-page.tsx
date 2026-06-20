"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  User,
  Mail,
  Building2,
  GraduationCap,
  Calendar,
  Sparkles,
  ArrowLeft,
  Percent,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface AnalyticsPageProps {
  token: string | null;
}

interface AttendanceStat {
  student_id: number;
  student_name: string;
  prn: number;
  email: string;
  division_name: string;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  present_count: number;
  total_sessions: number;
  attendance_percentage: number;
}

interface Subject {
  id: number;
  name: string;
  code: string;
}

interface Division {
  id: number;
  name: string;
  year: number;
  department_name?: string;
  department?: number;
}

interface SubjectAttendanceDetail {
  id: number;
  name: string;
  code: string;
  total: number;
  attended: number;
  percentage: number;
}

interface SemesterAttendance {
  semester_number: number;
  overall_attendance: number;
  subjects: SubjectAttendanceDetail[];
}

interface StudentProfile {
  id: number;
  name: string;
  prn: number;
  email: string;
  year: number;
  semester: number;
  division_name: string;
  department_name: string;
  program: string;
  overall_attendance: number | null;
  subjects: SubjectAttendanceDetail[];
  semesters: SemesterAttendance[];
}

interface Department {
  id: number;
  name: string;
}

export function AnalyticsPage({ token }: AnalyticsPageProps) {
  const [stats, setStats] = useState<AttendanceStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [threshold, setThreshold] = useState("75");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);

  const [selectedDept, setSelectedDept] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchFilters();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchSubjects();
  }, [token, selectedDept, selectedYear]);

  useEffect(() => {
    if (!token) return;
    const delayDebounceFn = setTimeout(() => {
      fetchAnalytics();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [token, selectedDept, selectedYear, selectedSubject, selectedDivision, search, threshold]);

  const fetchFilters = async () => {
    try {
      const deptRes = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_URL + "/api/getDepartments/",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (deptRes.ok) {
        const data = await deptRes.json();
        setDepartments(data);
      }

      const divRes = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_URL + "/api/admin/divisions/",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (divRes.ok) {
        const data = await divRes.json();
        setDivisions(data.results || data);
      }
    } catch (err) {
      console.error("Failed to load analytics filters:", err);
    }
  };

  const fetchSubjects = async () => {
    if (!token) return;
    if (!selectedDept) {
      try {
        const subRes = await fetch(
          process.env.NEXT_PUBLIC_BACKEND_URL + "/api/admin/subjects/",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (subRes.ok) {
          const data = await subRes.json();
          setSubjects(data.results || data);
        }
      } catch (err) {
        console.error("Failed to fetch all subjects:", err);
      }
      return;
    }

    try {
      let url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/subject-from-dept/?department=${selectedDept}`;
      if (selectedYear) {
        url += `&year=${selectedYear}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const results = data.results || data;
        const list: Subject[] = [];
        results.forEach((item: any) => {
          if (item.subject_details) {
            list.push(...item.subject_details);
          }
        });
        const unique = list.filter(
          (sub, idx, self) => self.findIndex((s) => s.id === sub.id) === idx
        );
        setSubjects(unique);
      }
    } catch (err) {
      console.error("Failed to fetch mapped subjects:", err);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      let url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/attendance/analytics/?`;
      if (selectedSubject) url += `class=${selectedSubject}&`;
      if (selectedDivision) url += `batch=${selectedDivision}&`;
      if (selectedDept) url += `department=${selectedDept}&`;
      if (selectedYear) url += `year=${selectedYear}&`;
      if (search) url += `search_student=${encodeURIComponent(search)}&`;
      if (threshold) url += `threshold_percentage=${threshold}&`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.analytics || []);
        setStudentProfile(data.student_profile || null);
      }
    } catch (err) {
      console.error("Failed to load analytics data:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStats = stats;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Attendance Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Monitor student attendance and track defaulters
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Department
          </label>
          <select
            className="w-full p-2.5 border rounded-md bg-card border-border text-foreground"
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setSelectedYear("");
              setSelectedSubject("");
              setSelectedDivision("");
            }}
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Year
          </label>
          <select
            className="w-full p-2.5 border rounded-md bg-card border-border text-foreground"
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setSelectedSubject("");
              setSelectedDivision("");
            }}
            disabled={!selectedDept}
          >
            <option value="">All Years</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Subject
          </label>
          <select
            className="w-full p-2.5 border rounded-md bg-card border-border text-foreground"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option value="">All Subjects</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name} ({sub.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Division
          </label>
          <select
            className="w-full p-2.5 border rounded-md bg-card border-border text-foreground"
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            disabled={!selectedYear}
          >
            <option value="">All Divisions</option>
            {divisions
              .filter((div) => {
                const matchDept = !selectedDept || String(div.department) === selectedDept;
                const matchYear = !selectedYear || String(div.year) === selectedYear;
                return matchDept && matchYear;
              })
              .map((div) => (
                <option key={div.id} value={div.id}>
                  {div.name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Search Student
          </label>
          <Input
            placeholder="Search by name or PRN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Attendance Threshold %
          </label>
          <Input
            type="number"
            min="0"
            max="100"
            placeholder="e.g. 75"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
        </div>
      </div>

      {studentProfile ? (
        <div className="space-y-6">
          <Card className="p-6 relative overflow-hidden bg-card/60 backdrop-blur-md border border-border shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                    Student Profile
                  </span>
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full uppercase tracking-wider ${
                    (studentProfile.overall_attendance ?? 0) < Number(threshold)
                      ? "bg-destructive/10 text-destructive"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                  }`}>
                    {(studentProfile.overall_attendance ?? 0) < Number(threshold) ? "Defaulter" : "Good Standing"}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">
                  {studentProfile.name}
                </h2>
              </div>
              
              <div className="flex items-center gap-6">
                {(() => {
                  const percentage = studentProfile.overall_attendance ?? 0;
                  const isProfileDefaulter = percentage < Number(threshold);
                  const radius = 40;
                  const circumference = 2 * Math.PI * radius;
                  const strokeDashoffset = circumference - (percentage / 100) * circumference;
                  return (
                    <div className="relative flex items-center justify-center w-28 h-28">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          className="text-muted/20"
                          strokeWidth="8"
                          stroke="currentColor"
                          fill="transparent"
                          r={radius}
                          cx="56"
                          cy="56"
                        />
                        <circle
                          className={`${isProfileDefaulter ? "text-destructive" : "text-emerald-500"} transition-all duration-500 ease-in-out`}
                          strokeWidth="8"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="transparent"
                          r={radius}
                          cx="56"
                          cy="56"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-lg font-extrabold text-foreground">
                          {percentage.toFixed(1)}%
                        </span>
                        <span className="block text-[8px] uppercase font-bold text-muted-foreground">
                          Overall
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <Button
                  variant="outline"
                  onClick={() => setSearch("")}
                  className="flex items-center gap-2 border-border text-foreground hover:bg-muted"
                >
                  <ArrowLeft className="w-4 h-4" /> Clear Search
                </Button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-5 gap-x-8">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">PRN Number</span>
                  <span className="text-sm font-bold text-foreground">{studentProfile.prn}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Email Address</span>
                  <span className="text-sm font-bold text-foreground truncate block">{studentProfile.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Department</span>
                  <span className="text-sm font-bold text-foreground">{studentProfile.department_name}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Program</span>
                  <span className="text-sm font-bold text-foreground">{studentProfile.program}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Year & Semester</span>
                  <span className="text-sm font-bold text-foreground">
                    {studentProfile.year}th Year — Sem {studentProfile.semester}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Division</span>
                  <span className="text-sm font-bold text-foreground">Division {studentProfile.division_name}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Semester-wise Attendance Breakdown */}
          {studentProfile.semesters && studentProfile.semesters.length > 0 ? (
            studentProfile.semesters.map((sem, sIdx) => {
              const isSemDefaulter = sem.overall_attendance < Number(threshold);
              return (
                <Card key={`sem-${sem.semester_number}-${sIdx}`} className="overflow-hidden shadow border border-border">
                  <div className="p-6 border-b border-border bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        Semester {sem.semester_number}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Attendance details for Semester {sem.semester_number} classes
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium">Semester Attendance:</span>
                      <span className={`px-3 py-1.5 text-sm font-bold rounded-lg ${
                        isSemDefaulter
                          ? "bg-destructive/10 text-destructive border border-destructive/20"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-500/20"
                      }`}>
                        {sem.overall_attendance.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-border bg-muted/40">
                        <tr>
                          <th className="text-left p-6 font-semibold text-foreground">Subject Code</th>
                          <th className="text-left p-6 font-semibold text-foreground">Subject Name</th>
                          <th className="text-left p-6 font-semibold text-foreground text-center">Classes Attended / Total</th>
                          <th className="text-left p-6 font-semibold text-foreground text-right">Attendance %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sem.subjects.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-muted-foreground">
                              No subject attendance records found for this semester.
                            </td>
                          </tr>
                        ) : (
                          sem.subjects.map((sub, idx) => {
                            const isSubDefaulter = sub.percentage < Number(threshold);
                            return (
                              <tr
                                key={`sub-${sub.id}-${idx}`}
                                className="border-b border-border hover:bg-muted/50 transition"
                              >
                                <td className="p-6 font-medium text-foreground">{sub.code}</td>
                                <td className="p-6 text-foreground font-medium">{sub.name}</td>
                                <td className="p-6 text-muted-foreground text-center">
                                  {sub.attended} / {sub.total}
                                </td>
                                <td className={`p-6 text-right font-bold ${
                                  isSubDefaulter ? "text-destructive" : "text-green-600"
                                }`}>
                                  {sub.percentage}%
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            })
          ) : (
            <Card className="p-6 text-center text-muted-foreground">
              No semester-wise attendance data found.
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="text-left p-6 font-semibold text-foreground">PRN</th>
                  <th className="text-left p-6 font-semibold text-foreground">Name</th>
                  <th className="text-left p-6 font-semibold text-foreground">Email</th>
                  <th className="text-left p-6 font-semibold text-foreground">Division</th>
                  <th className="text-left p-6 font-semibold text-foreground">Subject</th>
                  <th className="text-left p-6 font-semibold text-foreground text-center">Classes</th>
                  <th className="text-left p-6 font-semibold text-foreground text-right">Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      Loading stats...
                    </td>
                  </tr>
                ) : filteredStats.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      No defaulters or attendance records found matching criteria
                    </td>
                  </tr>
                ) : (
                  filteredStats.map((item, idx) => {
                    const isDefaulter = item.attendance_percentage < Number(threshold);
                    return (
                      <tr
                        key={`${item.student_id}-${item.subject_id || idx}-${idx}`}
                        className="border-b border-border hover:bg-muted/50 transition cursor-pointer"
                        onClick={() => setSearch(item.prn.toString())}
                      >
                        <td className="p-6 font-medium text-foreground">{item.prn}</td>
                        <td className="p-6 text-foreground font-medium">{item.student_name}</td>
                        <td className="p-6 text-muted-foreground">{item.email}</td>
                        <td className="p-6 text-muted-foreground">{item.division_name}</td>
                        <td className="p-6 text-muted-foreground">
                          {item.subject_name} ({item.subject_code})
                        </td>
                        <td className="p-6 text-muted-foreground text-center">
                          {item.present_count} / {item.total_sessions}
                        </td>
                        <td className={`p-6 text-right font-bold ${
                          isDefaulter ? "text-destructive" : "text-green-600"
                        }`}>
                          {item.attendance_percentage}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
