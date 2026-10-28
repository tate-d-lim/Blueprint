import { PageHeader } from "@/app/ui/panel";
import { StartForm } from "./start-form";

export default function StartPage() {
  return (
    <div className="flex max-w-page flex-col gap-8">
      <PageHeader title="Tell us about your app">
        A few questions, so we can work out which security requirements apply to you. It takes about a minute.
      </PageHeader>
      <StartForm />
    </div>
  );
}
