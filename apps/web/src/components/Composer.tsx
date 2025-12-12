import { Button, Flex, Input, Typography, Upload } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';

export default function Composer(props: {
  input: string;
  onChangeInput: (v: string) => void;
  fileList: UploadFile[];
  onChangeFileList: (v: UploadFile[]) => void;
  loading: boolean;
  onSend: () => void;
}) {
  return (
    <div
      style={{
        borderTop: '1px solid #eef0f3',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '12px 16px' }}>
        <Flex gap={12} align="flex-end" wrap>
          <div style={{ flex: 1, minWidth: 320 }}>
            <Input.TextArea
              value={props.input}
              onChange={(e) => props.onChangeInput(e.target.value)}
              autoSize={{ minRows: 2, maxRows: 6 }}
              placeholder="写一段描述：如“写一篇日记，日期是... 标题... 正文... 把照片拼贴进去，风格手账感。”"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  props.onSend();
                }
              }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              ⌘/Ctrl + Enter 发送
            </Typography.Text>
          </div>

          <div style={{ minWidth: 240 }}>
            <Upload
              accept="image/*"
              multiple
              maxCount={3}
              fileList={props.fileList}
              beforeUpload={() => false}
              onChange={({ fileList }) => props.onChangeFileList(fileList)}
            >
              <Button style={{ width: '100%' }}>上传照片（最多 3 张）</Button>
            </Upload>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              建议：同一主题、同一色调
            </Typography.Text>
          </div>

          <Button
            type="primary"
            onClick={props.onSend}
            loading={props.loading}
            disabled={props.loading || (!props.input.trim() && props.fileList.length === 0)}
          >
            发送
          </Button>
        </Flex>
      </div>
    </div>
  );
}
