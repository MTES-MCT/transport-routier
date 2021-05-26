import React from "react";
import Box from "@material-ui/core/Box";
import Divider from "@material-ui/core/Divider";
import Typography from "@material-ui/core/Typography";
import { formatPersonName } from "common/utils/coworkers";
import IconButton from "@material-ui/core/IconButton";
import { useApi } from "common/utils/api";
import { getAccessibleRoutes } from "./routes";

import { useHistory, useLocation } from "react-router-dom";
import { useStoreSyncedWithLocalStorage } from "common/utils/store";
import { Logos } from "./Logos";
import MenuIcon from "@material-ui/icons/Menu";
import withWidth, { isWidthUp } from "@material-ui/core/withWidth";
import useTheme from "@material-ui/core/styles/useTheme";
import makeStyles from "@material-ui/core/styles/makeStyles";
import Button from "@material-ui/core/Button";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import List from "@material-ui/core/List";
import Drawer from "@material-ui/core/Drawer";
import ListSubheader from "@material-ui/core/ListSubheader";
import CloseIcon from "@material-ui/icons/Close";
import Tooltip from "@material-ui/core/Tooltip";
import { MainCtaButton } from "../pwa/components/MainCtaButton";
import { Link, LinkButton } from "./LinkButton";

const useStyles = makeStyles(theme => ({
  navItemButton: {
    marginLeft: theme.spacing(2),
    borderRadius: 2
  },
  docButton: {
    textTransform: "none",
    borderRadius: 0,
    fontSize: "1rem"
  },
  divider: {
    margin: theme.spacing(1)
  },
  navListItem: {
    width: "100%",
    paddingLeft: theme.spacing(4),
    paddingRight: theme.spacing(6),
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
    display: "block",
    "&:hover": {
      color: theme.palette.primary.main,
      backgroundColor: theme.palette.background.default
    }
  },
  selectedNavListItem: {
    background: `linear-gradient(to right, ${theme.palette.primary.main}, ${theme.palette.primary.main} 5px, ${theme.palette.background.default} 5px, ${theme.palette.background.default})`
  },
  nestedListSubheader: {
    paddingLeft: theme.spacing(4)
  },
  closeNavButton: {
    display: "flex",
    justifyContent: "flex-end"
  },
  navDrawer: {
    minWidth: 200
  },
  userName: {
    maxWidth: 500
  }
}));

function HeaderContainer(props) {
  const theme = useTheme();
  return (
    <Box
      px={2}
      className="header-container"
      style={{ backgroundColor: theme.palette.background.paper }}
    >
      <Box py={1} {...props}></Box>
      <Divider className="full-width-divider" />
    </Box>
  );
}

function ListRouteItem({ route, closeDrawer }) {
  const classes = useStyles();
  const history = useHistory();
  const location = useLocation();

  const selected = route.exact
    ? location.pathname === route.path
    : location.pathname.startsWith(route.path);

  return route.subRoutes ? (
    <>
      <Divider />
      <List
        dense
        key={route.path + "subRoutes"}
        disablePadding
        subheader={
          <ListSubheader
            component="div"
            className={classes.nestedListSubheader}
          >
            {route.label}
          </ListSubheader>
        }
      >
        {route.subRoutes.map(subRoute => (
          <ListRouteItem
            key={subRoute.path}
            route={{ ...subRoute, path: `${route.path}${subRoute.path}` }}
            closeDrawer={closeDrawer}
          />
        ))}
      </List>
      <Divider />
    </>
  ) : (
    <ListItem key={route.path} disableGutters>
      <Link
        className={`${classes.navListItem} ${selected &&
          classes.selectedNavListItem}`}
        variant="body1"
        color="inherit"
        to={route.path}
        underline="none"
        onClick={e => {
          e.preventDefault();
          if (!selected) history.push(route.path);
          closeDrawer();
        }}
      >
        {route.label}
      </Link>
    </ListItem>
  );
}

export function NavigationMenu({ open, setOpen }) {
  const api = useApi();
  const store = useStoreSyncedWithLocalStorage();
  const userInfo = store.userInfo();
  const companies = store.companies();

  const classes = useStyles();

  const routes = getAccessibleRoutes({ userInfo, companies });

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={() => setOpen(false)}
      PaperProps={{ className: classes.navDrawer }}
    >
      <Box className={classes.closeNavButton} pt={2}>
        <IconButton
          aria-label="Fermer"
          onClick={() => setOpen(false)}
          className={classes.closeNavButton}
        >
          <CloseIcon />
        </IconButton>
      </Box>
      <List dense>
        {routes
          .filter(
            r => !r.menuItemFilter || r.menuItemFilter({ userInfo, companies })
          )
          .map(route => (
            <ListRouteItem
              key={route.path}
              route={route}
              closeDrawer={() => setOpen(false)}
            />
          ))}
        {store.userId() && (
          <ListItem
            button
            aria-label="Déconnexion"
            className={classes.navListItem}
            onClick={() => api.logout({ failOnError: false })}
            disableGutters
          >
            <ListItemText
              primary="Déconnexion"
              primaryTypographyProps={{ variant: "body1" }}
            />
          </ListItem>
        )}
      </List>
    </Drawer>
  );
}

