import { Card, Layout, Typography } from "antd";
const { Header, Content } = Layout;

export default function App() {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ display: "flex", alignItems: "center" }}>
        <Typography.Title level={4} style={{ color: "#fff", margin: 0 }}>
          Plataforma de Microcrédito
        </Typography.Title>
      </Header>
      <Content style={{ padding: 24 }}>
        <Card>
          <Typography.Title level={2}>Bienvenido</Typography.Title>
          <Typography.Paragraph>
            Base inicial de la plataforma de gestión de solicitudes y préstamos.
            Los módulos se incorporarán por incrementos.
          </Typography.Paragraph>
        </Card>
      </Content>
    </Layout>
  );
}
