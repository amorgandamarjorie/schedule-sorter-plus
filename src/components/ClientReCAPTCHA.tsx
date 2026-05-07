import { lazy, Suspense, useEffect, useState, forwardRef } from "react";
import type ReCAPTCHA from "react-google-recaptcha";

const LazyReCAPTCHA = lazy(() => import("react-google-recaptcha"));

interface Props {
  sitekey: string;
  onChange: (token: string | null) => void;
}

export const ClientReCAPTCHA = forwardRef<ReCAPTCHA, Props>(function ClientReCAPTCHA(props, ref) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div style={{ height: 78 }} />;
  return (
    <Suspense fallback={<div style={{ height: 78 }} />}>
      <LazyReCAPTCHA ref={ref} {...props} />
    </Suspense>
  );
});
