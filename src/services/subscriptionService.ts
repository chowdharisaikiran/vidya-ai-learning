import { apiUrl, parseApiResponse } from '../lib/apiConfig';
import { getActiveAuthToken } from '../lib/supabase';
import { platformService, PLATFORM_PLANS } from './platformService';
import { SubscriptionPlanTier, SubscriptionBillingInterval } from '../types/platform';

export interface PlanFeatureDefinition {
  id: string;
  name: 'Basic' | 'Professional' | 'Enterprise';
  annualPriceINR: number;
  monthlyPriceINR: number;
  studentLimit: number;
  description: string;
  recommended?: boolean;
  colorTheme: 'blue' | 'indigo' | 'purple';
  features: string[];
}

export interface SubscriptionHistoryRecord {
  id: string;
  date: string;
  action: string;
  previousPlan?: string;
  newPlan: string;
  amount: number;
  billingCycle: 'Yearly' | 'Monthly' | 'annual' | 'monthly';
  status: string;
  note: string;
}

export interface InstitutionSubscriptionDetails {
  institutionId: string;
  institutionName: string;
  institutionCode: string;
  plan: 'Basic' | 'Professional' | 'Enterprise';
  status: 'Active' | 'Trial' | 'Expired' | 'Cancelled';
  billingCycle: 'Yearly' | 'Monthly';
  amount: number;
  currency: string;
  startDate: string;
  renewalDate: string;
  studentLimit: number;
  activeStudents: number;
  autoRenew: boolean;
  isDemoMode: boolean;
  paymentGatewayConfigured?: boolean;
  gatewayName?: string;
  notice?: string;
  history: SubscriptionHistoryRecord[];
}

export const AVAILABLE_PLANS: PlanFeatureDefinition[] = [
  {
    id: 'plan_basic',
    name: 'Basic',
    annualPriceINR: 199990, // ₹1,99,990/year
    monthlyPriceINR: 19999,  // ₹19,999/month
    studentLimit: 250,
    description: 'Essential academic tracking, automated attendance, and core student reports for small departments.',
    colorTheme: 'blue',
    features: [
      'Up to 250 Active Students',
      'Student & Faculty Directories',
      'Core Attendance & Gradebook Tracking',
      'Standard CSV Dataset Export',
      'Role-based access control (Admin, Teacher, Student)',
      'Basic Email Support (48h SLA)',
      'Community Documentation Access',
    ],
  },
  {
    id: 'plan_pro',
    name: 'Professional',
    annualPriceINR: 499990, // ₹4,99,990/year
    monthlyPriceINR: 49999,  // ₹49,999/month
    studentLimit: 750,
    description: 'Advanced AI predictive risk forecasting, ML early intervention, and multi-department analytics.',
    recommended: true,
    colorTheme: 'indigo',
    features: [
      'Up to 750 Active Students',
      'Everything in Basic Plan',
      'AI Academic Risk Prediction & Forecasting',
      'Machine Learning Intervention Engine',
      'Auto-matching Faculty-Student Mentor Assignments',
      'Departmental Analytics & Trend Benchmarks',
      'Bulk Data Ingestion & Sync',
      'Priority Support (12h SLA)',
    ],
  },
  {
    id: 'plan_enterprise',
    name: 'Enterprise',
    annualPriceINR: 1199990, // ₹11,99,990/year
    monthlyPriceINR: 119999,  // ₹1,19,999/month
    studentLimit: 2500,
    description: 'Full-scale institutional deployment with custom AI models, custom domain, and dedicated account management.',
    colorTheme: 'purple',
    features: [
      'Up to 2,500 Active Students',
      'Everything in Professional Plan',
      'Full-scale Multi-department Governance',
      'Dedicated Institutional Database & RLS Policy Enforcement',
      'Custom Machine Learning Feature Weights & Fine-tuning',
      'Automated SMS & WhatsApp Parent Alerts Workflow',
      'Dedicated Account Manager & 99.9% Uptime SLA',
      'Direct API Access & Priority SIS Integration',
    ],
  },
];

export function formatINR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getPlanTierRank(planName: string): number {
  switch (planName.toLowerCase()) {
    case 'basic':
      return 1;
    case 'professional':
    case 'pro':
      return 2;
    case 'enterprise':
      return 3;
    default:
      return 0;
  }
}

/**
 * Fetch current subscription details for the institution
 */
