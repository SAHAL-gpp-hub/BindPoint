export interface PricingBreakdown {
  total_pages: number;
  colour_pages: number;
  normal_sheets: number;
  special_sheets: number;
  printed_sides: number;
  blank_sides: number;
  special_paper_cost: string | number;
  colour_printing_cost: string | number;
  total_amount: string | number;
}

export interface ReportUploadResponse {
  report_id: string;
  original_filename: string;
  file_size_bytes: number;
  page_count: number;
  pdf_hash: string;
  breakdown: PricingBreakdown;
  preview_token: string;
}

export interface StudentData {
  full_name: string;
  enrollment_number: string;
  mobile_number: string;
}

export interface PaymentSummary {
  amount: number;
  utr_number?: string | null;
  payer_vpa?: string | null;
  status: string;
  rejection_reason?: string | null;
  screenshot_url?: string | null;
  created_at: string;
}

export interface ActivityLogEntry {
  actor_type: string;
  from_state?: string | null;
  to_state: string;
  note?: string | null;
  created_at: string;
}

export interface OrderDetail {
  order_id: string;
  student: StudentData;
  report: {
    id: string;
    original_filename: string;
    file_size: number;
    page_count: number;
    pdf_hash: string;
    breakdown: PricingBreakdown;
  };
  payment_status: "Pending" | "Verification Required" | "Successful" | "Failed" | "Cancelled";
  print_status: "Submitted" | "Ready for Printing" | "Printing" | "Completed" | "Cancelled";
  upi_id: string;
  payee_name: string;
  upi_deep_link: string;
  qr_data: string;
  collection_instructions: string;
  payment?: PaymentSummary | null;
  timeline: ActivityLogEntry[];
  created_at: string;
  completed_at?: string | null;
}

export interface DashboardMetrics {
  total_submissions: number;
  total_reports_received: number;
  pending_payments: number;
  verification_required_payments: number;
  confirmed_payments: number;
  ready_for_printing: number;
  currently_printing: number;
  completed_reports: number;
  total_confirmed_revenue: number;
}

export interface OrderListItem {
  order_id: string;
  student_name: string;
  enrollment_number: string;
  mobile_number: string;
  original_filename: string;
  page_count: number;
  total_amount: number;
  payment_status: string;
  print_status: string;
  utr_number?: string | null;
  payer_vpa?: string | null;
  screenshot_url?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface BatchSummary {
  id: string;
  batch_name: string;
  created_at: string;
  total_reports: number;
  total_pages: number;
  total_sheets: number;
  completed_reports: number;
  progress_percent: number;
}

export interface BatchOrderItem {
  order_id: string;
  student_name: string;
  enrollment_number: string;
  mobile_number: string;
  original_filename: string;
  page_count: number;
  total_sheets: number;
  total_amount: number;
  print_status: string;
  created_at: string;
  completed_at?: string | null;
}

export interface BatchDetail extends BatchSummary {
  orders: BatchOrderItem[];
}
