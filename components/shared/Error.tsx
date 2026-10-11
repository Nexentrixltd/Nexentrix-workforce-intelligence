
import { AlertTriangle, RefreshCw } from "lucide-react";

export function Error({heading} : {heading: string}) {
  return (
    <div className="flex min-h-100 items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
          <AlertTriangle className="h-7 w-7 text-amber-600" />
        </div>

        <h2 className="text-xl font-bold text-slate-900">
         {heading}
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          We couldn't get what your'e looking for. This may be due to
          an unstable network connection. Please check your internet
          connection and try again.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  );
}

