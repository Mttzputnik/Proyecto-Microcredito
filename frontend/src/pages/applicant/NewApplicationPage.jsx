import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Radio,
  Result,
  Select,
  Steps,
} from "antd";
import dayjs from "dayjs";
import { PageHeader } from "../../components/GeneralComponents";
import { createLoanApplication } from "../../services/applicationService";

const steps = ["Tus datos", "Tu situación", "Tu solicitud", "Revisión"];
const stepFields = [
  [
    "fullName",
    "documentType",
    "documentNumber",
    "birthDate",
    "phone",
    "municipality",
    "residenceZone",
  ],
  [
    "occupation",
    "activityDuration",
    "monthlyIncome",
    "monthlyExpenses",
    "dependents",
    "hasExistingDebts",
    "monthlyDebtPayments",
  ],
  ["requestedAmount", "requestedTerm", "purpose"],
  ["accepted"],
];
const allFields = stepFields.flat();
const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const initialValues = {
  documentType: "CC",
  residenceZone: "urbana",
  dependents: 0,
  hasExistingDebts: false,
  monthlyDebtPayments: 0,
  requestedTerm: 12,
  accepted: false,
};

function ApplicationField({ name, label, children, rules = [] }) {
  return (
    <Form.Item name={name} label={label} rules={rules}>
      {children}
    </Form.Item>
  );
}

