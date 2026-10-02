import { ImageIcon } from '@phosphor-icons/react';
import type { Report } from '../types';
export default function ReportThumbnail({ report }: { report: Report }) {
  const photo = report.beforeImageUrl || report.afterImageUrl;
  return <span className="report-thumbnail">
    {photo ? <img className="report-card-thumb" src={photo} alt="" loading="lazy" decoding="async" />
      : <span className="report-card-thumb photo-placeholder"><ImageIcon size={24} aria-hidden="true" /><small>尚無照片</small></span>}
  </span>;
}
