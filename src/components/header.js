import { Link } from "gatsby"
import PropTypes from "prop-types"
import React from "react"
import Logo  from "./logo"

const Header = ({ siteTitle, menuLinks }) => (
  <header
    style={{
      marginBottom: `1.45rem`,
    }}
  >
    <div
      style={{
        background: `rebeccapurple`,
        margin: `0 auto`,
        maxWidth: 960,
        padding: `1.45rem 1.0875rem`,
      }}
    >
      <h1
        style={{
          margin: 0,
          color: `white`,
          textDecoration: `none`,
        }}
      >
        {siteTitle}
      </h1>
    </div>
    <div>
      <nav>
        <ul style={{ display: "flex", flex: 1 }}>
          {
            menuLinks.map(link => (
              <li
                key={link.name}
                style={{
                  listStyleType: `none`,
                  padding: `1rem`,
                }}
              >
                <Link style={{ color: `purple` }} to={link.link}>
                  {link.name}
                </Link>
              </li>
            ))
          }
        </ul>
      </nav>
    </div>

  </header>
)

Header.propTypes = {
  menuLinks: PropTypes.array,
  siteTitle: PropTypes.string,
}

Header.defaultProps = {
  menuLinks: [],
  siteTitle: ``,
}

export default Header
