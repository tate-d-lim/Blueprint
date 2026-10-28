import { StartForm } from "./start-form";

export default function StartPage() {
  return (
    <div className="sgds:mx-auto sgds:flex sgds:max-w-container-lg sgds:flex-col sgds:gap-layout-md">
      <div className="sgds:flex sgds:flex-col sgds:gap-text-sm">
        <h1 className="sgds:text-heading-lg sgds:font-semibold sgds:text-default">Tell us about your app</h1>
        <p className="sgds:text-body-lg sgds:text-subtle">
          A few questions, so we can work out which security requirements apply to you. It takes about a minute.
        </p>
      </div>
      <StartForm />
    </div>
  );
}
