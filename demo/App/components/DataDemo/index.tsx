import { useState } from 'react'

import {
  Avatar,
  Button,
  Dot,
  ListItem,
  ListView,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '../../../../src'
import { Icon } from '../Icon'
import { Section } from '../Section'

const resources = [
  { name: '组件规范.fig', kind: '设计文件', size: '2.4 MB', status: '已同步' },
  { name: '品牌资源.zip', kind: '归档文件', size: '18.6 MB', status: '已同步' },
  { name: '使用说明.md', kind: '文档', size: '12 KB', status: '本地' },
]
export function DataDemo() {
  const [reverse, setReverse] = useState(false)
  const rows = [...resources].sort((a, b) => (reverse ? -1 : 1) * a.name.localeCompare(b.name, 'zh-CN'))
  return (
    <Section
      id="data"
      title="列表与表格"
      subtitle="ListView · Table · Avatar · Dot"
      wide
      code={
        '<Table>\n  <TableHead>\n    <TableRow><TableHeader>名称</TableHeader></TableRow>\n  </TableHead>\n  <TableBody>\n    {files.map((file) => (\n      <TableRow key={file.id}><TableCell>{file.name}</TableCell></TableRow>\n    ))}\n  </TableBody>\n</Table>'
      }
    >
      <div className="demo-data-layout">
        <ListView aria-label="协作成员">
          <ListItem>
            <Avatar name="miku" />
            <div className="demo-grow">
              miku<span className="demo-secondary-line">维护者</span>
            </div>
            <Dot tone="success" aria-label="在线" />
          </ListItem>
          <ListItem>
            <Avatar name="LN" />
            <div className="demo-grow">
              Lin<span className="demo-secondary-line">设计</span>
            </div>
            <Tag>成员</Tag>
          </ListItem>
          <ListItem>
            <Avatar name="YU" />
            <div className="demo-grow">
              Yu<span className="demo-secondary-line">开发</span>
            </div>
            <Tag>成员</Tag>
          </ListItem>
        </ListView>
        <div className="demo-table-scroll" tabIndex={0} role="region" aria-label="资源文件表格">
          <Table aria-label="资源文件">
            <TableHead>
              <TableRow>
                <TableHeader aria-sort={reverse ? 'descending' : 'ascending'}>
                  <Button variant="ghost" size="small" onClick={() => setReverse(!reverse)}>
                    名称 {reverse ? '↓' : '↑'}
                  </Button>
                </TableHeader>
                <TableHeader>大小</TableHeader>
                <TableHeader>状态</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.name}>
                  <TableCell>
                    <span className="demo-file-name">
                      <Icon name="file" size={17} />
                      {row.name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="demo-muted">{row.size}</span>
                  </TableCell>
                  <TableCell>
                    <Tag tone={row.status === '已同步' ? 'success' : 'neutral'}>{row.status}</Tag>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Section>
  )
}
