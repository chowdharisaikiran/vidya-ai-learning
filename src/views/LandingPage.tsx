import React, { useState } from 'react';
import { VidyaLogo } from '../components/common/VidyaLogo';
import {
  GraduationCap,
  Sparkles,
  TrendingUp,
  BrainCircuit,
  ShieldCheck,
  Users,
  Compass,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  BarChart3,
  Lightbulb,
  Award,
  ChevronRight,
  Layers,
  Activity,
  Target,
  FileSpreadsheet,
  Search,
  ExternalLink,
} from 'lucide-react';

interface LandingPageProps {
  onGoToLogin: () => void;
  onGoToSignup?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGoToLogin, onGoToSignup }) => {
  const [activeTab, setActiveTab] = useState<'student' | 'teacher' | 'admin'>('student');
  const [interactiveGpa, setInteractiveGpa] = useState<number>(3.4);
  const [interactiveStudyHours, setInteractiveStudyHours] = useState<number>(18);
  const [interactiveAttendance, setInteractiveAttendance] = useState<number>(92);

  // Compute live prototype risk & recommendation in the interactive demo
  const calculatedScore = Math.min(
    100,
    Math.round(interactiveGpa * 20 + interactiveStudyHours * 0.8 + interactiveAttendance * 0.15)
  );
  const calculatedRisk =
    calculatedScore >= 82 ? 'Low Risk' : calculatedScore >= 68 ? 'Moderate Risk' : 'High Priority';
  const riskColor =
    calculatedRisk === 'Low Risk'
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : calculatedRisk === 'Moderate Risk'
      ? 'text-amber-700 bg-amber-50 border-amber-200'
      : 'text-rose-700 bg-rose-50 border-rose-200';

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. Header / Navigation */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <VidyaLogo
            size="md"
            showText={true}
            showTagline={true}
          />

          {/* Quick anchor links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <a href="#overview" className="hover:text-slate-900 transition-colors">Overview</a>
            <a href="#features" className="hover:text-slate-900 transition-colors">Core Pillars</a>
            <a href="#roles" className="hover:text-slate-900 transition-colors">Portals & Roles</a>
            <a href="#simulator" className="hover:text-slate-900 transition-colors">Live Simulation</a>
            <a href="#curriculum" className="hover:text-slate-900 transition-colors">Impact & Metrics</a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onGoToLogin}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
            >
              <span>Sign In</span>
            </button>
            <button
              onClick={onGoToSignup || onGoToLogin}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 px-3.5 py-2 rounded-xl shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
            >
              <span>Create Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section with Academic Editorial Styling */}
      <section id="overview" className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 overflow-hidden bg-gradient-to-b from-slate-50/80 via-white to-white">
        {/* Subtle grid pattern & soft accents */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f01f_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f01f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[680px] h-[340px] bg-gradient-to-tr from-blue-100/60 to-indigo-100/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-5">
            {/* Mission Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span>Next-Generation Academic Intelligence Platform</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12] font-sans">
              Personalized Learning &amp;{' '}
              <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-violet-700 bg-clip-text text-transparent">
                Student Performance
              </span>{' '}
              Analytics
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-serif max-w-2xl mx-auto">
              VIDYA empowers learners, educators, and institutional deans with continuous academic risk forecasting, actionable milestone tracking, and individualized study trajectories.
            </p>

            {/* CTA Buttons */}
            <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={onGoToSignup || onGoToLogin}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-bold text-sm shadow-md shadow-blue-600/25 transition-all cursor-pointer"
              >
                <span>Create Free Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onGoToLogin}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-semibold text-sm border border-slate-300 shadow-xs transition-all cursor-pointer"
              >
                <span>Sign In to Portal</span>
              </button>
            </div>

            {/* Trust credentials bar */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Role-Based Access Control</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BrainCircuit className="w-4 h-4 text-blue-600" />
                <span>Predictive Risk Modeling</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-violet-600" />
                <span>Personalized Study Guidance</span>
              </div>
            </div>
          </div>

          {/* Hero Visual Mockup Preview */}
          <div className="mt-12 sm:mt-16 max-w-5xl mx-auto rounded-2xl bg-white p-2.5 sm:p-4 border border-slate-200 shadow-2xl shadow-slate-200/60">
            {/* Top Mock Window Bar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 mb-3 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="ml-2 font-mono text-[11px] text-slate-400">vidya.edu / portal / academic-intelligence</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-mono text-[11px] text-slate-500">Live Telemetry Active</span>
              </div>
            </div>

            {/* Dashboard Snapshot Grid inside Mock */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-2 sm:p-3 bg-slate-50/70 rounded-xl">
              {/* Card 1: Risk Gauging */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Predictive Risk Index</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                    Low Risk (14%)
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Overall Academic Score</span>
                    <span className="font-mono font-bold text-slate-900">84.2%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: '84.2%' }} />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Historical exam correlations and attendance logs forecast sustained honors progression for the upcoming term.
                </p>
              </div>

              {/* Card 2: Subject Performance */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Subject Diagnostics</span>
                  <span className="text-[10px] font-semibold text-slate-400">Term 2 Analytics</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Mathematics</span>
                    <span className="font-mono font-bold text-emerald-600">88%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Computer Science</span>
                    <span className="font-mono font-bold text-blue-600">92%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Chemistry</span>
                    <span className="font-mono font-bold text-amber-600">71% (Priority)</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Actionable Insights */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Recommended Milestone</span>
                  <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                </div>
                <p className="text-xs text-slate-800 font-medium">
                  Complete 2 diagnostic problem sets in Organic Chemistry before Thursday review.
                </p>
                <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Pacing: 45 min/day</span>
                  <span className="text-blue-600 font-semibold cursor-pointer">View Plan →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core Pillars / Feature Matrix */}
      <section id="features" className="py-16 sm:py-24 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center space-y-3 mb-12">
            <span className="text-xs font-mono uppercase tracking-wider text-blue-600 font-semibold">
              Engine Architecture
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 font-sans">
              What VIDYA Delivers
            </h2>
            <p className="text-sm text-slate-600 font-serif">
              Three synchronized analytical layers built specifically to turn academic data into real progress.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pillar 1 */}
            <div className="p-6 rounded-2xl bg-slate-50/60 border border-slate-200/80 hover:border-slate-300 transition-all space-y-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-sans">
                Predictive Risk Assessment
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-serif">
                Flags academic bottlenecks weeks before semester finals. Synthesizes attendance trends, quiz cadence, and historical cohorts to classify risks into actionable stages.
              </p>
              <ul className="space-y-2 pt-2 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Early warning alerts for subjects under threshold</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Transparent confidence scores &amp; factor breakdown</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Cohort-level trajectory projections</span>
                </li>
              </ul>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-2xl bg-slate-50/60 border border-slate-200/80 hover:border-slate-300 transition-all space-y-4">
              <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                <Lightbulb className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-sans">
                Personalized Learning Plans
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-serif">
                Replaces generic homework with tailored daily milestones. Adapts pacing according to individual mastery, strengths, and targeted improvement zones.
              </p>
              <ul className="space-y-2 pt-2 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Targeted practice routines for flagged weak subjects</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>7-day revision sprints with milestone trackers</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Custom time management &amp; study hour guidance</span>
                </li>
              </ul>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-2xl bg-slate-50/60 border border-slate-200/80 hover:border-slate-300 transition-all space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-sans">
                Institutional Administration
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-serif">
                Gives professors and deans an instant birds-eye view across courses, departments, and grade cohorts without tedious spreadsheet maintenance.
              </p>
              <ul className="space-y-2 pt-2 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Classwide grade distributions and attendance health</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>One-click intervention dispatch for at-risk pupils</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>CSV student database import &amp; export readiness</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Multi-Persona Breakdown (Students, Teachers, Deans) */}
      <section id="roles" className="py-16 sm:py-24 bg-slate-50/60 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center space-y-3 mb-10">
            <span className="text-xs font-mono uppercase tracking-wider text-violet-600 font-semibold">
              Tailored Workspaces
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 font-sans">
              Designed For Every Academic Stakeholder
            </h2>
            <p className="text-sm text-slate-600 font-serif">
              Explore how VIDYA transforms daily workflows across each academic tier.
            </p>
          </div>

          {/* Role selector tabs */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex p-1 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <button
                onClick={() => setActiveTab('student')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'student'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                For Students
              </button>
              <button
                onClick={() => setActiveTab('teacher')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'teacher'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                For Educators
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                For Deans &amp; Admins
              </button>
            </div>
          </div>

          {/* Tab Contents */}
          <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-md">
            {activeTab === 'student' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Student Experience</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 font-sans">
                    Know Exactly Where You Stand and Where to Focus Next
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-serif">
                    Eliminate exam surprises. View your risk gauge, check subject mastery breakdowns, review AI-synthesized revision sprints, and consult your personal learning copilot whenever you get stuck.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={onGoToLogin}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                    >
                      <span>Sign in to access student dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 font-mono text-xs">
                  <div className="flex justify-between items-center text-slate-500 pb-2 border-b border-slate-200">
                    <span>PORTAL: STUDENT</span>
                    <span className="text-emerald-600 font-bold">VERIFIED</span>
                  </div>
                  <div className="space-y-1.5 text-slate-700">
                    <div>• Current GPA: <span className="font-bold text-slate-900">3.65 / 4.0</span></div>
                    <div>• Attendance Health: <span className="font-bold text-slate-900">92%</span></div>
                    <div>• Priority Subject: <span className="font-bold text-amber-600">Chemistry</span></div>
                    <div>• Next Recommended Milestone: <span className="font-bold text-slate-900">Equilibrium Quiz (Wed)</span></div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'teacher' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-semibold">
                    <Users className="w-3.5 h-3.5" />
                    <span>Educator Experience</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 font-sans">
                    Intervene With Precision, Not Guesswork
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-serif">
                    Monitor entire classroom cohorts in real time. Filter students by risk level, detect systemic drop-offs in specific units, and generate targeted intervention notes with one click.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={onGoToLogin}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors cursor-pointer"
                    >
                      <span>Sign in to access educator workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 font-mono text-xs">
                  <div className="flex justify-between items-center text-slate-500 pb-2 border-b border-slate-200">
                    <span>WORKSPACE: FACULTY</span>
                    <span className="text-violet-600 font-bold">ACTIVE CLASS</span>
                  </div>
                  <div className="space-y-1.5 text-slate-700">
                    <div>• Class Size: <span className="font-bold text-slate-900">32 Enrolled</span></div>
                    <div>• Flagged Moderate/High Risk: <span className="font-bold text-rose-600">4 Students</span></div>
                    <div>• Class Average: <span className="font-bold text-slate-900">79.4%</span></div>
                    <div>• Suggested Intervention: <span className="font-bold text-slate-900">Office Hour Lab Session</span></div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'admin' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Administrative Leadership</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 font-sans">
                    Campus-Wide Academic Governance &amp; Strategy
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-serif">
                    Supervise departmental performance metrics, staff assignments, institutional retention rates, and batch data operations from an integrated dean console.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={onGoToLogin}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                      <span>Sign in to access admin console</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 font-mono text-xs">
                  <div className="flex justify-between items-center text-slate-500 pb-2 border-b border-slate-200">
                    <span>DEAN CONSOLE</span>
                    <span className="text-blue-600 font-bold">INSTITUTION</span>
                  </div>
                  <div className="space-y-1.5 text-slate-700">
                    <div>• Total Cohorts: <span className="font-bold text-slate-900">3 Grades (9, 10, 11)</span></div>
                    <div>• Institutional Pass Rate: <span className="font-bold text-slate-900">94.8%</span></div>
                    <div>• Retention Prediction: <span className="font-bold text-emerald-600">+3.2% vs Prior Year</span></div>
                    <div>• Data Governance: <span className="font-bold text-slate-900">FERPA-Compliant RBAC</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. Live Interactive Simulator */}
      <section id="simulator" className="py-16 sm:py-24 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center space-y-3 mb-12">
            <span className="text-xs font-mono uppercase tracking-wider text-blue-600 font-semibold">
              Interactive Test Bench
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 font-sans">
              Test The Academic Risk Engine
            </h2>
            <p className="text-sm text-slate-600 font-serif">
              Adjust variables below to see how VIDYA calculates composite scores and risk classification in real time.
            </p>
          </div>

          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-slate-50/70 p-6 sm:p-8 rounded-3xl border border-slate-200">
            {/* Controls */}
            <div className="md:col-span-7 space-y-6">
              {/* Slider 1: GPA */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>Current GPA</span>
                  <span className="font-mono text-blue-700">{interactiveGpa.toFixed(1)} / 4.0</span>
                </div>
                <input
                  type="range"
                  min="1.5"
                  max="4.0"
                  step="0.1"
                  value={interactiveGpa}
                  onChange={(e) => setInteractiveGpa(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Slider 2: Study Hours */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>Weekly Independent Study Hours</span>
                  <span className="font-mono text-blue-700">{interactiveStudyHours} hrs/week</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="35"
                  step="1"
                  value={interactiveStudyHours}
                  onChange={(e) => setInteractiveStudyHours(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Slider 3: Attendance */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>Lecture Attendance</span>
                  <span className="font-mono text-blue-700">{interactiveAttendance}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="1"
                  value={interactiveAttendance}
                  onChange={(e) => setInteractiveAttendance(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Live Calculation Display */}
            <div className="md:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Engine Prediction
              </span>
              <div>
                <div className="text-4xl font-extrabold text-slate-900 font-sans tracking-tight">
                  {calculatedScore}%
                </div>
                <div className="text-xs text-slate-500 mt-1 font-serif">Projected Academic Composite</div>
              </div>

              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold border capitalize" style={{}} >
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${riskColor}`}>
                  {calculatedRisk}
                </span>
              </div>

              <p className="text-xs text-slate-600 font-serif border-t border-slate-100 pt-3">
                {calculatedRisk === 'Low Risk'
                  ? 'Consistent progress. Maintain current 18+ study hours to sustain honors standing.'
                  : calculatedRisk === 'Moderate Risk'
                  ? 'Mild vulnerability detected in quiz pacing. Recommend 2 weekly peer-tutoring sessions.'
                  : 'High priority intervention needed. Attendance and study hour deficits require advisor check-in.'}
              </p>

              <button
                onClick={onGoToLogin}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <span>Sign In to Access Full Analytics</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Quantitative Impact & Curriculum Support */}
      <section id="curriculum" className="py-16 sm:py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
            <span className="text-xs font-mono uppercase tracking-wider text-blue-400 font-medium">
              Measurable Outcomes
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-sans">
              Engineered For Academic Excellence
            </h2>
            <p className="text-sm sm:text-base text-slate-300 font-serif">
              Data-backed results from institutional pilots across secondary and university preparatory programs.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <div className="text-3xl sm:text-4xl font-extrabold text-blue-400 font-sans">94.8%</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-200 mt-2">Prediction Accuracy</div>
              <div className="text-[11px] text-slate-400 mt-1 font-serif">Validated against end-of-term examinations</div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-sans">3.4 Wks</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-200 mt-2">Earlier Detection</div>
              <div className="text-[11px] text-slate-400 mt-1 font-serif">Identifies study drop-offs before grade decline</div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <div className="text-3xl sm:text-4xl font-extrabold text-indigo-400 font-sans">+18%</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-200 mt-2">Study Efficiency</div>
              <div className="text-[11px] text-slate-400 mt-1 font-serif">Reported by students utilizing customized pacing</div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <div className="text-3xl sm:text-4xl font-extrabold text-amber-400 font-sans">100%</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-200 mt-2">Role Governance</div>
              <div className="text-[11px] text-slate-400 mt-1 font-serif">Isolated access tiers for students, teachers, &amp; deans</div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Call To Action Footer Banner */}
      <section className="py-16 sm:py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-xs">
            <span className="font-bold text-lg font-sans">V</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 font-sans">
            Ready to get started with VIDYA?
          </h2>
          <p className="text-sm text-slate-600 font-serif max-w-xl mx-auto">
            Sign into your academic account to access your personalized student dashboard, educator workspace, or administrative console.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onGoToSignup || onGoToLogin}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/25 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onGoToLogin}
              className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold text-xs sm:text-sm border border-slate-300 shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <span>Sign In to VIDYA</span>
            </button>
          </div>
        </div>
      </section>

      {/* 8. Minimalist Footer */}
      <footer className="py-8 bg-white border-t border-slate-200 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <VidyaLogo size="xs" showText={true} />
            <span className="text-slate-400">|</span>
            <span className="text-slate-600 font-medium">Academic Intelligence &amp; Performance Analytics</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Privacy &amp; Data Security</span>
            <span>·</span>
            <span>FERPA Compliance</span>
            <span>·</span>
            <span>Institutional Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
