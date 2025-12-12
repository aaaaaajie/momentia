import { Flex, Segmented, Space, Typography } from 'antd';

export default function AppHeader(props: { templateId: string; onChangeTemplateId: (id: string) => void }) {
  return (
    <div
      style={{
        borderBottom: '1px solid #eef0f3',
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '14px 16px' }}>
        <Flex align="center" justify="space-between">
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Momentia
            </Typography.Title>
            <Typography.Text type="secondary">手账/拼贴生成（Chat）</Typography.Text>
          </div>

          <Space>
            <Typography.Text type="secondary">模板</Typography.Text>
            <Segmented
              value={props.templateId}
              onChange={(v) => props.onChangeTemplateId(String(v))}
              options={[
                { label: '极简', value: 'minimal-paper' },
                { label: '复古', value: 'vintage-journal' },
                { label: '治愈', value: 'healing-illustration' },
                { label: '拍立得', value: 'polaroid-wall' },
              ]}
            />
          </Space>
        </Flex>
      </div>
    </div>
  );
}