export async function fetchInstitutionSubscription(): Promise<{
  data: InstitutionSubscriptionDetails | null;
  error: string | null;
}> {
  try {
    const token = await getActiveAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(apiUrl('/api/admin/subscription'), {
      method: 'GET',
      headers,
    });

    const parsed = await parseApiResponse<{
      success: boolean;
      subscription: InstitutionSubscriptionDetails;
      isDemoMode?: boolean;
      paymentGatewayConfigured?: boolean;
      gatewayName?: string;
      notice?: string;
    }>(res, '/api/admin/subscription');

    if (parsed.ok && parsed.data && parsed.data.subscription) {
      const sub = parsed.data.subscription;
      sub.isDemoMode = parsed.data.isDemoMode ?? sub.isDemoMode ?? true;
      sub.paymentGatewayConfigured = parsed.data.paymentGatewayConfigured ?? sub.paymentGatewayConfigured ?? false;
      sub.gatewayName = parsed.data.gatewayName ?? sub.gatewayName;
      sub.notice = parsed.data.notice ?? sub.notice;
      try {
        const interval: SubscriptionBillingInterval = sub.billingCycle === 'Yearly' ? 'annual' : 'monthly';
        platformService.upgradeSubscription('INST-VIDYA-01', sub.plan, interval, sub.amount);
      } catch {}
      return { data: sub, error: null };
    }

    // Fallback to local platformService state if backend returned error or is in standalone mode
    console.warn('Backend subscription endpoint notice, checking local platform store:', parsed.error);
    const localSub = platformService.getSubscriptionByInstitutionId('INST-VIDYA-01');
    const localInst = platformService.getInstitutionById('INST-VIDYA-01');

    if (localSub) {
      const fallbackDetails: InstitutionSubscriptionDetails = {
        institutionId: localSub.institutionId,
        institutionName: localSub.institutionName,
        institutionCode: localInst?.code || 'VIDYA-MAIN',
        plan: (localSub.plan as any) || 'Enterprise',
        status: (localSub.status as any) || 'Active',
        billingCycle: localSub.billingInterval === 'annual' ? 'Yearly' : 'Monthly',
        amount: localSub.amount,
        currency: localSub.currency,
        startDate: localSub.startDate,
        renewalDate: localSub.renewalDate,
        studentLimit: localSub.studentQuota,
        activeStudents: localInst?.studentsCount || 297,
        autoRenew: localSub.autoRenew,
        isDemoMode: true,
        paymentGatewayConfigured: false,
        notice: 'Simulated administrative plan allocation. Real payment gateway is not integrated in this sandbox environment.',
        history: localSub.history.map((h) => ({
          id: h.id,
          date: h.date,
          action: h.action,
          previousPlan: h.previousPlan,
          newPlan: h.newPlan || localSub.plan,
          amount: h.amount || localSub.amount,
          billingCycle: localSub.billingInterval === 'annual' ? 'Yearly' : 'Monthly',
          status: 'Active',
          note: h.note,
        })),
      };
      return { data: fallbackDetails, error: null };
    }

    return { data: null, error: parsed.error || 'Failed to load subscription information.' };
  } catch (err: any) {
    console.error('Subscription fetch error:', err);
    return { data: null, error: err?.message || 'Network error fetching subscription.' };
  }
}

/**
 * Change or upgrade/downgrade subscription plan
 */
export async function changeInstitutionSubscription(
  targetPlan: 'Basic' | 'Professional' | 'Enterprise',
  billingCycle: 'Yearly' | 'Monthly'
): Promise<{
  success: boolean;
  message: string;
  subscription?: InstitutionSubscriptionDetails;
  error?: string;
}> {
  try {
    const token = await getActiveAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(apiUrl('/api/admin/subscription/change-plan'), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        targetPlan,
        billingCycle,
      }),
    });

    const parsed = await parseApiResponse<{
      success: boolean;
      message: string;
      subscription: InstitutionSubscriptionDetails;
    }>(res, '/api/admin/subscription/change-plan');

    // Also sync local platformService so platform views stay consistent
    const interval: SubscriptionBillingInterval = billingCycle === 'Yearly' ? 'annual' : 'monthly';
    platformService.upgradeSubscription('INST-VIDYA-01', targetPlan, interval);

    if (parsed.ok && parsed.data && parsed.data.success) {
      return {
        success: true,
        message: parsed.data.message || `Plan successfully changed to ${targetPlan}.`,
        subscription: parsed.data.subscription,
      };
    }

    // If server responded with an error, return it
    if (parsed.error) {
      return {
        success: false,
        message: parsed.error,
        error: parsed.error,
      };
    }

    return {
      success: true,
      message: `Plan successfully updated to ${targetPlan} (Administrative allocation).`,
    };
  } catch (err: any) {
    console.error('Subscription change error:', err);
    // If network failure, attempt graceful local store update
    try {
      const interval: SubscriptionBillingInterval = billingCycle === 'Yearly' ? 'annual' : 'monthly';
      const updated = platformService.upgradeSubscription('INST-VIDYA-01', targetPlan, interval);
      if (updated) {
        return {
          success: true,
          message: `Plan locally updated to ${targetPlan} (Offline simulated mode).`,
        };
      }
    } catch {}

    return {
      success: false,
      message: err?.message || 'Network error updating subscription plan.',
      error: err?.message,
    };
  }
}
