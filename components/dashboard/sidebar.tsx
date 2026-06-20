"use client"

import { LayoutDashboard, Users, BookOpen, Link2, UserCheck, Shield, Layers, Calendar, BarChart3, CalendarDays } from "lucide-react"

interface SidebarProps {
  currentPage: string
  onPageChange: (page: any) => void
  isOpen: boolean
  onToggle: () => void
}

export function Sidebar({ currentPage, onPageChange, isOpen }: SidebarProps) {
  const menuItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "admin-users", label: "Admin Users", icon: Shield },
    { id: "teachers", label: "Teachers", icon: Users },
    { id: "students", label: "Students", icon: Users },
    { id: "divisions", label: "Divisions", icon: Layers },
    { id: "subjects", label: "Subjects", icon: BookOpen },
    { id: "subject-from-dept", label: "Subject → Dept", icon: Link2 },
    { id: "student-enrollments", label: "Enrollments", icon: UserCheck },
    { id: "holidays", label: "Holidays", icon: Calendar },
    { id: "timetable", label: "Timetable", icon: CalendarDays },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ]

  return (
    <aside
      className={`${
        isOpen ? "w-64" : "w-0"
      } hidden lg:block lg:w-64 bg-card border-r border-border transition-all duration-300 overflow-hidden`}
    >
      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-lg font-bold text-primary">ClassLens</h2>
          <p className="text-xs text-muted-foreground">Admin Panel</p>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id

            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition font-medium text-sm ${
                  isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
