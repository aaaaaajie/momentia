import { Button, Flex, Input, Typography, Upload } from 'antd';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';

export default function Composer(props: {
  input: string;
  onChangeInput: (v: string) => void;
  fileList: UploadFile[];
  onChangeFileList: (v: UploadFile[]) => void;
  loading: boolean;
  onSend: () => void;
}) {
  const canSend = !props.loading && (props.input.trim() || props.fileList.length > 0);
  const maxImages = 3;

  const ensureThumb = (file: UploadFile): UploadFile => {
    // antd 在 beforeUpload=false 的情况下，不一定会为本地文件自动生成 thumbUrl。
    // 这里手动用 URL.createObjectURL 生成，保证立即可见缩略图。
    if (file.thumbUrl || file.url) return file;
    const origin = file.originFileObj as File | undefined;
    if (!origin) return file;
    const objectUrl = URL.createObjectURL(origin);
    return { ...file, thumbUrl: objectUrl, url: objectUrl };
  };

  const revokeThumbUrl = (file: UploadFile) => {
    const url = (file.thumbUrl || file.url) as string | undefined;
    if (url && url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }
  };

  const handleChange: UploadProps['onChange'] = ({ fileList }) => {
    const next = fileList.map(ensureThumb);
    props.onChangeFileList(next);
  };

  const handleRemove: UploadProps['onRemove'] = (file) => {
    revokeThumbUrl(file);
    props.onChangeFileList(props.fileList.filter((f) => f.uid !== file.uid));
    return false;
  };

  const getAngle = (idx: number) => {
    // 你要求：第1张逆时针；第2张顺时针小角度；第3张顺时针稍大（远小于 100°）
    const angles = [-10, 4, 10];
    return angles[idx % angles.length];
  };

  return (
    <div
      className="mm-composer"
      style={{
        borderTop: '1px solid #eef0f3',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="mm-panel mm-composer-inner" style={{ padding: '12px 16px' }}>
        <div className="mm-input-wrap" style={{ position: 'relative' }}>
          <Input.TextArea
            value={props.input}
            onChange={(e) => props.onChangeInput(e.target.value)}
            autoSize={{ minRows: 5, maxRows: 10 }}
            placeholder="说说今天想做点什么"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                props.onSend();
              }
            }}
            style={{
              paddingLeft: 88,
              paddingRight: 64,
              paddingBottom: 16,
              borderRadius: 8,
            }}
          />

          <div
            className="mm-input-upload"
            style={{
              position: 'absolute',
              left: 20,
              top: 12,
              zIndex: 2,
              transform: 'rotate(-8deg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mm-photo-stack" style={{ ['--mm-count' as any]: props.fileList.length }}>
              {/* 用一个相对容器手工渲染卡片，右侧的 + 是独立卡片，确保始终在“照片右边” */}
              <div className="mm-photo-deck">
                {props.fileList.slice(0, maxImages).map((file, idx) => {
                  const src = (file.thumbUrl || file.url) as string | undefined;
                  const angle = getAngle(idx);
                  return (
                    <div
                      key={file.uid}
                      className="mm-photo-card"
                      style={{
                        ['--mm-angle' as any]: `${angle}deg`,
                        ['--mm-i' as any]: idx,
                      }}
                    >
                      <div className="mm-photo-inner">
                        {src ? (
                          <img
                            src={src}
                            alt={file.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        ) : (
                          <div className="mm-photo-placeholder">预览中</div>
                        )}
                      </div>

                      <button
                        type="button"
                        className="mm-photo-remove"
                        aria-label="删除图片"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemove(file);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}

                {props.fileList.length < maxImages && (
                  <Upload
                    accept="image/*"
                    multiple
                    maxCount={maxImages}
                    fileList={props.fileList}
                    beforeUpload={() => false}
                    showUploadList={false}
                    onChange={handleChange}
                  >
                    <div
                      className="mm-photo-add mm-photo-card"
                      style={{
                        ['--mm-angle' as any]: `8deg`,
                        ['--mm-i' as any]: props.fileList.length,
                      }}
                    >
                      <span className="mm-photo-add-plus">＋</span>
                    </div>
                  </Upload>
                )}
              </div>
            </div>
          </div>

          <div
            className="mm-input-send"
            style={{
              position: 'absolute',
              right: 12,
              bottom: 12,
              zIndex: 1,
            }}
          >
            <Button
              size="small"
              type="primary"
              aria-label="发送"
              onClick={props.onSend}
              loading={props.loading}
              disabled={!canSend}
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                paddingInline: 0,
              }}
            >
              ↑
            </Button>
          </div>
        </div>

        <Flex justify="space-between" align="center" style={{ marginTop: 8 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            ⌘/Ctrl + Enter 发送
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            已选 {props.fileList.length}/{maxImages}
          </Typography.Text>
        </Flex>
      </div>
    </div>
  );
}
