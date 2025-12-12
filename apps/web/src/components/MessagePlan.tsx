import { Collapse } from 'antd';

export default function MessagePlan(props: { result: any }) {
  return (
    <div style={{ marginTop: 10 }}>
      <Collapse
        size="small"
        items={[
          {
            key: 'plan',
            label: '查看生成计划（JSON）',
            children: (
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(props.result?.plan ?? props.result, null, 2)}
              </pre>
            ),
          },
        ]}
      />
    </div>
  );
}
