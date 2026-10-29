export type InstitutionType = 'school' | 'college' | 'university' | 'coaching_institute';
export type InstitutionStatus = 'Active' | 'Trial' | 'Suspended' | 'Expired';
export type SubscriptionPlanTier = 'Basic' | 'Professional' | 'Enterprise';
export type SubscriptionBillingInterval = 'monthly' | 'annual';
export type SubscriptionStatus = 'Active' | 'Trial' | 'Past Due' | 'Cancelled' | 'Expired';
export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'void' | 'refunded';

export interface PlatformInstitution {
  id: string; // Unique ID (e.g., 'INST-VIDYA-01')
  name: string;
  code: string; // Unique short code (e.g., 'VIT-HYD')
  slug: string;
  type: InstitutionType;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  registrationDate: string; // ISO date string
  plan: SubscriptionPlanTier;
  billingInterval: SubscriptionBillingInterval;
  subscriptionStartDate: string;
  subscriptionExpiryDate: string;
  studentsCount: number;
  staffCount: number;
  status: InstitutionStatus;
  studentLimit: number;
  storageUsedGB: number;
  totalStorageGB: number;
  aiPredictionsEnabled: boolean;
  customBrandingEnabled: boolean;
  notes?: string;
  isPrimaryDefaultTenant?: boolean; // True for the founding Vidya institution
}

export interface PlatformSubscription {
  id: string;
  institutionId: string;
  institutionName: string;
  plan: SubscriptionPlanTier;
  billingInterval: SubscriptionBillingInterval;
  amount: number;
  currency: string; // 'INR' or 'USD'
  startDate: string;
  renewalDate: string;
  expiryDate: string;
  status: SubscriptionStatus;
  autoRenew: boolean;
  studentQuota: number;
  features: {
    aiPredictions: boolean;
    advancedAnalytics: boolean;
    customDomain: boolean;
    dedicatedAccountManager: boolean;
    smsNotifications: boolean;
    prioritySupport: boolean;
  };
  history: {
    id: string;
    date: string;
    action: string;
    previousPlan?: string;
    newPlan?: string;
    note: string;
    amount?: number;
  }[];
}

export interface PlatformInvoice {
  id: string;
  invoiceNumber: string; // e.g. 'INV-2026-1042'
  institutionId: string;
  institutionName: string;
  subscriptionId: string;
  planName: string;
  amount: number;
  currency: string; // default 'INR'
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  status: InvoiceStatus;
  isVerifiedLivePayment: boolean; // Enforces Rule 7: strict verified revenue separation
  paymentMethod?: 'UPI / NetBanking' | 'Bank Wire (NEFT/RTGS)' | 'Credit Card' | 'Corporate ACH';
  transactionReference?: string;
  taxAmount?: number;
  discountAmount?: number;
  billingContactEmail: string;
  notes?: string;
}

export interface PlatformPlanDefinition {
  id: string;
  name: SubscriptionPlanTier;
  monthlyPriceINR: number;
  annualPriceINR: number;
  monthlyPriceUSD: number;
  annualPriceUSD: number;
  studentQuota: number;
  description: string;
  features: string[];
  recommended?: boolean;
  colorTheme: string;
}

export interface PlatformSupportTicket {
  id: string;
  ticketNumber: string;
  institutionId: string;
  institutionName: string;
  submittedBy: string;
  contactEmail: string;
  subject: string;
  category: 'Technical' | 'Billing' | 'Academic Setup' | 'Feature Request' | 'Security';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  createdAt: string;
  updatedAt: string;
  lastReply?: string;
}

export interface PlatformAuditLog {
  id: string;
  actor: string;
  actorRole: string;
  action: string;
  target: string;
  category: 'AUTH' | 'SUBSCRIPTION' | 'BILLING' | 'INSTITUTION' | 'SECURITY';
  ipAddress: string;
  timestamp: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILURE';
  details?: string;
}

export interface PlatformOverviewMetrics {
  totalRegisteredInstitutions: number;
  activeInstitutions: number;
  trialInstitutions: number;
  suspendedInstitutions: number;
  totalRevenueCollected: number; // In selected currency (INR by default)
  totalPendingInvoicesAmount: number;
  totalOverdueInvoicesAmount: number;
  activeSubscriptionsCount: number;
  totalStudentsAcrossInstitutions: number;
  totalStaffAcrossInstitutions: number;
  totalRegisteredUsers: number;
  currency: string;
  isVerifiedMode: boolean; // Verified live payments vs sandbox
}
