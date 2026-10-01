import { BETA_FEEDBACK_EMAIL, DEMO_MODE } from "../config";
import Modal from "./Modal";

export default function HelpPanel({
  onClose,
  onStartGuide,
}: {
  onClose: () => void;
  onStartGuide?: () => void;
}) {
  return (
    <Modal title="如何使用基隆好行" onClose={onClose} wide>
      <div className="panel-content help-content">
        <p className="help-lead">
          這是民眾共同記錄基隆通行狀況的地圖。你可以先查看案件，也可以留下新回報或補充現況。
        </p>
        {onStartGuide && (
          <button
            type="button"
            className="button primary help-tour-button"
            onClick={onStartGuide}
          >
            跟著操作教學
          </button>
        )}
        <ol className="help-steps">
          <li>
            <strong>找到障礙位置</strong>
            <span>使用目前位置、點選地圖，或輸入座標；不開 GPS 也能回報。</span>
          </li>
          <li>
            <strong>拍攝現場照片</strong>
            <span>拍到障礙與周圍通行空間，避免人臉、車牌與其他個人資訊。</span>
          </li>
          <li>
            <strong>描述問題並送出</strong>
            <span>選擇障礙類型和通行程度。其他人可以補充，正式狀態由管理者更新。</span>
          </li>
        </ol>

        <h3>常見問題</h3>
        <dl className="help-faq">
          <div>
            <dt>需要註冊或開啟 GPS 嗎？</dt>
            <dd>
              不必建立一般帳號。定位只在你按下定位按鈕時使用；也可手動選點或輸入座標。
            </dd>
          </div>
          <div>
            <dt>不知道地址、為什麼需要照片？</dt>
            <dd>
              可在地圖選點，不必知道門牌。照片協助其他人理解現場；送出前會縮小圖片並移除 EXIF／GPS 資訊。
            </dd>
          </div>
          <div>
            <dt>回報和照片會公開嗎？</dt>
            <dd>
              {DEMO_MODE
                ? "Demo 資料只保存在此瀏覽器。"
                : "正式回報、位置、描述與照片會公開顯示，照片也可能被下載。請勿上傳個人資訊。"}
            </dd>
          </div>
          <div>
            <dt>紅、黃、綠代表什麼？</dt>
            <dd>
              紅色「待改善」、黃色「處理中」、綠色「已改善」。顏色也會搭配文字和圖示顯示。
            </dd>
          </div>
          <div>
            <dt>同一地點已有人回報怎麼辦？</dt>
            <dd>
              送出前會提醒 30 公尺內的同類案件；可先查看並補充，也可在障礙不同時另行回報。
            </dd>
          </div>
          <div>
            <dt>看到狀況改善，可以直接改成已改善嗎？</dt>
            <dd>
              一般使用者可以補充現況或提出改善建議，正式案件狀態由管理者確認後更新。
            </dd>
          </div>
          <div>
            <dt>這是政府正式通報嗎？能保證路線安全嗎？</dt>
            <dd>
              不是政府 1999 或派工系統，也不保證路線安全。通行狀況可能改變，請依現場情況判斷。
            </dd>
          </div>
          <div>
            <dt>資料錯誤或要申請移除怎麼辦？</dt>
            <dd>
              請寄信至{" "}
              <a
                href={`mailto:${BETA_FEEDBACK_EMAIL}?subject=${encodeURIComponent("基隆好行回報更正或移除申請")}`}
              >
                {BETA_FEEDBACK_EMAIL}
              </a>
              ，提供案件連結與希望更正或移除的內容。
            </dd>
          </div>
        </dl>

        <h3>回報資料與聯絡方式</h3>
        <p>
          {DEMO_MODE
            ? "目前是 Demo，資料只保存在你的瀏覽器。"
            : "公開案件與照片會在案件公開期間持續保留；收到並確認移除申請後會處理，並至少每年檢視一次資料是否仍有保留必要。"}
        </p>
        <p>
          {DEMO_MODE
            ? "Beta 回饋與資料申請聯絡信箱："
            : "Beta 試用回饋、資料更正、移除與隱私申訴："}
          <a
            href={`mailto:${BETA_FEEDBACK_EMAIL}?subject=${encodeURIComponent("基隆好行 Beta 試用回饋")}`}
          >
            {BETA_FEEDBACK_EMAIL}
          </a>
        </p>
      </div>
    </Modal>
  );
}