export default function NewApplicationPage() {
  const [form] = Form.useForm();
  const hasExistingDebts = Form.useWatch("hasExistingDebts", form);
  const monthlyIncome = Form.useWatch("monthlyIncome", form);
  const monthlyExpenses = Form.useWatch("monthlyExpenses", form);
  const monthlyDebtPayments = Form.useWatch("monthlyDebtPayments", form);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [applicationNumber, setApplicationNumber] = useState("");

  const goNext = async () => {
    try {
      await form.validateFields(stepFields[step]);
      setApiError("");
      setStep((current) => current + 1);
    } catch {
      return;
    }
  };

  const handleSubmit = async () => {
    let values;
    try {
      values = await form.validateFields(allFields);
    } catch {
      return;
    }

    const nameParts = values.fullName.trim().split(/\s+/);
    if (nameParts.length < 2) {
      form.setFields([
        {
          name: "fullName",
          errors: ["Ingresa al menos un nombre y un apellido."],
        },
      ]);
      setStep(0);
      return;
    }

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
          residenceZone: values.residenceZone,
          occupation: values.occupation,
          activityDuration: values.activityDuration,
          monthlyIncome: Number(values.monthlyIncome),
          monthlyExpenses: Number(values.monthlyExpenses),
          dependents: Number(values.dependents),
          hasExistingDebts: values.hasExistingDebts,
          monthlyDebtPayments: values.hasExistingDebts
            ? Number(values.monthlyDebtPayments)
            : 0,
        },
        requestedAmount: Number(values.requestedAmount),
        requestedTerm: Number(values.requestedTerm),
        purpose: values.purpose,
      });
      setApplicationNumber(result.applicationNumber);
      setStep(4);
    } catch (error) {
      setApiError(
        error.response?.data?.message ||
          "No fue posible enviar la solicitud. Verifica tu conexión e inténtalo nuevamente.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 4) {
    return (
      <div className="portal-page">
        <Result
          status="success"
          title="Solicitud recibida"
          subTitle={`Guardamos tu información para revisión. Esta confirmación no significa que el crédito haya sido aprobado. Número de solicitud: ${applicationNumber}`}
          extra={
            <Button
              type="primary"
              onClick={() => {
                form.resetFields();
                setApplicationNumber("");
                setStep(0);
              }}
            >
              Registrar otra solicitud
            </Button>
          }
        />
      </div>
    );
  }

  const available = Math.max(
    Number(monthlyIncome || 0) -
      Number(monthlyExpenses || 0) -
      (hasExistingDebts ? Number(monthlyDebtPayments || 0) : 0),
    0,
  );

  return (
    <div className="portal-page">
      <PageHeader
        eyebrow="Nueva solicitud"
        title="Solicita apoyo para hacer crecer tu proyecto"
        description="Completa estos datos paso a paso. La solicitud será revisada por la cooperativa; enviarla no garantiza su aprobación."
      />
      <Card className="detail-card">
        <Steps
          current={step}
          items={steps.map((title) => ({ title }))}
          responsive
        />
        {apiError && (
          <Alert
            type="error"
            showIcon
            message={apiError}
            style={{ marginTop: 24 }}
          />
        )}
        <Form
          form={form}
          layout="vertical"
          initialValues={initialValues}
          style={{ marginTop: 24 }}
          preserve
        >
          {step === 0 && (
            <>
              <h2>Tus datos</h2>
              <p>
                Necesitamos estos datos para identificar correctamente tu
                solicitud.
              </p>
              <ApplicationField
                name="fullName"
                label="Nombre completo"
                rules={[{ required: true }]}
              >
                <Input autoComplete="name" />
              </ApplicationField>
              <ApplicationField
                name="documentType"
                label="Tipo de documento"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { value: "CC", label: "Cédula de ciudadanía" },
                    { value: "CE", label: "Cédula de extranjería" },
                  ]}
                />
              </ApplicationField>
              <ApplicationField
                name="documentNumber"
                label="Número de documento"
                rules={[
                  { required: true },
                  {
                    pattern: /^\d{5,20}$/,
                    message: "Ingresa entre 5 y 20 dígitos.",
                  },
                ]}
              >
                <Input inputMode="numeric" />
              </ApplicationField>
              <ApplicationField
                name="birthDate"
                label="Fecha de nacimiento"
                rules={[{ required: true }]}
              >
                <DatePicker
                  format="DD/MM/YYYY"
                  disabledDate={(date) => date && date.isAfter(dayjs(), "day")}
                  style={{ width: "100%" }}
                />
              </ApplicationField>
              <ApplicationField
                name="phone"
                label="Número de celular"
                rules={[{ required: true, min: 7 }]}
              >
                <Input autoComplete="tel" />
              </ApplicationField>
              <ApplicationField
                name="municipality"
                label="Municipio donde vives"
                rules={[{ required: true, min: 2 }]}
              >
                <Input autoComplete="address-level2" />
              </ApplicationField>
              <ApplicationField
                name="residenceZone"
                label="Zona de residencia"
                rules={[{ required: true }]}
              >
                <Radio.Group
                  options={[
                    { value: "urbana", label: "Urbana" },
                    { value: "rural", label: "Rural" },
                  ]}
                />
              </ApplicationField>
            </>
          )}

          {step === 1 && (
            <>
              <h2>Tu situación económica</h2>
              <p>
                Registra promedios aproximados de tus ingresos y gastos
                mensuales.
              </p>
              <ApplicationField
                name="occupation"
                label="Actividad u ocupación"
                rules={[{ required: true, min: 2 }]}
              >
                <Input />
              </ApplicationField>
              <ApplicationField
                name="activityDuration"
                label="¿Hace cuánto realizas esta actividad?"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { value: "menos-6", label: "Menos de 6 meses" },
                    { value: "6-12", label: "Entre 6 meses y 1 año" },
                    { value: "1-3", label: "Entre 1 y 3 años" },
                    { value: "mas-3", label: "Más de 3 años" },
                  ]}
                />
              </ApplicationField>
              <ApplicationField
                name="monthlyIncome"
                label="Ingresos mensuales aproximados"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} precision={0} style={{ width: "100%" }} />
              </ApplicationField>
              <ApplicationField
                name="monthlyExpenses"
                label="Gastos mensuales aproximados"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} precision={0} style={{ width: "100%" }} />
              </ApplicationField>
              <ApplicationField
                name="dependents"
                label="Personas que dependen de ti"
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={0}
                  max={30}
                  precision={0}
                  style={{ width: "100%" }}
                />
              </ApplicationField>
              <ApplicationField
                name="hasExistingDebts"
                label="¿Tienes otras deudas activas?"
                rules={[{ required: true }]}
              >
                <Radio.Group
                  options={[
                    { value: false, label: "No" },
                    { value: true, label: "Sí" },
                  ]}
                />
              </ApplicationField>
              {hasExistingDebts && (
                <ApplicationField
                  name="monthlyDebtPayments"
                  label="Pago mensual de esas deudas"
                  rules={[{ required: true }]}
                >
                  <InputNumber
                    min={0}
                    precision={0}
                    style={{ width: "100%" }}
                  />
                </ApplicationField>
              )}
              <Alert
                type="info"
                showIcon
                message={`Dinero disponible estimado: ${currency.format(available)}`}
                description="Este cálculo es orientativo y no representa una decisión de crédito."
              />
            </>
          )}

          {step === 2 && (
            <>
              <h2>Tu solicitud</h2>
              <p>Cuéntanos qué monto necesitas y para qué lo utilizarías.</p>
              <ApplicationField
                name="requestedAmount"
                label="Monto solicitado (COP)"
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={1}
                  max={1000000000}
                  precision={0}
                  style={{ width: "100%" }}
                />
              </ApplicationField>
              <ApplicationField
                name="requestedTerm"
                label="Plazo preferido"
                rules={[{ required: true }]}
              >
                <Select
                  options={[6, 12, 18, 24].map((months) => ({
                    value: months,
                    label: `${months} meses`,
                  }))}
                />
              </ApplicationField>
              <ApplicationField
                name="purpose"
                label="Uso principal del dinero"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    {
                      value: "negocio",
                      label: "Materiales o mercancía para mi negocio",
                    },
                    {
                      value: "herramientas",
                      label: "Herramientas o equipos de trabajo",
                    },
                    { value: "estudio", label: "Estudios o formación" },
                    {
                      value: "hogar",
                      label: "Mejoras de vivienda o espacio de trabajo",
                    },
                    { value: "otro", label: "Otro propósito" },
                  ]}
                />
              </ApplicationField>
            </>
          )}

          {step === 3 && (
            <>
              <h2>Revisa y confirma</h2>
              <p>Confirma que los datos estén completos antes de enviar.</p>
              <Form.Item
                name="accepted"
                valuePropName="checked"
                rules={[
                  {
                    validator: (_, value) =>
                      value
                        ? Promise.resolve()
                        : Promise.reject(
                            new Error(
                              "Debes confirmar la información para continuar.",
                            ),
                          ),
                  },
                ]}
              >
                <Checkbox>
                  Confirmo que la información entregada es verdadera y autorizo
                  su revisión por parte de la cooperativa.
                </Checkbox>
              </Form.Item>
              <Alert
                type="warning"
                showIcon
                message="Enviar la solicitud no significa que el crédito haya sido aprobado."
              />
            </>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 24,
            }}
          >
            <Button
              disabled={step === 0 || submitting}
              onClick={() => setStep((current) => current - 1)}
            >
              Volver
            </Button>
            {step < 3 ? (
              <Button type="primary" onClick={goNext}>
                Continuar
              </Button>
            ) : (
              <Button
                type="primary"
                loading={submitting}
                onClick={handleSubmit}
              >
                Enviar solicitud
              </Button>
            )}
          </div>
        </Form>
      </Card>
    </div>
  );
}
