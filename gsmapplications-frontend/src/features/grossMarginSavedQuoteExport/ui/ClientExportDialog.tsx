import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Field } from "@/shared/ui/field";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/shared/ui/dialog";

// Asked before the client sheet is built: who the proposal is for. The
// client name goes into the file's banner ("Prepared for …"), the contact is
// optional ("Attn. …"). Defaults to the customer when every ticked quote is
// for the same one.
export function ClientExportDialog({
  defaultClient,
  quoteCount,
  busy,
  onConfirm,
  onClose,
}: {
  defaultClient: string;
  quoteCount: number;
  busy: boolean;
  onConfirm: (clientName: string, contactName: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [client, setClient] = useState(defaultClient);
  const [contact, setContact] = useState("");
  const canConfirm = client.trim().length > 0 && !busy;

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("grossMargin.reports.clientExport.title")}</DialogTitle>
          <DialogDescription>{t("grossMargin.reports.clientExport.description", { count: quoteCount })}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4 px-6 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canConfirm) onConfirm(client.trim(), contact.trim());
          }}
        >
          <Field label={t("grossMargin.reports.clientExport.client")}>
            <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder={t("grossMargin.reports.clientExport.clientPlaceholder")} autoFocus />
          </Field>
          <Field label={t("grossMargin.reports.clientExport.contact")}>
            <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder={t("grossMargin.reports.clientExport.contactPlaceholder")} />
          </Field>
          <DialogFooter className="mt-2 px-0">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={busy}>
                {t("grossMargin.common.cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!canConfirm}>
              <FileSpreadsheet aria-hidden="true" />
              {busy ? t("grossMargin.reports.preparing") : t("grossMargin.reports.clientExport.confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
