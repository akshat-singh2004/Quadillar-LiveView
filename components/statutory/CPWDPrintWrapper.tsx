import React from "react";
import { DigitalAuditFooter } from "./DigitalAuditFooter";

export interface CPWDPrintWrapperProps {
  children: React.ReactNode;
  formTitle: string;
  formReference: string;
  className?: string;
}

export const CPWDPrintWrapper: React.FC<CPWDPrintWrapperProps> = ({
  children,
  formTitle,
  formReference,
  className = "",
}) => {
  return (
    <div
      className={`w-full min-h-screen flex flex-col justify-between print:block print:w-full print:p-8 print:m-0 print:bg-white print:text-black ${className}`}
    >
      {/* Formal CPWD Statutory Header */}
      <header
        data-statutory-header
        className="flex flex-col items-center justify-center text-center pb-4 mb-6 border-b border-zinc-800 print:border-b-2 print:border-black"
      >
        <h1 className="font-serif text-base sm:text-lg md:text-xl font-bold tracking-wider uppercase text-zinc-100 print:text-black">
          GOVERNMENT OF INDIA - CENTRAL PUBLIC WORKS DEPARTMENT
        </h1>
        <div className="font-mono text-xs font-semibold tracking-widest uppercase text-zinc-400 print:text-black mt-1">
          {formReference}
        </div>
        {formTitle && (
          <h2 className="font-serif text-sm sm:text-base font-bold uppercase text-zinc-200 print:text-black mt-2 underline underline-offset-4">
            {formTitle}
          </h2>
        )}
      </header>

      {/* Primary Content Canvas (Data Tables / Ledger Breakdown) */}
      <main className="w-full flex-1 mb-8 print:mb-6">
        {children}
      </main>

      {/* Cryptographic Zero-Trust Print Audit Footer */}
      <DigitalAuditFooter />
    </div>
  );
};

export default CPWDPrintWrapper;
