import SubmitReportForm from "@/components/staff/SubmitReportForm";
import { FileText } from "lucide-react";
import React from "react";

const page = () => {
  return (
    <div className="w-full h-full flex flex-col px-8 py-10">
      <div className="w-full flex flex-col gap-2 max-w-xl">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="text-text-primary font-extrabold text-3xl font-triakis">Submit New Report</h1>
        </div>
        <p className="text-muted-foreground text-sm sm:text-base">
          Make sure each report is carefully completed with accurate information
          and relevant details to ensure effective review and processing.
        </p>
      </div>

      <div className="mt-10">
        <SubmitReportForm/>
      </div>
    </div>
  );
};

export default page;
