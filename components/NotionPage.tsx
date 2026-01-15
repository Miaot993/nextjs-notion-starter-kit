import { PasswordGate } from './PasswordGate'

import cs from 'classnames'
import dynamic from 'next/dynamic'
import Image from 'next/legacy/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { type PageBlock } from 'notion-types'
import { formatDate, getBlockTitle, getPageProperty } from 'notion-utils'
import * as React from 'react'
import BodyClassName from 'react-body-classname'
import {
  type NotionComponents,
  NotionRenderer,
  useNotionContext
} from 'react-notion-x'
import { EmbeddedTweet, TweetNotFound, TweetSkeleton } from 'react-tweet'
import { useSearchParam } from 'react-use'

// --- CSO 添加: 引入亮暗模式图标 ---
import { IoMoonSharp } from '@react-icons/all-files/io5/IoMoonSharp'
import { IoSunnyOutline } from '@react-icons/all-files/io5/IoSunnyOutline'
// -------------------------------

import type * as types from '@/lib/types'
import * as config from '@/lib/config'
import { mapImageUrl } from '@/lib/map-image-url'
import { getCanonicalPageUrl, mapPageUrl } from '@/lib/map-page-url'
import { searchNotion } from '@/lib/search-notion'
import { useDarkMode } from '@/lib/use-dark-mode'

import { Footer } from './Footer'
import { GitHubShareButton } from './GitHubShareButton'
import { Loading } from './Loading'
import { NotionPageHeader } from './NotionPageHeader'
import { Page404 } from './Page404'
import { PageAside } from './PageAside'
import { PageHead } from './PageHead'
import styles from './styles.module.css'

// -----------------------------------------------------------------------------
// dynamic imports for optional components
// -----------------------------------------------------------------------------

const Code = dynamic(() =>
  import('react-notion-x/build/third-party/code').then(async (m) => {
    // add / remove any prism syntaxes here
    await Promise.allSettled([
      // @ts-ignore
      import('prismjs/components/prism-markup-templating.js'),
      // @ts-ignore
      import('prismjs/components/prism-markup.js'),
      // @ts-ignore
      import('prismjs/components/prism-bash.js'),
      // @ts-ignore
      import('prismjs/components/prism-c.js'),
      // @ts-ignore
      import('prismjs/components/prism-cpp.js'),
      // @ts-ignore
      import('prismjs/components/prism-csharp.js'),
      // @ts-ignore
      import('prismjs/components/prism-docker.js'),
      // @ts-ignore
      import('prismjs/components/prism-java.js'),
      // @ts-ignore
      import('prismjs/components/prism-js-templates.js'),
      // @ts-ignore
      import('prismjs/components/prism-coffeescript.js'),
      // @ts-ignore
      import('prismjs/components/prism-diff.js'),
      // @ts-ignore
      import('prismjs/components/prism-git.js'),
      // @ts-ignore
      import('prismjs/components/prism-go.js'),
      // @ts-ignore
      import('prismjs/components/prism-graphql.js'),
      // @ts-ignore
      import('prismjs/components/prism-handlebars.js'),
      // @ts-ignore
      import('prismjs/components/prism-less.js'),
      // @ts-ignore
      import('prismjs/components/prism-makefile.js'),
      // @ts-ignore
      import('prismjs/components/prism-markdown.js'),
      // @ts-ignore
      import('prismjs/components/prism-objectivec.js'),
      // @ts-ignore
      import('prismjs/components/prism-ocaml.js'),
      // @ts-ignore
      import('prismjs/components/prism-python.js'),
      // @ts-ignore
      import('prismjs/components/prism-reason.js'),
      // @ts-ignore
      import('prismjs/components/prism-rust.js'),
      // @ts-ignore
      import('prismjs/components/prism-sass.js'),
      // @ts-ignore
      import('prismjs/components/prism-scss.js'),
      // @ts-ignore
      import('prismjs/components/prism-solidity.js'),
      // @ts-ignore
      import('prismjs/components/prism-sql.js'),
      // @ts-ignore
      import('prismjs/components/prism-stylus.js'),
      // @ts-ignore
      import('prismjs/components/prism-swift.js'),
      // @ts-ignore
      import('prismjs/components/prism-wasm.js'),
      // @ts-ignore
      import('prismjs/components/prism-yaml.js')
    ])
    return m.Code
  })
)

