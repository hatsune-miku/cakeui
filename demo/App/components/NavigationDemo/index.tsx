import { useState } from 'react'

import { Badge, Breadcrumb, BreadcrumbItem, Pagination, Tab, TabList, TabPanel, Tabs } from '../../../../src'
import { Section } from '../Section'

export function NavigationDemo() {
  const [page, setPage] = useState(1)
  return (
    <Section
      id="navigation"
      title="导航与标签页"
      subtitle="Tabs · Breadcrumb · Pagination"
      code={
        '<Tabs defaultValue="files">\n  <TabList aria-label="工作空间">\n    <Tab value="files">文件</Tab>\n    <Tab value="activity">动态</Tab>\n  </TabList>\n  <TabPanel value="files">文件内容</TabPanel>\n  <TabPanel value="activity">最近动态</TabPanel>\n</Tabs>'
      }
    >
      <Breadcrumb aria-label="示例路径">
        <BreadcrumbItem>
          <a className="demo-link" href="#navigation">
            工作空间
          </a>
        </BreadcrumbItem>
        <BreadcrumbItem aria-current="page">设计资源</BreadcrumbItem>
      </Breadcrumb>
      <Tabs defaultValue="files">
        <TabList aria-label="资源分类">
          <Tab value="files">
            文件<Badge>8</Badge>
          </Tab>
          <Tab value="activity">最近动态</Tab>
          <Tab value="archive">已归档</Tab>
          <Tab value="locked" disabled>
            共享
          </Tab>
        </TabList>
        <TabPanel value="files">
          <p className="demo-panel-text">所有文件都在这里，按你的方式整理。</p>
        </TabPanel>
        <TabPanel value="activity">
          <p className="demo-panel-text">今天 14:32 更新了组件规范。</p>
        </TabPanel>
        <TabPanel value="archive">
          <p className="demo-panel-text">归档的文件会保留在这里。</p>
        </TabPanel>
        <TabPanel value="locked">共享尚未启用。</TabPanel>
      </Tabs>
      <div className="demo-between">
        <span className="demo-footnote" aria-live="polite">
          第 {page} 页 / 共 8 页
        </span>
        <Pagination
          aria-label="资源分页"
          page={page}
          count={8}
          onPageChange={setPage}
          previousLabel="上一页"
          nextLabel="下一页"
          pageLabel={(value) => `第 ${value} 页`}
        />
      </div>
    </Section>
  )
}
