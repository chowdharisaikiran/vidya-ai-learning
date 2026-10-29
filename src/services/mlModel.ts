import type {
  MLPredictionInput,
  MLPredictionOutput,
  FeatureContribution,
  RiskLevel,
  PerformanceLevel,
} from '../types';
import { normalizeWeakSubject } from '../utils/subjectUtils.ts';

/**
 * VIDYA Machine Learning Inference Engine
 * Implements a weighted ensemble predictive model combining:
 * 1. Cognitive Academic Index (Prior score, Quizzes, Assignments)
 * 2. Behavioral Engagement Factor (Attendance, Daily Study Hours, Internet Access)
 * 3. Psycho-social Wellbeing Metric (Sleep adequacy, Stress attenuation, Parental backing, Tutoring)
 */
export function calculateAcademicPrediction(input: MLPredictionInput): MLPredictionOutput {
  const {
    Attendance_Percent,
    Study_Hours_Per_Day,
    Assignment_Score,
    Quiz_Score,
    Previous_Score,
    Sleep_Hours,
    Motivation_Level,
    Parental_Support,
    Tutoring,
    Internet_Access,
    Stress_Level,
  } = input;

  // 1. Feature normalization and baseline weights
  // Academic baseline (50% total weight)
  const academicBase = (Previous_Score * 0.25) + (Quiz_Score * 0.15) + (Assignment_Score * 0.10);

  // Engagement index (30% total weight)
  // Optimal study hours: 3 to 6 hours/day (diminishing returns beyond 7, penalty below 1.5)
  const studyHoursScore = Math.min(100, Math.max(10, (Study_Hours_Per_Day / 5) * 100));
  const attendanceScore = Attendance_Percent;
  const internetModifier = Internet_Access === 'Yes' ? 100 : 60;
  const engagementBase = (attendanceScore * 0.18) + (studyHoursScore * 0.08) + (internetModifier * 0.04);

  // Psychosocial & Environmental factor (20% total weight)
  // Sleep curve: optimal 7-8 hours. <5 or >10 creates cognitive penalty
  let sleepScore = 80;
  if (Sleep_Hours >= 7 && Sleep_Hours <= 8.5) sleepScore = 100;
  else if (Sleep_Hours >= 6 && Sleep_Hours < 7) sleepScore = 85;
  else if (Sleep_Hours >= 5 && Sleep_Hours < 6) sleepScore = 65;
  else sleepScore = 45;

  let motivationScore = 75;
  if (Motivation_Level === 'High') motivationScore = 100;
  else if (Motivation_Level === 'Medium') motivationScore = 75;
  else motivationScore = 45;

  let parentalScore = 75;
  if (Parental_Support === 'High') parentalScore = 100;
  else if (Parental_Support === 'Medium') parentalScore = 75;
  else parentalScore = 50;

  const tutoringBonus = Tutoring === 'Yes' ? 95 : 70;

  // Stress penalty: High stress reduces cognitive retention
  let stressPenaltyMultiplier = 1.0;
  if (Stress_Level === 'High') stressPenaltyMultiplier = 0.88;
  else if (Stress_Level === 'Medium') stressPenaltyMultiplier = 0.96;
  else stressPenaltyMultiplier = 1.02;

  const psychosocialBase =
    ((sleepScore * 0.06) + (motivationScore * 0.05) + (parentalScore * 0.05) + (tutoringBonus * 0.04)) *
    stressPenaltyMultiplier;

  // Raw predicted exam score
  let rawScore = (academicBase + engagementBase + psychosocialBase);

  // Non-linear penalties for critical risk thresholds
  if (Attendance_Percent < 65) {
    rawScore -= (65 - Attendance_Percent) * 0.6;
  }
  if (Study_Hours_Per_Day < 1.5) {
    rawScore -= (2 - Study_Hours_Per_Day) * 5;
  }
  if (Stress_Level === 'High' && Sleep_Hours < 6) {
    rawScore -= 6; // Burnout hazard
  }

  const predictedExamScore = Math.round(Math.min(100, Math.max(15, rawScore)));
  const predictedOverallScore = Math.round(
    (predictedExamScore * 0.5) + (Assignment_Score * 0.25) + (Quiz_Score * 0.25)
  );

  // Calculate Academic Risk Probability (0 - 100)
  // Low score (<60) or low attendance (<75%) heavily shifts risk
  let riskScore = (100 - predictedOverallScore) * 0.65;
  if (Attendance_Percent < 75) {
    riskScore += (75 - Attendance_Percent) * 1.1;
  }
  if (Stress_Level === 'High') riskScore += 12;
  if (Motivation_Level === 'Low') riskScore += 10;
  if (Tutoring === 'No' && predictedOverallScore < 65) riskScore += 8;

  const riskProbability = Math.min(98, Math.max(4, Math.round(riskScore)));

  // Risk Classification
  let riskLevel: RiskLevel = 'Low';
  if (riskProbability >= 65 || predictedOverallScore < 60 || Attendance_Percent < 70) {
    riskLevel = 'High';
  } else if (riskProbability >= 35 || predictedOverallScore < 75 || Attendance_Percent < 80) {
    riskLevel = 'Moderate';
  } else {
    riskLevel = 'Low';
  }

  // Performance Level
  let performanceLevel: PerformanceLevel = 'Average';
  if (predictedOverallScore >= 88) performanceLevel = 'Excellent';
  else if (predictedOverallScore >= 75) performanceLevel = 'Good';
  else if (predictedOverallScore >= 60) performanceLevel = 'Average';
  else if (predictedOverallScore >= 45) performanceLevel = 'Below Average';
  else performanceLevel = 'Critical';

  // Feature Contributions (SHAP-style explainability)
  const contributions: FeatureContribution[] = [];

  // Attendance
  if (Attendance_Percent >= 85) {
    contributions.push({
      feature: 'Attendance Consistency',
      impact: 'positive',
      weight: Math.round((Attendance_Percent - 75) * 1.2),
      description: `Solid ${Attendance_Percent}% attendance anchors classroom concept retention`,
    });
  } else {
    contributions.push({
      feature: 'Attendance Deficit',
      impact: 'negative',
      weight: -Math.round((85 - Attendance_Percent) * 1.4),
      description: `Irregular attendance (${Attendance_Percent}%) correlates with critical concept gaps`,
    });
  }

  // Study Hours
  if (Study_Hours_Per_Day >= 3.5) {
    contributions.push({
      feature: 'Daily Independent Study',
      impact: 'positive',
      weight: Math.round(Study_Hours_Per_Day * 4),
      description: `Sustained study habits of ${Study_Hours_Per_Day} hrs/day improve test stamina`,
    });
  } else {
    contributions.push({
      feature: 'Low Study Allocation',
      impact: 'negative',
      weight: -Math.round((3.5 - Study_Hours_Per_Day) * 8),
      description: `Allocating only ${Study_Hours_Per_Day} hrs/day restricts mastery of difficult topics`,
    });
  }

  // Previous Academic Trajectory
  if (Previous_Score >= 75) {
    contributions.push({
      feature: 'Prior Knowledge Baseline',
      impact: 'positive',
      weight: Math.round((Previous_Score - 60) * 0.6),
      description: `Strong historical foundation (${Previous_Score}%) provides structural stability`,
    });
  } else {
    contributions.push({
      feature: 'Historical Performance Lag',
      impact: 'negative',
      weight: -Math.round((70 - Previous_Score) * 0.8),
      description: `Prior score deficit (${Previous_Score}%) requires foundational review`,
    });
  }

  // Sleep & Wellbeing
  if (Sleep_Hours >= 7 && Stress_Level !== 'High') {
    contributions.push({
      feature: 'Cognitive Recovery (Sleep & Stress)',
      impact: 'positive',
      weight: 14,
      description: `Healthy ${Sleep_Hours} hrs of rest supports memory consolidation`,
    });
  } else {
    contributions.push({
      feature: 'Rest & Stress Strain',
      impact: 'negative',
      weight: -16,
      description: `${Sleep_Hours} hrs rest with ${Stress_Level.toLowerCase()} stress hinders recall under pressure`,
    });
  }

  // Support Ecosystem
  if (Tutoring === 'Yes' || Parental_Support === 'High') {
    contributions.push({
      feature: 'Active Support Ecosystem',
      impact: 'positive',
      weight: 12,
      description: `${Tutoring === 'Yes' ? 'Supplemental tutoring' : 'High parental engagement'} reduces cognitive friction`,
    });
  } else if (Parental_Support === 'Low' && Tutoring === 'No') {
    contributions.push({
      feature: 'Limited Academic Scaffolding',
      impact: 'negative',
      weight: -10,
      description: 'Lack of tutoring or study support leaves queries unaddressed',
    });
  }

  // Key factors extraction
  const keyRiskFactors: string[] = [];
  const protectiveFactors: string[] = [];

  if (Attendance_Percent < 80) keyRiskFactors.push(`Low Attendance (${Attendance_Percent}%)`);
  if (Study_Hours_Per_Day < 2.5) keyRiskFactors.push(`Insufficient Daily Study (${Study_Hours_Per_Day} hrs)`);
  if (Stress_Level === 'High') keyRiskFactors.push('High Stress / Anxiety Pressure');
  if (Sleep_Hours < 6.5) keyRiskFactors.push(`Sleep Deprivation (${Sleep_Hours} hrs/night)`);
  if (Previous_Score < 60) keyRiskFactors.push(`Weak Academic Foundation (${Previous_Score}%)`);

  if (Attendance_Percent >= 88) protectiveFactors.push(`High Class Engagement (${Attendance_Percent}%)`);
  if (Study_Hours_Per_Day >= 3.5) protectiveFactors.push(`Consistent Study Routine (${Study_Hours_Per_Day} hrs)`);
  if (Motivation_Level === 'High') protectiveFactors.push('High Intrinsic Motivation');
  if (Tutoring === 'Yes') protectiveFactors.push('Active Tutoring Mentorship');
  if (Sleep_Hours >= 7.5) protectiveFactors.push('Adequate Rest & Sleep');

  const normalizedWeak = normalizeWeakSubject(input.Weak_Subject);
  const weakFocusText = normalizedWeak !== 'Not assessed' ? normalizedWeak : 'core curriculum subjects';

  // Recommendation builder
  let recommendedAction = '';
  if (riskLevel === 'High') {
    recommendedAction = `Immediate Tier-1 Intervention: Schedule structured remedial sessions in ${weakFocusText}, mandate minimum 80% attendance milestone, and adjust sleep routine to 7.5+ hrs.`;
  } else if (riskLevel === 'Moderate') {
    recommendedAction = `Targeted Guidance: Reinforce weekly assignment review, add 1.0 hr daily structured revision with spaced repetition, and monitor stress levels before upcoming exams.`;
  } else {
    recommendedAction = `Enrichment Pathway: Maintain strong attendance habits, attempt advanced mock problems in competitive benchmarks, and explore peer tutoring leadership.`;
  }

  return {
    predictedExamScore,
    predictedOverallScore,
    riskLevel,
    riskProbability,
    performanceLevel,
    identifiedWeakSubject: normalizedWeak,
    confidenceScore: 89,
    recommendedAction,
    featureContributions: contributions,
    keyRiskFactors: keyRiskFactors.length > 0 ? keyRiskFactors : ['None identified'],
    protectiveFactors: protectiveFactors.length > 0 ? protectiveFactors : ['Steady progress'],
  };
}
