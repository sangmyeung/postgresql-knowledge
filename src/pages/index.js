import React from "react"
import { Link } from "gatsby"

import Layout from "../components/layout"
import SEO from "../components/seo"

const IndexPage = () => (
  <Layout>
    <SEO title="Home" />
    <p>이 페이지는 PostgreSQL 공부를 하면서 배운 내용을 정리하기 위해 만들었습니다.
      <br/> 특히 아래 Hironobu Suzuki가 작성한 "The Internals of PostgreSQL" 블로그를 읽고 정리한 내용인 점을 알려드립니다.
    </p>
    <p></p>
    <div style={{padding: `10px`, border: `2px solid gray`, marginBottom: `1.45rem`}}>
      <a href="https://www.interdb.jp/pg/">Suzuki's Blog </a>
      <br/>© Copyright ALL Right Reserved, Hironobu SUZUKI.
    </div>

    <Link to="/page-2/">Go to page 2</Link>
  </Layout>
)

export default IndexPage
