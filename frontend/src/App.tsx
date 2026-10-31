import React, { useState, useEffect } from "react";
import { StudentData, ReportUploadResponse, OrderDetail } from "./types";
import { api } from "./lib/api";
import { Header } from "./components/ui/Header";
import { Stepper } from "./components/ui/Stepper";
import { Step1StudentInfo } from "./components/student/Step1StudentInfo";
import { Step2Upload } from "./components/student/Step2Upload";
import { Step3CostBreakdown } from "./components/student/Step3CostBreakdown";
import { Step4PdfViewer } from "./components/student/Step4PdfViewer";
import { Step5Payment } from "./components/student/Step5Payment";
import { Step6Confirmation } from "./components/student/Step6Confirmation";
import { OrderStatusLookupModal } from "./components/student/OrderStatusLookupModal";
import { AdminLoginModal } from "./components/admin/AdminLoginModal";
import { AdminDashboard } from "./components/admin/AdminDashboard";

export const App: React.FC = () => {
  // Stepper state (1..6)
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const saved = localStorage.getItem("printstation_step");
    return saved ? parseInt(saved, 10) : 1;
  });

  // Persistent student details
  const [student, setStudent] = useState<StudentData>(() => {
    const saved = localStorage.getItem("printstation_student");
    return saved ? JSON.parse(saved) : { full_name: "", enrollment_number: "", mobile_number: "" };
  });

  // Active uploaded report
  const [report, setReport] = useState<ReportUploadResponse | null>(() => {
    const saved = sessionStorage.getItem("printstation_report");
    return saved ? JSON.parse(saved) : null;
  });

  // Active order
  const [order, setOrder] = useState<OrderDetail | null>(() => {
    const saved = localStorage.getItem("printstation_order");
    return saved ? JSON.parse(saved) : null;
  });

  // Admin authentication state
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showAdminView, setShowAdminView] = useState<boolean>(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState<boolean>(false);

  // Status lookup modal
  const [showLookupModal, setShowLookupModal] = useState<boolean>(false);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("printstation_step", currentStep.toString());
  }, [currentStep]);

  useEffect(() => {
    localStorage.setItem("printstation_student", JSON.stringify(student));
  }, [student]);

  useEffect(() => {
    if (report) sessionStorage.setItem("printstation_report", JSON.stringify(report));
    else sessionStorage.removeItem("printstation_report");
  }, [report]);

  useEffect(() => {
    if (order) localStorage.setItem("printstation_order", JSON.stringify(order));
    else localStorage.removeItem("printstation_order");
  }, [order]);

  // Check admin session on startup
  useEffect(() => {
    api.adminMe()
      .then(() => setIsAdmin(true))
      .catch(() => setIsAdmin(false));
  }, []);

  // Step 1 Complete
  const handleStudentInfoComplete = (data: StudentData) => {
    setStudent(data);
    setCurrentStep(2);
  };

  // Step 2 Complete
  const handleUploadSuccess = (uploaded: ReportUploadResponse) => {
    setReport(uploaded);
    setCurrentStep(3);
  };

  // Step 3 Complete
  const handleCostProceed = () => {
    setCurrentStep(4);
  };

  // Step 4: Verification Complete ("My PDF is final") -> Create Order & proceed to Step 5
  const handleVerified = async () => {
    if (!report) return;

    try {
      const createdOrder = await api.createOrder(student, report.report_id);
      setOrder(createdOrder);
      setCurrentStep(5);
    } catch (err: any) {
      alert(err.message || "Failed to create order. Please try again.");
    }
  };

  // Step 4: "I need to make changes" -> Return to Step 2
  const handleNeedsChanges = () => {
    setCurrentStep(2);
  };

  // Step 5: Payment Submitted (UTR submitted) -> Move to Step 6
  const handlePaymentSubmitted = (updatedOrder: OrderDetail) => {
    setOrder(updatedOrder);
    setCurrentStep(6);
  };

  // Reset entire flow for a new report
  const handleResetFlow = () => {
    setReport(null);
    setOrder(null);
    setCurrentStep(1);
    sessionStorage.removeItem("printstation_report");
    localStorage.removeItem("printstation_order");
  };

  const handleAdminClick = () => {
    if (isAdmin) {
      setShowAdminView(!showAdminView);
    } else {
      setShowAdminLoginModal(true);
    }
  };

  const handleAdminLogout = async () => {
    await api.adminLogout();
    setIsAdmin(false);
    setShowAdminView(false);
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans">
      <Header
        onOpenStatusLookup={() => setShowLookupModal(true)}
        isAdmin={isAdmin}
        onAdminClick={handleAdminClick}
      />

      {showAdminView && isAdmin ? (
        <main className="flex-1">
          <AdminDashboard onLogout={handleAdminLogout} />
        </main>
      ) : (
        <main className="flex-1 flex flex-col">
          <Stepper
            currentStep={currentStep}
            onStepClick={(step) => {
              if (step < currentStep) setCurrentStep(step);
            }}
          />

          <div className="flex-1">
            {currentStep === 1 && (
              <Step1StudentInfo data={student} onComplete={handleStudentInfoComplete} />
            )}

            {currentStep === 2 && (
              <Step2Upload
                currentReport={report}
                onUploadSuccess={handleUploadSuccess}
                onBack={() => setCurrentStep(1)}
              />
            )}

            {currentStep === 3 && report && (
              <Step3CostBreakdown
                report={report}
                onProceed={handleCostProceed}
                onBack={() => setCurrentStep(2)}
              />
            )}

            {currentStep === 4 && report && (
              <Step4PdfViewer
                report={report}
                onVerified={handleVerified}
                onNeedsChanges={handleNeedsChanges}
              />
            )}

            {currentStep === 5 && order && (
              <Step5Payment
                order={order}
                onPaymentSubmitted={handlePaymentSubmitted}
              />
            )}

            {currentStep === 6 && order && (
              <Step6Confirmation
                initialOrder={order}
                onReset={handleResetFlow}
              />
            )}
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="border-t border-line py-4 px-4 bg-surface text-center text-xs text-ink-muted">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>College Project Report Printing Station • Operational Duplex Dispatch</span>
          <span className="font-mono text-[11px]">A4 Standard • Manual UPI Verification</span>
        </div>
      </footer>

      {/* Lookup & Login Modals */}
      <OrderStatusLookupModal
        isOpen={showLookupModal}
        onClose={() => setShowLookupModal(false)}
        onOrderFound={(foundOrder) => {
          setOrder(foundOrder);
          setCurrentStep(6);
        }}
      />

      <AdminLoginModal
        isOpen={showAdminLoginModal}
        onClose={() => setShowAdminLoginModal(false)}
        onLoginSuccess={() => {
          setIsAdmin(true);
          setShowAdminView(true);
        }}
      />
    </div>
  );
};

export default App;
