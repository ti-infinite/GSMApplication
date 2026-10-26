import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { carrierStatus, type LogisticsRow } from "@/entities/logistics";

// The alarm for a shipment whose ship date is within ALARM_LEAD_DAYS (or
// past) with no confirmed carrier: just the warning triangle at the right end
// of the row, with the reason as a hover title. Not clickable. Renders
// nothing when there is no alarm.
export function LogisticsAlarmIcon({ row }: { row: LogisticsRow }) {
  const { t } = useTranslation();
  if (carrierStatus(row) !== "alarm") return null;
  return (
    <span className="inline-flex size-7 items-center justify-center text-destructive" title={t("logistics.alarm.title")} role="img" aria-label={t("logistics.alarm.title")}>
      <AlertTriangle className="size-4" aria-hidden="true" />
    </span>
  );
}
