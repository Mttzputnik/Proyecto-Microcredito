import {
  CalendarOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { Button, Card, Descriptions, Table, Tag } from "antd";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/GeneralComponents";
import StatusChip from "../../components/StatusChip";
import { mockSchedule } from "../../mocks/loanScheduleData";

const cop = (value) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
const statusLabels = {
  PAID: "Pagada",
  PENDING: "Pendiente",
  OVERDUE: "Vencida",
};
const statusColors = { PAID: "green", PENDING: "blue", OVERDUE: "red" };
const columns = [
  {
    title: "Cuota",
    dataIndex: "installment",
    key: "installment",
    render: (value) => <strong>#{value}</strong>,
  },
  { title: "Vencimiento", dataIndex: "dueDate", key: "dueDate" },
  { title: "Capital", dataIndex: "principal", key: "principal", render: cop },
  { title: "Interés", dataIndex: "interest", key: "interest", render: cop },
  {
    title: "Total",
    dataIndex: "totalDue",
    key: "totalDue",
    render: (value) => <strong>{cop(value)}</strong>,
  },
  {
    title: "Saldo después de cuota",
    dataIndex: "balance",
    key: "balance",
    render: cop,
  },
  {
    title: "Estado",
    dataIndex: "status",
    key: "status",
    render: (value) => (
      <Tag color={statusColors[value]}>{statusLabels[value]}</Tag>
    ),
  },
];

export default function PaymentSchedulePage() {
  return (
    <div className="portal-page">
      <PageHeader
        eyebrow="Mi préstamo"
        title="Cronograma de pagos"
        description="Consulta cuándo vence cada cuota y cómo se distribuye entre capital e interés."
        action={<Button icon={<DownloadOutlined />}>Descargar resumen</Button>}
      />
      <Card className="detail-card schedule-summary">
        <div className="card-heading">
          <div>
            <span className="eyebrow">{mockSchedule.loanNumber}</span>
            <h2>Tu plan de pagos</h2>
          </div>
          <StatusChip status={mockSchedule.status} />
        </div>
        <Descriptions
          column={{ xs: 1, sm: 2, md: 4 }}
          items={[
            {
              key: "principal",
              label: "Monto inicial",
              children: cop(mockSchedule.principal),
            },
            {
              key: "rate",
              label: "Tasa anual",
              children: `${(mockSchedule.annualRate * 100).toFixed(1)} %`,
            },
            {
              key: "term",
              label: "Plazo",
              children: `${mockSchedule.termMonths} meses`,
            },
            {
              key: "next",
              label: "Próximo vencimiento",
              children: mockSchedule.nextDueDate,
            },
          ]}
        />
      </Card>
      <Card className="detail-card">
        <div className="card-heading">
          <h2>Detalle de cuotas</h2>
          <span className="muted-text">
            Valores estimados según el plan vigente
          </span>
        </div>
        <Table
          rowKey="installment"
          columns={columns}
          dataSource={mockSchedule.installments}
          pagination={false}
          scroll={{ x: 900 }}
        />
      </Card>
      <Card className="detail-card schedule-note">
        <InfoCircleOutlined />
        <div>
          <strong>¿Necesitas cambiar tu fecha de pago?</strong>
          <p>
            Comunícate con la cooperativa antes del vencimiento. El cronograma
            es informativo y cualquier modificación debe ser confirmada por un
            funcionario.
          </p>
          <Link to="/applicant/help">Ir a ayuda</Link>
        </div>
      </Card>
    </div>
  );
}
