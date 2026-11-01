import {
  ReportUploadResponse,
  StudentData,
  OrderDetail,
  DashboardMetrics,
  OrderListItem,
  BatchSummary,
  BatchDetail,
} from "../types";

const BASE_URL = "/api/v1";

function getCsrfToken(): string | null {
  const match = document.cookie.match(/(^|;)\s*csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[2]) : sessionStorage.getItem("admin_csrf_token");
}

class ApiError extends Error {
  code?: string;
  details?: Record<string, any>;
  status: number;

  constructor(message: string, status: number, code?: string, details?: Record<string, any>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail: any = "An unexpected error occurred.";
    try {
      const data = await res.json();
      errorDetail = data.detail || errorDetail;
    } catch {
      // Non-JSON response
    }

    if (typeof errorDetail === "object" && errorDetail !== null) {
      throw new ApiError(
        errorDetail.message || "Request failed",
        res.status,
        errorDetail.code,
        errorDetail.details
      );
    }
    throw new ApiError(String(errorDetail), res.status);
  }
  return res.json();
}

export const api = {
  // Public Student Endpoints
  async uploadReport(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<ReportUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${BASE_URL}/reports/upload`);

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100);
            onProgress(pct);
          }
        };
      }

      xhr.onload = () => {
        try {
          const json = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(json);
          } else {
            const err = json.detail;
            if (typeof err === "object" && err !== null) {
              reject(new ApiError(err.message, xhr.status, err.code, err.details));
            } else {
              reject(new ApiError(err || "Upload failed", xhr.status));
            }
          }
        } catch {
          reject(new ApiError("Failed to parse server response", xhr.status));
        }
      };

      xhr.onerror = () => {
        reject(new ApiError("Network error during file upload. Check your internet connection.", 0));
      };

      xhr.send(formData);
    });
  },

  async verifyReport(
    reportId: string,
    confirmedHash: string,
    confirmedPageCount: number
  ): Promise<{ status: string }> {
    const res = await fetch(`${BASE_URL}/reports/${reportId}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        confirmed_hash: confirmedHash,
        confirmed_page_count: confirmedPageCount,
        is_final: true,
      }),
    });
    return handleResponse(res);
  },

  async createOrder(student: StudentData, reportId: string): Promise<OrderDetail> {
    const res = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: student.full_name,
        enrollment_number: student.enrollment_number,
        mobile_number: student.mobile_number,
        report_id: reportId,
      }),
    });
    return handleResponse(res);
  },

  async getOrder(orderId: string, mobile?: string): Promise<OrderDetail> {
    const url = new URL(`${BASE_URL}/orders/${orderId}`, window.location.origin);
    if (mobile) {
      url.searchParams.set("mobile", mobile);
    }
    const res = await fetch(url.toString());
    return handleResponse(res);
  },

  async submitPayment(
    orderId: string,
    utrNumber: string,
    payerVpa?: string,
    screenshot?: File
  ): Promise<OrderDetail> {
    const formData = new FormData();
    formData.append("utr_number", utrNumber);
    if (payerVpa) formData.append("payer_vpa", payerVpa);
    if (screenshot) formData.append("screenshot", screenshot);

    const res = await fetch(`${BASE_URL}/orders/${orderId}/payment`, {
      method: "POST",
      body: formData,
    });
    return handleResponse(res);
  },

  // Admin Endpoints
  async adminLogin(email: string, password: string): Promise<{ token: string; csrf_token?: string; admin: any }> {
    const res = await fetch(`${BASE_URL}/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse<{ token: string; csrf_token?: string; admin: any }>(res);
    if (data.csrf_token) {
      sessionStorage.setItem("admin_csrf_token", data.csrf_token);
    }
    return data;
  },

  async adminLogout(): Promise<void> {
    sessionStorage.removeItem("admin_csrf_token");
    const csrf = getCsrfToken();
    await fetch(`${BASE_URL}/admin/auth/logout`, {
      method: "POST",
      headers: csrf ? { "X-CSRF-Token": csrf } : {},
    });
  },

  async adminMe(): Promise<any> {
    const res = await fetch(`${BASE_URL}/admin/auth/me`);
    return handleResponse(res);
  },

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const res = await fetch(`${BASE_URL}/admin/dashboard/metrics`);
    return handleResponse(res);
  },

  async listOrders(params: {
    q?: string;
    payment_status?: string;
    print_status?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
    sort_by?: string;
    order_dir?: string;
  }): Promise<{ items: OrderListItem[]; total: number; page: number; pages: number }> {
    const url = new URL(`${BASE_URL}/admin/orders`, window.location.origin);
    if (params.q) url.searchParams.set("q", params.q);
    if (params.payment_status) url.searchParams.set("payment_status", params.payment_status);
    if (params.print_status) url.searchParams.set("print_status", params.print_status);
    if (params.date_from) url.searchParams.set("date_from", params.date_from);
    if (params.date_to) url.searchParams.set("date_to", params.date_to);
    if (params.page) url.searchParams.set("page", String(params.page));
    if (params.limit) url.searchParams.set("limit", String(params.limit));
    if (params.sort_by) url.searchParams.set("sort_by", params.sort_by);
    if (params.order_dir) url.searchParams.set("order_dir", params.order_dir);

    const res = await fetch(url.toString());
    return handleResponse(res);
  },

  async getAdminOrderDetail(orderId: string): Promise<OrderDetail> {
    const res = await fetch(`${BASE_URL}/admin/orders/${orderId}`);
    return handleResponse(res);
  },

  async confirmPayment(orderId: string, receivedAmount?: number): Promise<void> {
    const csrf = getCsrfToken();
    const res = await fetch(`${BASE_URL}/admin/orders/${orderId}/payment/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      },
      body: JSON.stringify({ received_amount: receivedAmount }),
    });
    return handleResponse(res);
  },

  async rejectPayment(orderId: string, reason: string): Promise<void> {
    const csrf = getCsrfToken();
    const res = await fetch(`${BASE_URL}/admin/orders/${orderId}/payment/reject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      },
      body: JSON.stringify({ reason }),
    });
    return handleResponse(res);
  },

  async updatePrintStatus(orderId: string, printStatus: string, note?: string): Promise<void> {
    const csrf = getCsrfToken();
    const res = await fetch(`${BASE_URL}/admin/orders/${orderId}/print-status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      },
      body: JSON.stringify({ print_status: printStatus, note }),
    });
    return handleResponse(res);
  },

  async createBatch(orderIds: string[], batchName?: string): Promise<any> {
    const csrf = getCsrfToken();
    const res = await fetch(`${BASE_URL}/admin/batches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      },
      body: JSON.stringify({ order_ids: orderIds, batch_name: batchName }),
    });
    return handleResponse(res);
  },

  async exportBatchZip(orderIds: string[]): Promise<Blob> {
    const csrf = getCsrfToken();
    const res = await fetch(`${BASE_URL}/admin/batches/export-zip`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      },
      body: JSON.stringify({ order_ids: orderIds }),
    });
    if (!res.ok) throw new ApiError("Failed to generate ZIP download", res.status);
    return res.blob();
  },

  async listBatches(): Promise<{ batches: BatchSummary[] }> {
    const res = await fetch(`${BASE_URL}/admin/batches`);
    return handleResponse(res);
  },

  async getBatchDetail(batchId: string, sortBy = "enrollment", orderDir = "asc"): Promise<BatchDetail> {
    const url = new URL(`${BASE_URL}/admin/batches/${batchId}`, window.location.origin);
    url.searchParams.set("sort_by", sortBy);
    url.searchParams.set("order_dir", orderDir);
    const res = await fetch(url.toString());
    return handleResponse(res);
  },

  async toggleBatchOrderComplete(batchId: string, orderId: string): Promise<any> {
    const csrf = getCsrfToken();
    const res = await fetch(`${BASE_URL}/admin/batches/${batchId}/orders/${orderId}/toggle-complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      },
    });
    return handleResponse(res);
  },
};
