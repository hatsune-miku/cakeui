import {
  Slide,
  SlideCode,
  SlideColumns,
  SlideFigure,
  SlideFooter,
  SlideHeader,
  SlideImage,
  SlideList,
  SlideListItem,
  SlidePanel,
  SlideQuote,
  SlideStat,
  SlideText,
  SlideTitle,
} from '../../../../src/presentation'

export const slideNames = ['封面', '分栏与重点', '字号与留白', '图片与图注', '代码与用法', '引用与结尾']

export function createExampleSlides() {
  return [
    <Slide key="cover" aria-label="封面" tone="accent" layout="cover">
      <SlideText size="small">CakeUI / Presentation</SlideText>
      <SlideTitle level={1} size="display">
        HTML 幻灯片
        <br />
        排版与演示
      </SlideTitle>
      <SlideText size="lead">
        统一字号、留白和配色。
        <br />用 React 组件组合每一页内容。
      </SlideText>
      <SlideFooter page="01 / 06">hatsune-miku</SlideFooter>
    </Slide>,
    <Slide key="columns" aria-label="分栏与重点">
      <SlideHeader
        label="01 · 内容布局"
        title="把相关内容放在一起"
        description="两栏用来比较，面板用来突出需要记住的内容。"
      />
      <SlideColumns balance="wide-left">
        <SlidePanel variant="outline">
          <SlideTitle level={3} size="medium">
            先确定阅读顺序
          </SlideTitle>
          <SlideList>
            <SlideListItem>标题说明这一页的主要观点。</SlideListItem>
            <SlideListItem>正文保留必要的解释与证据。</SlideListItem>
            <SlideListItem>页脚标注来源和页码。</SlideListItem>
          </SlideList>
        </SlidePanel>
        <SlidePanel variant="accent">
          <SlideTitle level={3} size="medium">
            保持同一套间距
          </SlideTitle>
          <SlideText>页边距、栏间距和内容间距随画布等比例缩放。</SlideText>
          <SlideText size="small" muted>
            阅读模式在窄屏上改为单栏。
          </SlideText>
        </SlidePanel>
      </SlideColumns>
      <SlideFooter page="02 / 06">SlideColumns + SlidePanel</SlideFooter>
    </Slide>,
    <Slide key="type" aria-label="字号与留白">
      <SlideHeader
        label="02 · 排版比例"
        title="字号表达内容层级"
        description="以下是画布宽度为 1280 px 时的默认尺寸。"
      />
      <SlideColumns columns={3}>
        <SlideStat value="72" label="封面标题 / px" detail="SlideTitle size=display" />
        <SlideStat value="24" label="正文 / px" detail="SlideText size=body" />
        <SlideStat value="16" label="注释 / px" detail="SlideText size=small" />
      </SlideColumns>
      <SlidePanel>
        <SlideText>页边距 60 px，内容间距 24 px。普通标题为 48 px；内容较多时拆成下一页。</SlideText>
      </SlidePanel>
      <SlideFooter page="03 / 06" source="尺寸基于容器宽度计算">
        SlideStat
      </SlideFooter>
    </Slide>,
    <Slide key="figure" aria-label="图片与图注">
      <SlideHeader label="03 · 图文组合" title="让图片和说明形成一个整体" />
      <SlideColumns>
        <SlideFigure caption="图 1：标题、内容和页脚共享左右对齐线。">
          <SlideImage
            src="/presentation-layout.svg"
            alt="幻灯片布局示意：顶部标题、中间两栏内容、底部页脚，四周留出统一页边距"
          />
        </SlideFigure>
        <SlidePanel variant="outline">
          <SlideTitle level={3} size="medium">
            图片保留完整内容
          </SlideTitle>
          <SlideText>默认 contain；需要铺满时使用 cover。图注说明图片与观点的关系。</SlideText>
          <SlideText size="small" muted>
            可以换成原生 SVG、图表或视频。
          </SlideText>
        </SlidePanel>
      </SlideColumns>
      <SlideFooter page="04 / 06">SlideFigure + SlideImage</SlideFooter>
    </Slide>,
    <Slide key="code" aria-label="代码与用法">
      <SlideHeader label="04 · JSX 组合" title="一份内容，两种阅读方式" />
      <SlideColumns balance="wide-right">
        <SlideList>
          <SlideListItem>presentation：固定比例，逐页播放。</SlideListItem>
          <SlideListItem>document：连续阅读，窄屏重排。</SlideListItem>
          <SlideListItem>打印：显示所有页面，页间分页。</SlideListItem>
        </SlideList>
        <SlideCode language="TSX">
          {
            '<SlideDeck view="presentation">\n  <Slide aria-label="项目进展">\n    <SlideHeader title="本周进展" />\n    <SlideText>完成组件与文档。</SlideText>\n    <SlideFooter page="1 / 2" />\n  </Slide>\n  <Slide aria-label="下一步">\n    <SlideTitle>下一步</SlideTitle>\n  </Slide>\n</SlideDeck>'
          }
        </SlideCode>
      </SlideColumns>
      <SlideFooter page="05 / 06">SlideCode · 可选择复制</SlideFooter>
    </Slide>,
    <Slide key="quote" aria-label="引用与结尾" tone="inverted" layout="cover">
      <SlideText size="small">05 · 内容取舍</SlideText>
      <SlideQuote attribution="本示例的排版约定">
        一页讲清一个观点，
        <br />
        把解释留给必要的内容。
      </SlideQuote>
      <SlideText>相同的排版规则可以用于项目汇报、技术分享和课程讲义。</SlideText>
      <SlideFooter page="06 / 06">SlideQuote</SlideFooter>
    </Slide>,
  ]
}
