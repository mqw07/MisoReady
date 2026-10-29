import { PageHeader } from "../components/layout/PageHeader.tsx";
import { ButtonLink } from "../components/ui/Button.tsx";
import { usePageTitle } from "../hooks/usePageTitle.ts";

export function NotFoundPage() {
  usePageTitle("Page not found");

  return (
    <>
      <PageHeader title="Page not found" lede="That address is not part of Miso." />
      <ButtonLink to="/" variant="secondary">
        Back to Today
      </ButtonLink>
    </>
  );
}
