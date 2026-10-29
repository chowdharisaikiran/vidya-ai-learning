export type UserRole = 'platform_owner' | 'institution_admin' | 'admin' | 'teacher' | 'student' | 'pending';
export * from './platform';

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  title?: string;
  department?: string;
  studentId?: string | number | null; // Links to StudentData if role === 'student' (mapped to integer student_id)
  staffId?: string | null; // Links to StaffData if role === 'teacher' (mapped to staff_id)
  isProfileMissing?: boolean; // True if matching public.user_profiles record was not found
  errorMessage?: string; // Diagnostic error message if profile query encountered an issue
}

export interface UserProfileRow {
  id: string; // UUID matching auth.users(id)
  full_name: string;
  email: string | null;
  role: UserRole;
  student_id?: number | null; // Integer foreign key to public.students(student_id)
  staff_id?: string | null; // Text foreign key to public.staff(staff_id)
  created_at?: string;
  updated_at?: string;
}

export type LearningStyle = 'Visual' | 'Auditory' | 'Kinesthetic' | 'Reading/Writing';
export type MotivationLevel = 'Low' | 'Medium' | 'High';
export type ParentalSupport = 'Low' | 'Medium' | 'High';
export type StressLevel = 'Low' | 'Medium' | 'High';
export type PerformanceLevel = 'Excellent' | 'Good' | 'Average' | 'Below Average' | 'Critical';
export type RiskLevel = 'Low' | 'Moderate' | 'High';

export interface SubjectScore {
  subject: string;
  assignment: number;
  quiz: number;
  exam: number;
  overall: number;
  grade: string;
  trend: 'up' | 'down' | 'stable';
}

export interface HistoricalRecord {
  month: string;
  quizScore: number;
  assignmentScore: number;
  overallScore: number;
  attendance: number;
}

export interface StudentData {
  Student_ID: string;
  Name: string;
  Email: string;
  Age: number;
  Gender: 'Male' | 'Female' | 'Non-Binary';
  Education_Level: 'High School' | 'Undergraduate' | 'Postgraduate';
  Class_Grade: string; // e.g. "Grade 11-A" or "Year 2 CS"
  Attendance_Percent: number; // 0 - 100
  Study_Hours_Per_Day: number; // e.g. 1 - 10
  Assignment_Score: number; // 0 - 100
  Quiz_Score: number; // 0 - 100
  Previous_Score: number; // 0 - 100
  Sleep_Hours: number; // 4 - 10
  Motivation_Level: MotivationLevel;
  Learning_Style: LearningStyle;
  Internet_Access: 'Yes' | 'No';
  Parental_Support: ParentalSupport;
  Tutoring: 'Yes' | 'No';
  Extracurricular_Activity: 'Yes' | 'No';
  Stress_Level: StressLevel;
  Weak_Subject: string;
  Weak_Subject_Label?: string;
  Exam_Score: number; // 0 - 100
  Overall_Score: number; // 0 - 100
  Performance_Level: PerformanceLevel;
  Risk_Level: RiskLevel;
  Recommended_Action: string;
  
  // Extended fields for visualization and tracking
  Subjects: SubjectScore[];
  History: HistoricalRecord[];
  Intervention_Notes?: string[];
  Last_Updated?: string;
  isLiveDatabaseRecord?: boolean;
}

export interface TeacherData {
  id: string;
  name: string;
  email: string;
  department: string;
  subjects: string[];
  assignedClasses: string[];
  totalStudents: number;
  avgStudentScore: number;
  atRiskCount: number;
  satisfactionRating: number;
}

export interface MLPredictionInput {
  Attendance_Percent: number;
  Study_Hours_Per_Day: number;
  Assignment_Score: number;
  Quiz_Score: number;
  Previous_Score: number;
  Sleep_Hours: number;
  Motivation_Level: MotivationLevel;
  Parental_Support: ParentalSupport;
  Tutoring: 'Yes' | 'No';
  Internet_Access: 'Yes' | 'No';
  Stress_Level: StressLevel;
  Weak_Subject?: string;
}

export interface FeatureContribution {
  feature: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number; // -100 to 100
  description: string;
}

export interface MLPredictionOutput {
  predictedExamScore: number;
  predictedOverallScore: number;
  riskLevel: RiskLevel;
  riskProbability: number; // 0 - 100%
  performanceLevel: PerformanceLevel;
  identifiedWeakSubject: string;
  confidenceScore: number; // e.g. 88%
  recommendedAction: string;
  featureContributions: FeatureContribution[];
  keyRiskFactors: string[];
  protectiveFactors: string[];
}

export interface AIRecommendationPlan {
  summary: string;
  studySchedule: {
    day: string;
    focus: string;
    hours: number;
    techniques: string;
  }[];
  subjectInterventions: {
    subject: string;
    gapAnalysis: string;
    suggestedAction: string;
    targetScore: number;
  }[];
  lifestyleAdjustments: {
    category: 'Sleep' | 'Stress' | 'Motivation' | 'Time Management';
    recommendation: string;
    expectedImpact: string;
  }[];
  pedagogicalTip: string;
}

export interface CandidateStudent {
  student_id: number;
  name: string;
  age: number;
  gender: string;
  email: string | null;
  class_grade: string | null;
  current_gpa: number | null;
  risk_level: string | null;
  attendance_percent: number | null;
  isMapped: boolean;
  mappedUser: {
    id: string;
    email: string;
    fullName: string;
  } | null;
}