const Collection = dynamic(() =>
  import('react-notion-x/build/third-party/collection').then(
    (m) => m.Collection
  )
)
const Equation = dynamic(() =>
  import('react-notion-x/build/third-party/equation').then((m) => m.Equation)
)
const Pdf = dynamic(
  () => import('react-notion-x/build/third-party/pdf').then((m) => m.Pdf),
  {
    ssr: false
  }
)
const Modal = dynamic(
  () =>
    import('react-notion-x/build/third-party/modal').then((m) => {
      m.Modal.setAppElement('.notion-viewport')
      return m.Modal
    }),
  {
    ssr: false
  }
)

function Tweet({ id }: { id: string }) {
  const { recordMap } = useNotionContext()
  const tweet = (recordMap as types.ExtendedTweetRecordMap)?.tweets?.[id]

  return (
    <React.Suspense fallback={<TweetSkeleton />}>
      {tweet ? <EmbeddedTweet tweet={tweet} /> : <TweetNotFound />}
    </React.Suspense>
  )
}

const propertyLastEditedTimeValue = (
  { block, pageHeader }: any,
  defaultFn: () => React.ReactNode
) => {
  if (pageHeader && block?.last_edited_time) {
    return `Last updated ${formatDate(block?.last_edited_time, {
      month: 'long'
    })}`
  }

  return defaultFn()
}

const propertyDateValue = (
  { data, schema, pageHeader }: any,
  defaultFn: () => React.ReactNode
) => {
  if (pageHeader && schema?.name?.toLowerCase() === 'published') {
    const publishDate = data?.[0]?.[1]?.[0]?.[1]?.start_date

    if (publishDate) {
      return `${formatDate(publishDate, {
        month: 'long'
      })}`
    }
  }

  return defaultFn()
}

const propertyTextValue = (
  { schema, pageHeader }: any,
  defaultFn: () => React.ReactNode
) => {
  if (pageHeader && schema?.name?.toLowerCase() === 'author') {
    return <b>{defaultFn()}</b>
  }

  return defaultFn()
}

