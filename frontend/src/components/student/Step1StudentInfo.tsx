import React, { useState } from "react";
import { StudentData } from "../../types";
import { User, CreditCard, Phone, ArrowRight, GraduationCap, CheckCircle } from "lucide-react";

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
    <div className="max-w-xl mx-auto px-4 pt-4 pb-8 sm:pt-6 sm:pb-12">
      {/* Hero Header */}
      <div className="mb-5 sm:mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent-subtle text-accent border border-accent/20 mb-2.5 shadow-2xs">
          <GraduationCap className="w-3.5 h-3.5 text-accent" />
          <span>Academic Print Submission</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
          Student Information
        </h1>
        <p className="text-xs sm:text-sm text-ink-secondary mt-1 leading-relaxed">
          Enter your academic details for project report tracking, billing verification, and physical print station binding.
        </p>
      </div>

      {/* Main Form Card */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-card border border-line">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-muted">
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
                className={`w-full pl-10 pr-3.5 py-2.5 bg-surface border rounded-xl text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all shadow-xs ${
                  errors.fullName ? "border-rose-400 bg-rose-50/30" : "border-line hover:border-line-dark"
                }`}
              />
            </div>
            {errors.fullName ? (
              <p className="text-xs text-rose-600 mt-1.5 font-medium">{errors.fullName}</p>
            ) : (
              <p className="text-[11px] text-ink-muted mt-1.5">
                Exact name printed on your project cover page and certificate.
              </p>
            )}
          </div>

          {/* Enrollment Number */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider">
                Enrollment Number (12 Digits) <span className="text-rose-500">*</span>
              </label>
              <span className={`text-[11px] font-mono font-medium ${
                enrollment.replace(/\D/g, "").length === 12 ? "text-emerald-700" : "text-ink-muted"
              }`}>
                {enrollment.replace(/\D/g, "").length}/12
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-muted">
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
                className={`w-full pl-10 pr-3.5 py-2.5 bg-surface border rounded-xl text-sm font-mono tracking-wide text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all shadow-xs ${
                  errors.enrollment ? "border-rose-400 bg-rose-50/30" : "border-line hover:border-line-dark"
                }`}
              />
            </div>
            {errors.enrollment ? (
              <p className="text-xs text-rose-600 mt-1.5 font-medium">{errors.enrollment}</p>
            ) : (
              <p className="text-[11px] text-ink-muted mt-1.5">
                Used to name your print bundle and sort reports chronologically.
              </p>
            )}
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
              Mobile Number (WhatsApp / SMS) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-muted">
                <Phone className="w-4 h-4" />
              </div>
              <span className="absolute inset-y-0 left-10 flex items-center text-xs text-ink-secondary font-mono font-semibold select-none border-r border-line pr-2">
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
                className={`w-full pl-20 pr-3.5 py-2.5 bg-surface border rounded-xl text-sm font-mono text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all shadow-xs ${
                  errors.mobile ? "border-rose-400 bg-rose-50/30" : "border-line hover:border-line-dark"
                }`}
              />
            </div>
            {errors.mobile ? (
              <p className="text-xs text-rose-600 mt-1.5 font-medium">{errors.mobile}</p>
            ) : (
              <p className="text-[11px] text-ink-muted mt-1.5">
                Used alongside your Order ID to retrieve digital receipts and order status.
              </p>
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-3">
            <button
              type="submit"
              className="w-full min-h-[48px] bg-gradient-to-r from-accent to-accent-light hover:from-accent-hover hover:to-accent text-surface text-sm font-semibold py-3 px-5 rounded-xl shadow-md shadow-accent/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
            >
              <span>Proceed to PDF Upload</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Assurance Note */}
      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-ink-muted">
        <CheckCircle className="w-3.5 h-3.5 text-accent shrink-0" />
        <span>Privacy Guaranteed • Files purged automatically after physical dispatch</span>
      </div>
    </div>
  );
};
