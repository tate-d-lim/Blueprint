import { StartForm } from "./start-form";

export default function StartPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Tell us about your app</h1>
      <p className="mt-2 text-muted">
        A few questions, so we can work out which security requirements apply to you. It takes about a minute.
      </p>
      <StartForm />
    </div>
  );
}
