"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main><h1>Administration is temporarily unavailable</h1><p role="alert">Your request could not be completed. Check your connection and current staff access before retrying.</p><button onClick={reset}>Try again</button></main>; }
