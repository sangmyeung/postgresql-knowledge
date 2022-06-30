const config = {
  gatsby: {
    pathPrefix: '/postgresql-knowledge',
    siteUrl: 'https://hasura.io',
    gaTrackingId: null,
    trailingSlash: false,
  },
  header: {
    logo: 'https://avatars.githubusercontent.com/u/99643403?s=200&v=4',
    logoLink: 'https://tmaxtibero.com/',
    title: "<a href='https://tmaxtibero.com/'>Tech Blog</a>",

/*      "<a href='https://hasura.io/learn/'><img class='img-responsive' src='https://graphql-engine-cdn.hasura.io/learn-hasura/assets/homepage/learn-logo.svg' alt='Learn logo' /></a>", */
    githubUrl: 'https://github.com/hypersql/postgresql-knowledge',
    helpUrl: '',
    tweetText: '',
    social: `<li>
		    <a href="https://twitter.com/tmaxsoft" target="_blank" rel="noopener">
		      <div class="twitterBtn">
		        <img src='https://graphql-engine-cdn.hasura.io/learn-hasura/assets/homepage/twitter-brands-block.svg' alt={'Twitter'}/>
		      </div>
		    </a>
		  </li>`,
    links: [{ text: '', link: '' }],
    search: {
      enabled: false,
      indexName: '',
      algoliaAppId: process.env.GATSBY_ALGOLIA_APP_ID,
      algoliaSearchKey: process.env.GATSBY_ALGOLIA_SEARCH_KEY,
      algoliaAdminKey: process.env.ALGOLIA_ADMIN_KEY,
    },
  },
  sidebar: {
    forcedNavOrder: [
      '/contents',
      '/postgresql', // add trailing slash if enabled above
    ],
    collapsedNav: [
      '/postgresql',
    ],
    links: [{ text: 'InterDB blog', link: 'https://www.interdb.jp/pg/' },
            { text: 'PostgreSQL documentation', link: 'https://www.postgresql.org/docs/' }],
    frontline: false,
    ignoreIndex: true,
    title:
      "<a href='https://github.com/hypersql/postgresql-knowledge'>PostgreSQL Knowledge</a>",
  },
  siteMetadata: {
    title: 'Gatsby Gitbook Boilerplate | Hasura',
    description: 'Documentation built with mdx. Powering hasura.io/learn ',
    ogImage: null,
    docsLocation: 'https://github.com/hypersql/postgresql-knowledge/tree/master/src/content',
    favicon: 'https://graphql-engine-cdn.hasura.io/img/hasura_icon_black.svg',
  },
  pwa: {
    enabled: false, // disabling this will also remove the existing service worker.
    manifest: {
      name: 'Gatsby Gitbook Starter',
      short_name: 'GitbookStarter',
      start_url: '/',
      background_color: '#6b37bf',
      theme_color: '#6b37bf',
      display: 'standalone',
      crossOrigin: 'use-credentials',
      icons: [
        {
          src: 'src/pwa-512.png',
          sizes: `512x512`,
          type: `image/png`,
        },
      ],
    },
  },
};

module.exports = config;
