import { Icon } from "../components/ui/icons";

const steps = ["Jenis Usaha", "Anggaran & Target", "Area Pilihan"];

export function PencariIntro({ activeStep, title, description }: {
  activeStep: 1 | 2 | 3;
  title: string;
  description: string;
}) {
  return (
    <div className="page-intro">
      <div>
        <div className="breadcrumb">
          Eksplorasi Properti <span>›</span> <strong>{steps[activeStep - 1]}</strong>
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="model-badge"><Icon name="map-pin" size={15} /> Semarang</div>
    </div>
  );
}

export function PencariStepper({ activeStep }: { activeStep: 1 | 2 | 3 }) {
  return (
    <ol className={`stepper stepper-${activeStep}`} aria-label="Tahapan kebutuhan bisnis">
      {steps.map((title, index) => {
        const number = index + 1;
        const completed = number < activeStep;
        const active = number === activeStep;
        const label = completed ? `Langkah ${number} • Selesai` : active ? "Sedang Aktif" : number === 3 ? "Langkah Akhir" : "Langkah Berikutnya";
        return (
          <li className={`step-item ${active ? "active" : ""} ${completed ? "completed" : ""}`} key={title} aria-current={active ? "step" : undefined}>
            <span aria-hidden="true">{completed ? <Icon name="check" size={15} /> : number}</span>
            <div><small>{label}</small><strong>{title}</strong></div>
          </li>
        );
      })}
    </ol>
  );
}
