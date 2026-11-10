import { useMemo, useState } from "react";
import { Alert, Button, Card, Checkbox, DatePicker, Input, InputNumber, Radio, Select, Steps, Tag } from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined, CheckCircleFilled, FileTextOutlined, InfoCircleOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { createLoanApplication } from "./services/applicationService.js";

const steps = ["Tus datos", "Tu situación", "Tu solicitud", "Revisión"];
const initialValues = {
  fullName: "",
  documentType: "CC",
  documentNumber: "",
  birthDate: null,
  phone: "",
  municipality: "",
  residence: "urbana",
  activity: "",
  activityTime: "",
  monthlyIncome: null,
  monthlyExpenses: null,
  dependents: 0,
  currentDebts: "no",
  debtPayment: 0,
  amount: null,
  term: "12",
  purpose: "",
  accepted: false,
};

const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

function FieldHint({ children }) {
  return <span className="field-hint">{children}</span>;
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="section-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(initialValues);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [applicationNumber, setApplicationNumber] = useState("");

  const available = useMemo(
    () => Number(values.monthlyIncome || 0) - Number(values.monthlyExpenses || 0) - Number(values.debtPayment || 0),
    [values.monthlyIncome, values.monthlyExpenses, values.debtPayment],
  );

  const eligibility = useMemo(() => ({
    age: values.birthDate ? dayjs().diff(values.birthDate, "year") >= 18 : false,
    residence: Boolean(values.municipality && values.residence),
    capacity: available > 0,
  }), [values.birthDate, values.municipality, values.residence, available]);

  const update = (key, value) => setValues((current) => ({ ...current, [key]: value }));

  const validateStep = () => {
    const required = {
      0: ["fullName", "documentNumber", "birthDate", "phone", "municipality"],
      1: ["activity", "activityTime", "monthlyIncome", "monthlyExpenses"],
      2: ["amount", "term", "purpose"],
    }[step] || [];
    const missing = required.filter((key) => !values[key] && values[key] !== 0);
    if (missing.length) {
      setSubmitted(true);
      return false;
    }
    setSubmitted(false);
    return true;
  };

  const goNext = () => {
    if (validateStep()) setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const goBack = () => {
    setSubmitted(false);
    setStep((current) => Math.max(current - 1, 0));
  };

  const handleSubmit = async () => {
    if (!values.accepted) {
      setSubmitted(true);
      return;
    }
    const nameParts = values.fullName.trim().split(/\s+/);
    if (nameParts.length < 2) {
      setApiError("Ingresa al menos un nombre y un apellido.");
      return;
    }
    setSubmitted(false);
    setApiError("");
    setSubmitting(true);
    try {
      const result = await createLoanApplication({
        applicant: {
          documentType: values.documentType,
          documentNumber: values.documentNumber,
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(" "),
          birthDate: values.birthDate.startOf("day").toISOString(),
          phone: values.phone,
          municipality: values.municipality,
          residenceZone: values.residence,
          occupation: values.activity,
          activityDuration: values.activityTime,
          monthlyIncome: Number(values.monthlyIncome),
          monthlyExpenses: Number(values.monthlyExpenses),
          dependents: Number(values.dependents),
          hasExistingDebts: values.currentDebts === "si",
          monthlyDebtPayments: values.currentDebts === "si" ? Number(values.debtPayment) : 0
        },
        requestedAmount: Number(values.amount),
        requestedTerm: Number(values.term),
        purpose: values.purpose
      });
      setApplicationNumber(result.applicationNumber);
      setStep(4);
    } catch (error) {
      setApiError(error.response?.data?.message || "No fue posible enviar la solicitud. Verifica tu conexión e inténtalo nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 4) {
    return (
      <div className="app-shell centered-shell">
        <main className="success-card" aria-live="polite">
          <div className="success-icon"><CheckCircleFilled /></div>
          <span className="eyebrow">Solicitud recibida</span>
          <h1>Gracias, {values.fullName.split(" ")[0] || "por confiar"}</h1>
          <p>Guardamos tu información para que un funcionario de la cooperativa la revise. Esta pantalla es una confirmación de recepción, no una aprobación del crédito.</p>
          <div className="reference-box"><span>Número de solicitud</span><strong>{applicationNumber}</strong></div>
          <Button type="primary" size="large" onClick={() => { setValues(initialValues); setApplicationNumber(""); setApiError(""); setStep(0); }}>Registrar otra solicitud</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark"><span className="brand-symbol">+</span><span>Solidaridad <strong>Microfinanzas</strong></span></div>
        <div className="topbar-context"><SafetyCertificateOutlined /> Proceso seguro</div>
      </header>

      <main className="page-wrap">
        <div className="page-intro">
          <div>
            <span className="eyebrow">Nueva solicitud</span>
            <h1>Solicita apoyo para hacer crecer tu proyecto</h1>
            <p>Completa estos datos con calma. Te acompañaremos paso a paso.</p>
          </div>
          <div className="trust-note"><InfoCircleOutlined /><span>Tu información se usa únicamente para estudiar la solicitud.</span></div>
        </div>

        <div className="progress-card">
          <Steps current={step} items={steps.map((title) => ({ title }))} responsive />
        </div>

        <div className="workspace">
          <section className="form-card">
            {submitted && <Alert className="form-alert" type="warning" showIcon message="Revisa los campos marcados antes de continuar." />}
            {apiError && <Alert className="form-alert" type="error" showIcon message={apiError} />}
            {step === 0 && (
              <>
                <SectionHeading eyebrow="Paso 1 de 4" title="Primero conozcamos un poco de ti" description="Necesitamos estos datos para identificar correctamente tu solicitud." />
                <div className="form-grid two-columns">
                  <label className="form-field wide"><span>Nombre completo</span><Input size="large" value={values.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Ej. María García López" /></label>
                  <label className="form-field"><span>Tipo de documento</span><Select size="large" value={values.documentType} onChange={(value) => update("documentType", value)} options={[{ value: "CC", label: "Cédula de ciudadanía" }, { value: "CE", label: "Cédula de extranjería" }]} /></label>
                  <label className="form-field"><span>Número de documento</span><Input size="large" value={values.documentNumber} onChange={(e) => update("documentNumber", e.target.value.replace(/\D/g, ""))} placeholder="Escribe solo números" inputMode="numeric" /></label>
                  <label className="form-field"><span>Fecha de nacimiento</span><DatePicker size="large" className="full-width" value={values.birthDate} onChange={(value) => update("birthDate", value)} format="DD/MM/YYYY" placeholder="Día / mes / año" /></label>
                  <label className="form-field"><span>Número de celular</span><Input size="large" value={values.phone} onChange={(e) => update("phone", e.target.value)} placeholder="Ej. 300 123 4567" inputMode="tel" /></label>
                  <label className="form-field"><span>Municipio donde vives</span><Input size="large" value={values.municipality} onChange={(e) => update("municipality", e.target.value)} placeholder="Ej. Manizales" /></label>
                </div>
                <div className="form-field"><span>¿Dónde está tu vivienda?</span><Radio.Group value={values.residence} onChange={(e) => update("residence", e.target.value)} className="radio-row"><Radio value="urbana">Zona urbana</Radio><Radio value="rural">Zona rural</Radio></Radio.Group><FieldHint>Esta información nos ayuda a asignar el proceso de atención más cercano.</FieldHint></div>
              </>
            )}

            {step === 1 && (
              <>
                <SectionHeading eyebrow="Paso 2 de 4" title="Cuéntanos cómo está tu economía" description="No importa si tus ingresos cambian cada mes: registra un promedio aproximado." />
                <div className="form-grid two-columns">
                  <label className="form-field"><span>¿A qué actividad te dedicas?</span><Input size="large" value={values.activity} onChange={(e) => update("activity", e.target.value)} placeholder="Ej. Venta de alimentos" /></label>
                  <label className="form-field"><span>¿Hace cuánto realizas esta actividad?</span><Select size="large" value={values.activityTime} onChange={(value) => update("activityTime", value)} placeholder="Selecciona una opción" options={[{ value: "menos-6", label: "Menos de 6 meses" }, { value: "6-12", label: "Entre 6 meses y 1 año" }, { value: "1-3", label: "Entre 1 y 3 años" }, { value: "mas-3", label: "Más de 3 años" }]} /></label>
                  <label className="form-field"><span>Ingresos mensuales aproximados</span><InputNumber size="large" className="full-width money-input" value={values.monthlyIncome} onChange={(value) => update("monthlyIncome", value)} min={0} formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")} parser={(value) => value?.replace(/\./g, "")} addonBefore="$" /><FieldHint>Incluye el dinero que recibes normalmente en un mes.</FieldHint></label>
                  <label className="form-field"><span>Gastos mensuales aproximados</span><InputNumber size="large" className="full-width money-input" value={values.monthlyExpenses} onChange={(value) => update("monthlyExpenses", value)} min={0} formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")} parser={(value) => value?.replace(/\./g, "")} addonBefore="$" /><FieldHint>Incluye vivienda, alimentación, servicios y transporte.</FieldHint></label>
                  <label className="form-field"><span>Personas que dependen de ti</span><InputNumber size="large" className="full-width" value={values.dependents} onChange={(value) => update("dependents", value ?? 0)} min={0} max={30} /></label>
                  <label className="form-field"><span>¿Tienes otras deudas activas?</span><Radio.Group value={values.currentDebts} onChange={(e) => update("currentDebts", e.target.value)} className="radio-row"><Radio value="no">No</Radio><Radio value="si">Sí</Radio></Radio.Group></label>
                  {values.currentDebts === "si" && <label className="form-field"><span>¿Cuánto pagas al mes por esas deudas?</span><InputNumber size="large" className="full-width money-input" value={values.debtPayment} onChange={(value) => update("debtPayment", value)} min={0} addonBefore="$" /></label>}
                </div>
                <div className="capacity-preview"><div><span>Dinero disponible estimado</span><strong>{currency.format(Math.max(available, 0))}</strong></div><p>Este cálculo es solo orientativo y no representa una decisión de crédito.</p></div>
              </>
            )}

            {step === 2 && (
              <>
                <SectionHeading eyebrow="Paso 3 de 4" title="¿Qué necesitas y para qué?" description="Cuéntanos el propósito para entender mejor cómo podemos acompañarte." />
                <div className="form-grid two-columns">
                  <label className="form-field"><span>Monto que necesitas</span><InputNumber size="large" className="full-width money-input" value={values.amount} onChange={(value) => update("amount", value)} min={1} formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")} parser={(value) => value?.replace(/\./g, "")} addonBefore="$" /><FieldHint>El monto final será revisado según las políticas vigentes.</FieldHint></label>
                  <label className="form-field"><span>Plazo que prefieres</span><Select size="large" value={values.term} onChange={(value) => update("term", value)} options={[{ value: "6", label: "6 meses" }, { value: "12", label: "12 meses" }, { value: "18", label: "18 meses" }, { value: "24", label: "24 meses" }]} /></label>
                  <label className="form-field wide"><span>¿Para qué usarías el dinero?</span><Select size="large" value={values.purpose} onChange={(value) => update("purpose", value)} placeholder="Selecciona el uso principal" options={[{ value: "negocio", label: "Comprar materiales o mercancía para mi negocio" }, { value: "herramientas", label: "Comprar herramientas o equipos de trabajo" }, { value: "estudio", label: "Pagar estudios o formación" }, { value: "hogar", label: "Mejorar mi vivienda o espacio de trabajo" }, { value: "otro", label: "Otro propósito" }]} /></label>
                </div>
                <div className="info-panel"><FileTextOutlined /><div><strong>Ten a la mano tus documentos</strong><p>En el siguiente paso te indicaremos qué soportes podrían solicitarte. Por ahora no necesitas adjuntar nada.</p></div></div>
              </>
            )}

            {step === 3 && (
              <>
                <SectionHeading eyebrow="Paso 4 de 4" title="Revisa antes de enviar" description="Confirma que la información esté correcta. Podrás corregirla si lo necesitas." />
                <div className="review-list">
                  <ReviewRow title="Datos personales" value={`${values.fullName || "Sin completar"} · ${values.municipality || "Sin municipio"}`} onEdit={() => setStep(0)} />
                  <ReviewRow title="Situación económica" value={`${currency.format(values.monthlyIncome || 0)} de ingresos · ${currency.format(available)} disponibles estimados`} onEdit={() => setStep(1)} />
                  <ReviewRow title="Solicitud" value={`${currency.format(values.amount || 0)} a ${values.term || "—"} meses · ${values.purpose || "Sin propósito"}`} onEdit={() => setStep(2)} />
                </div>
                <div className="eligibility-box"><div className="eligibility-title"><SafetyCertificateOutlined /><div><strong>Revisión de elegibilidad preliminar</strong><span>Estos son requisitos básicos, no una aprobación del crédito.</span></div></div><EligibilityItem ok={eligibility.age} text="Tienes la edad mínima requerida (18 años)." /><EligibilityItem ok={eligibility.residence} text="Informaste tu municipio y zona de residencia." /><EligibilityItem ok={eligibility.capacity} text="Tus ingresos declarados superan tus gastos estimados." /></div>
                <Checkbox checked={values.accepted} onChange={(e) => update("accepted", e.target.checked)} className="consent-check">Confirmo que la información entregada es verdadera y autorizo su revisión por parte de la cooperativa.</Checkbox>
              </>
            )}

            <div className="form-actions"><Button type="text" size="large" onClick={goBack} disabled={step === 0} icon={<ArrowLeftOutlined />}>Volver</Button>{step < 3 ? <Button type="primary" size="large" onClick={goNext}>Continuar <ArrowRightOutlined /></Button> : <Button type="primary" size="large" onClick={handleSubmit} loading={submitting} disabled={submitting}>Enviar solicitud <ArrowRightOutlined /></Button>}</div>
          </section>

          <aside className="side-card"><div className="side-icon"><SafetyCertificateOutlined /></div><h3>Estás en buenas manos</h3><p>La cooperativa revisa cada solicitud con criterios claros y una mirada humana.</p><div className="side-divider" /><div className="side-item"><span className="side-number">1</span><span>Completa tus datos con calma</span></div><div className="side-item"><span className="side-number">2</span><span>Revisaremos la información</span></div><div className="side-item"><span className="side-number">3</span><span>Un funcionario te contactará</span></div><Tag color="green">Sin costo por solicitar</Tag></aside>
        </div>
      </main>
    </div>
  );
}

function ReviewRow({ title, value, onEdit }) {
  return <div className="review-row"><div><span>{title}</span><strong>{value}</strong></div><Button type="link" onClick={onEdit}>Editar</Button></div>;
}

function EligibilityItem({ ok, text }) {
  return <div className={`eligibility-item ${ok ? "is-ok" : "is-pending"}`}><span>{ok ? <CheckCircleFilled /> : <InfoCircleOutlined />}</span><span>{text}</span><strong>{ok ? "Cumple" : "Pendiente"}</strong></div>;
}
