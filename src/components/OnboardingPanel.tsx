import { useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react";
import Modal from "./Modal";

const steps = [
  {
    title: "這張地圖可以做什麼？",
    content: (
      <p>
        查看附近的通行障礙，也可以把你看到的問題留下來。案件和照片會公開顯示。
      </p>
    ),
  },
  {
    title: "看到障礙時",
    content: (
      <ol className="onboarding-steps">
        <li>選擇障礙位置</li>
        <li>拍下障礙與周圍通行空間</li>
        <li>選擇通行狀況並送出</li>
      </ol>
    ),
  },
  {
    title: "這不是政府正式通報",
    content: (
      <p>
        目前是民眾共同紀錄與追蹤的地圖。需要正式申訴或緊急處理時，請使用政府正式管道。
      </p>
    ),
  },
];

export default function OnboardingPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const current = steps[step];
  return (
    <Modal title="開始使用基隆好行" onClose={onClose}>
      <div className="onboarding-content">
        <p className="onboarding-progress" aria-live="polite">
          使用說明 {step + 1}／{steps.length}
        </p>
        <h3>{current.title}</h3>
        {current.content}
        <div className="onboarding-actions">
          <button className="button secondary" onClick={onClose}>
            直接看地圖
          </button>
          <div>
            {step > 0 && (
              <button
                className="button secondary"
                onClick={() => setStep((currentStep) => currentStep - 1)}
              >
                <ArrowLeftIcon size={18} />
                上一步
              </button>
            )}
            <button
              className="button primary"
              onClick={() =>
                step === steps.length - 1
                  ? onClose()
                  : setStep((currentStep) => currentStep + 1)
              }
            >
              {step === steps.length - 1 ? "開始使用" : "下一步"}
              {step < steps.length - 1 && <ArrowRightIcon size={18} />}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
