import {
  CheckCircleIcon,
  ClockIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { STATUSES, type Status } from "../types";
export default function StatusBadge({ status }: { status: Status }) {
  const Icon =
    status === "resolved"
      ? CheckCircleIcon
      : status === "in_progress"
        ? ClockIcon
        : WarningCircleIcon;
  return (
    <span className={`status status-${status}`}>
      <Icon size={16} weight="fill" aria-hidden="true" />
      {STATUSES[status]}
    </span>
  );
}
