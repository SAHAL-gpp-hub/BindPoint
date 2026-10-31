import React, { useState } from "react";
import { StudentData } from "../../types";
import { User, CreditCard, Phone, ArrowRight } from "lucide-react";

interface Step1Props {
  data: StudentData;
  onComplete: (data: StudentData) => void;
}

export const Step1StudentInfo: React.FC<Step1Props> = ({ data, onComplete }) => {
  const [fullName, setFullName] = useState(data.full_name || "");
  const [enrollment, setEnrollment] = useState(data.enrollment_number || "");
  const [mobile, setMobile] = useState(data.mobile_number || "");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const errs: { [key: string]: string } = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      errs.fullName = "Please enter your full name (as per university ID).";
    }

    const cleanEnrollment = enrollment.trim();
    if (!/^\d{12}$/.test(cleanEnrollment)) {
      errs.enrollment = "Enrollment number must be exactly 12 numeric digits.";
    }

    const cleanMobile = mobile.trim();
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      errs.mobile = "Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onComplete({
        full_name: fullName.trim(),
        enrollment_number: enrollment.trim(),
        mobile_number: mobile.trim(),
      });
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink">
          Student Information
        </h1>
        <p className="text-xs sm:text-sm text-ink-secondary mt-1">
          Enter your academic details for project report tracking and physical print station binding.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
            Full Name <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-muted">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              autoComplete="name"
              placeholder="e.g. Aarav Patel"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: "" }));
              }}
              className={`w-full pl-9 pr-3 py-2.5 bg-surface border rounded text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent ${
                errors.fullName ? "border-red-400 bg-red-50/20" : "border-line"
              }`}
            />
          </div>
          {errors.fullName && (
            <p className="text-xs text-red-600 mt-1 font-medium">{errors.fullName}</p>
          )}
        </div>

        {/* Enrollment Number */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-ink uppercase tracking-wider">
              Enrollment Number (12 Digits) <span className="text-red-600">*</span>
            </label>
            <span className="text-[11px] font-mono text-ink-muted">
              {enrollment.replace(/\D/g, "").length}/12
            </span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-muted">
              <CreditCard className="w-4 h-4" />
            </div>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={12}
              required
              placeholder="e.g. 210012345678"
              value={enrollment}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 12);
                setEnrollment(val);
                if (errors.enrollment) setErrors((prev) => ({ ...prev, enrollment: "" }));
              }}
              className={`w-full pl-9 pr-3 py-2.5 bg-surface border rounded text-sm font-mono tracking-wide text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent ${
                errors.enrollment ? "border-red-400 bg-red-50/20" : "border-line"
              }`}
            />
          </div>
          {errors.enrollment ? (
            <p className="text-xs text-red-600 mt-1 font-medium">{errors.enrollment}</p>
          ) : (
            <p className="text-[11px] text-ink-muted mt-1">
              Your report file will be organized and named using this enrollment number.
            </p>
          )}
        </div>

        {/* Mobile Number */}
        <div>
          <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
            Mobile Number (WhatsApp / SMS) <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-muted">
              <Phone className="w-4 h-4" />
            </div>
            <span className="absolute inset-y-0 left-9 flex items-center text-xs text-ink-muted font-mono select-none">
              +91
            </span>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              required
              autoComplete="tel"
              placeholder="9876543210"
              value={mobile}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                setMobile(val);
                if (errors.mobile) setErrors((prev) => ({ ...prev, mobile: "" }));
              }}
              className={`w-full pl-16 pr-3 py-2.5 bg-surface border rounded text-sm font-mono text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent ${
                errors.mobile ? "border-red-400 bg-red-50/20" : "border-line"
              }`}
            />
          </div>
          {errors.mobile ? (
            <p className="text-xs text-red-600 mt-1 font-medium">{errors.mobile}</p>
          ) : (
            <p className="text-[11px] text-ink-muted mt-1">
              Used alongside your Order ID to retrieve your receipt and track completion.
            </p>
          )}
        </div>

        {/* Sticky Action on Mobile, Standard on Desktop */}
        <div className="pt-4 sm:pt-6">
          <button
            type="submit"
            className="w-full min-h-[48px] bg-accent hover:bg-accent-hover active:bg-accent text-surface text-sm font-medium py-3 px-4 rounded shadow-subtle flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span>Proceed to PDF Upload</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