function MobileHeader({ disableMenu }) {
  const [openNavDrawer, setOpenNavDrawer] = React.useState(false);

  return (
    <Box className="flex-row-space-between">
      <Logos leaveSpaceForMenu={!disableMenu} />
      {!disableMenu && [
        <IconButton
          aria-label="Menu"
          key={0}
          edge="end"
          onClick={() => setOpenNavDrawer(!openNavDrawer)}
        >
          <MenuIcon />
        </IconButton>,
        <NavigationMenu
          key={1}
          open={openNavDrawer}
          setOpen={setOpenNavDrawer}
        />
      ]}
    </Box>
  );
}

function DesktopHeader({ disableMenu }) {
  const store = useStoreSyncedWithLocalStorage();

  const location = useLocation();
  const history = useHistory();

  const [openNavDrawer, setOpenNavDrawer] = React.useState(false);

  const classes = useStyles();
  const userInfo = store.userInfo();
  const companies = store.companies();
  const primaryCompany = companies.find(c => c.isPrimary);
  const companyName = primaryCompany ? primaryCompany.name : null;
  const routes = getAccessibleRoutes({ userInfo, companies });

  const docLinks = () => [
    <LinkButton
      aria-label="Foire aux questions"
      key={1}
      href="https://faq.mobilic.beta.gouv.fr"
      target="_blank"
      rel="noopener noreferrer"
      className={classes.docButton}
    >
      Foire aux questions
    </LinkButton>,
    <LinkButton
      aria-label="Partenaires"
      key={2}
      to="/partners"
      className={classes.docButton}
    >
      Partenaires
    </LinkButton>
  ];

  return (
    <Box className="flex-row-space-between">
      <Logos leaveSpaceForMenu={!disableMenu} />
      {store.userId() ? (
        <Box className="flex-row-center" style={{ overflowX: "hidden" }}>
          {!disableMenu && docLinks()}
          {!disableMenu && (
            <Divider
              className={classes.divider}
              orientation="vertical"
              flexItem
            />
          )}
          <Tooltip
            interactive
            title={`${formatPersonName(userInfo)}${
              companyName ? " - " + companyName : ""
            }`}
          >
            <Typography noWrap variant="body1" className={classes.userName}>
              {formatPersonName(userInfo)}
              {companyName ? ` - ${companyName}` : ""}
            </Typography>
          </Tooltip>
          {!disableMenu && [
            <IconButton
              aria-label="Menu"
              key={0}
              style={{ marginRight: 16 }}
              edge="end"
              onClick={() => setOpenNavDrawer(!openNavDrawer)}
            >
              <MenuIcon />
            </IconButton>,
            <NavigationMenu
              key={1}
              open={openNavDrawer}
              setOpen={setOpenNavDrawer}
            />
          ]}
        </Box>
      ) : (
        !disableMenu && (
          <Box className="flex-row">
            {docLinks()}
            <Divider
              className={classes.divider}
              orientation="vertical"
              flexItem
            />
            {routes
              .filter(
                r =>
                  r.accessible({ userInfo, companies }) &&
                  (!r.menuItemFilter ||
                    r.menuItemFilter({ userInfo, companies }))
              )
              .map(route => {
                const ButtonComponent = route.mainCta
                  ? MainCtaButton
                  : props => (
                      <Button variant="outlined" color="primary" {...props} />
                    );
                return (
                  <ButtonComponent
                    aria-label={route.label}
                    key={route.path}
                    value={route.path}
                    href={route.path}
                    className={classes.navItemButton}
                    onClick={e => {
                      e.preventDefault();
                      if (!location.pathname.startsWith(route.path))
                        history.push(route.path);
                    }}
                  >
                    {route.label}
                  </ButtonComponent>
                );
              })}
          </Box>
        )
      )}
    </Box>
  );
}

function _Header({ width, disableMenu }) {
  return (
    <HeaderContainer>
      {isWidthUp("md", width) ? (
        <DesktopHeader disableMenu={disableMenu} />
      ) : (
        <MobileHeader disableMenu={disableMenu} />
      )}
    </HeaderContainer>
  );
}

export const Header = withWidth()(_Header);
