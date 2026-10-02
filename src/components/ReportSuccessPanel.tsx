import { useState } from "react";
import { CheckCircleIcon, ShareNetworkIcon } from "@phosphor-icons/react";
import Modal from "./Modal";
import { reportShareUrl } from "../utils/reportLink";
import { DEMO_MODE } from "../config";

export default function ReportSuccessPanel({
  id,
  onClose,
  onView,
}: {
  id: string;
  onClose: () => void;
  onView: () => void;
}) {
  const [message, setMessage] = useState("");
  async function share() {
    const url = reportShareUrl(window.location.origin, id);
    try {
      if (navigator.share) {
        await navigator.share({ title: "路見不平通行回報", url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setMessage("案件連結已複製。");
      } else {
        setMessage("請開啟案件後複製網址分享。");
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError")
        setMessage("無法分享連結，請稍後再試。");
    }
  }
  return (
    <Modal title="回報完成" onClose={onClose}>
      <section className="report-success" aria-live="polite">
        <CheckCircleIcon size={42} aria-hidden="true" />
        <h3>
          {DEMO_MODE
            ? "這筆測試紀錄已保存在此瀏覽器。"
            : "這筆紀錄已公開在地圖上。"}
        </h3>
        <p>
          {DEMO_MODE
            ? "Demo 資料不會分享給其他使用者，也不會送交政府。"
            : "感謝你留下現場狀況。正式案件狀態由管理者確認後更新。"}
        </p>
        {message && <p role="status">{message}</p>}
        <div className="report-success-actions">
          <button className="button primary full" onClick={onView}>
            查看這筆回報
          </button>
          <button className="button secondary full" onClick={share}>
            <ShareNetworkIcon size={19} />
            分享案件
          </button>
          <button className="text-button" onClick={onClose}>
            回到地圖
          </button>
        </div>
      </section>
    </Modal>
  );
}