export function NotionPage({
  site,
  recordMap,
  error,
  pageId
}: types.PageProps) {
  const router = useRouter()
  const lite = useSearchParam('lite')

  const components = React.useMemo<Partial<NotionComponents>>(
    () => ({
      nextLegacyImage: Image,
      nextLink: Link,
      Code,
      Collection,
      Equation,
      Pdf,
      Modal,
      Tweet,
      Header: NotionPageHeader,
      propertyLastEditedTimeValue,
      propertyTextValue,
      propertyDateValue
    }),
    []
  )

  const isLiteMode = lite === 'true'

  // --- CSO 修改: 获取 toggleDarkMode ---
  const { isDarkMode, toggleDarkMode } = useDarkMode()
  // -----------------------------------

  const siteMapPageUrl = React.useMemo(() => {
    const params: any = {}
    if (lite) params.lite = lite

    const searchParams = new URLSearchParams(params)
    return site ? mapPageUrl(site, recordMap!, searchParams) : undefined
  }, [site, recordMap, lite])

  const keys = Object.keys(recordMap?.block || {})
  const block = recordMap?.block?.[keys[0]!]?.value

  const isBlogPost =
    block?.type === 'page' && block?.parent_table === 'collection'

  // ==================================================
  // CSO 暴力解锁补丁：强制显示目录
  // ==================================================
  const showTableOfContents = true 
  const minTableOfContentsItems = 1
  // ==================================================

  const pageAside = React.useMemo(
    () => (
      <PageAside
        block={block!}
        recordMap={recordMap!}
        isBlogPost={isBlogPost}
      />
    ),
    [block, recordMap, isBlogPost]
  )

  const footer = React.useMemo(() => <Footer />, [])

  if (router.isFallback) {
    return <Loading />
  }

  if (error || !site || !block) {
    return <Page404 site={site} pageId={pageId} error={error} />
  }

  const title = getBlockTitle(block, recordMap) || site.name

  console.log('notion page', {
    isDev: config.isDev,
    title,
    pageId,
    rootNotionPageId: site.rootNotionPageId,
    recordMap
  })

  if (!config.isServer) {
    const g = window as any
    g.pageId = pageId
    g.recordMap = recordMap
    g.block = block
  }

  const canonicalPageUrl = config.isDev
    ? undefined
    : getCanonicalPageUrl(site, recordMap)(pageId)

  const socialImage = mapImageUrl(
    getPageProperty<string>('Social Image', block, recordMap) ||
      (block as PageBlock).format?.page_cover ||
      config.defaultPageCover,
    block
  )

  const socialDescription =
    getPageProperty<string>('Description', block, recordMap) ||
    config.description

  // ==============================================================
  // CSO 核心功能：VIP 多级锁定逻辑 (终极版)
  // ==============================================================
  
  // 1. 获取当前页面 ID 和 父级 ID
  const currentBlockId = (keys[0] || '').replace(/-/g, '')
  // @ts-ignore
  const parentId = (block?.parent_id || '').replace(/-/g, '')

  // 2. VIP 页面 ID 列表 (这里只填【最顶层】的 VIP 页面 ID 即可)
  const LOCKED_PAGE_IDS = [
    '2e8a2b748e4d80e58739d25aa9a83220', // VIP页面1
    '2e8a2b748e4d80faa623eea08adf2f66', // VIP页面2
  ]

  // 3. 智能判断：
  // 规则A: 如果我自己是 VIP，锁住。
  // 规则B: 如果我的爸爸是 VIP，我也锁住。(这样子页面就自动安全了)
  const shouldLock = LOCKED_PAGE_IDS.includes(currentBlockId) || LOCKED_PAGE_IDS.includes(parentId)

  // 4. 封装内容
  const pageContent = (
    <>
      <PageHead
        pageId={pageId}
        site={site}
        title={title}
        description={socialDescription}
        image={socialImage}
        url={canonicalPageUrl}
        isBlogPost={isBlogPost}
      />

      {/* ======================= CSO植入开始 ======================= */}
      <div className="custom-header-buttons">
        <a
          className="toggle-dark-mode"
          onClick={toggleDarkMode}
          title="Toggle dark mode"
        >
          {isDarkMode ? <IoMoonSharp /> : <IoSunnyOutline />}
        </a>
      </div>
      {/* ======================= CSO植入结束 ======================= */}

      {isLiteMode && <BodyClassName className='notion-lite' />}
      {isDarkMode && <BodyClassName className='dark-mode' />}

      <NotionRenderer
        bodyClassName={cs(
          styles.notion,
          pageId === site.rootNotionPageId && 'index-page'
        )}
        darkMode={isDarkMode}
        components={components}
        recordMap={recordMap}
        rootPageId={site.rootNotionPageId}
        rootDomain={site.domain}
        fullPage={!isLiteMode}
        previewImages={!!recordMap.preview_images}
        showCollectionViewDropdown={false}
        showTableOfContents={showTableOfContents}
        minTableOfContentsItems={minTableOfContentsItems}
        defaultPageIcon={config.defaultPageIcon}
        defaultPageCover={config.defaultPageCover}
        defaultPageCoverPosition={config.defaultPageCoverPosition}
        mapPageUrl={siteMapPageUrl}
        mapImageUrl={mapImageUrl}
        searchNotion={config.isSearchEnabled ? searchNotion : undefined}
        pageAside={pageAside}
        footer={footer}
      />

      <GitHubShareButton />
      
      {/* =========================================================== */}
      {/* CSO 终极样式修正：强制扁平化、去圆角、去投影 */}
      {/* =========================================================== */}
      <style jsx global>{`
        /* 1. 顶部大图 (Hero) - 强制去圆角、去投影 */
        .notion-block-image img,
        .notion-block-image .notion-asset-wrapper {
          border-radius: 4px !important; /* 统一 4px 圆角 */
          box-shadow: none !important;
          max-height: 50vh !important; /* 防止图片过高 */
          object-fit: cover !important;
        }

        /* 消除图片外层多余的圆角遮罩 */
        .notion-block-image > span {
            border-radius: 4px !important;
        }

        /* 2. 画廊卡片 (Gallery) - 强制扁平化 */
        .notion-gallery-card {
          border-radius: 4px !important; /* 卡片小圆角 */
          box-shadow: none !important;   /* 去掉卡片投影 */
          border: 1px solid rgba(135, 131, 120, 0.15) !important; /* 加细边框 */
          background: transparent !important;
        }
        
        /* 3. 卡片悬停效果 - 依然无投影 */
        .notion-gallery-card:hover {
          box-shadow: none !important;
          background: rgba(128, 128, 128, 0.04) !important;
          transform: translateY(-2px);
          border-color: rgba(135, 131, 120, 0.3) !important;
        }

        /* 4. 暗黑模式适配 */
        [data-theme="dark"] .notion-gallery-card {
          border-color: rgba(255, 255, 255, 0.1) !important;
        }
        [data-theme="dark"] .notion-gallery-card:hover {
          background: rgba(255, 255, 255, 0.05) !important;
        }
      `}</style>
    </>
  )

  // 5. 最终渲染
  if (shouldLock) {
    return (
      <PasswordGate>
        {pageContent}
      </PasswordGate>
    )
  }

  return pageContent
  // ==============================================================
}
