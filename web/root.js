import React from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
  useLocation,
  useHistory
} from "react-router-dom";

import "common/assets/fonts/Evolventa/Evolventa-Bold.ttf";
import "common/assets/fonts/Evolventa/Evolventa-BoldOblique.ttf";
import "common/assets/fonts/Evolventa/Evolventa-Oblique.ttf";
import "common/assets/fonts/Evolventa/Evolventa-Regular.ttf";
import "common/assets/fonts/Source Sans Pro/SourceSansPro-Bold.otf";
import "common/assets/fonts/Source Sans Pro/SourceSansPro-It.otf";
import "common/assets/fonts/Source Sans Pro/SourceSansPro-Regular.otf";

import "./index.css";
import "common/assets/styles/root.scss";

import {
  StoreSyncedWithLocalStorageProvider,
  useStoreSyncedWithLocalStorage
} from "common/utils/store";
import { ApiContextProvider, useApi } from "common/utils/api";
import { theme } from "common/utils/theme";
import { MODAL_DICT } from "./modals";
import { ThemeProvider } from "@material-ui/styles";
import { CssBaseline } from "@material-ui/core";
import { loadUserData } from "common/utils/loadUserData";
import { MuiPickersUtilsProvider } from "@material-ui/pickers";
import frLocale from "date-fns/locale/fr";
import { FrLocalizedUtils } from "common/utils/time";
import { ActionsContextProvider } from "common/utils/actions";
import { ModalProvider } from "common/utils/modals";
import {
  LoadingScreenContextProvider,
  useLoadingScreen
} from "common/utils/loading";
import {
  getAccessibleRoutes,
  getFallbackRoute,
  isAccessible
} from "./common/routes";
import { ScrollToTop } from "common/utils/scroll";
import { SnackbarProvider } from "./common/Snackbar";
import { EnvironmentHeader } from "./common/EnvironmentHeader";
import { currentUserId } from "common/utils/cookie";

export default function Root() {
  return (
    <StoreSyncedWithLocalStorageProvider storage={localStorage}>
      <Router>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ApiContextProvider>
            <MuiPickersUtilsProvider utils={FrLocalizedUtils} locale={frLocale}>
              <SnackbarProvider>
                <LoadingScreenContextProvider>
                  <ModalProvider modalDict={MODAL_DICT}>
                    <ActionsContextProvider>
                      <ScrollToTop />
                      <_Root />
                    </ActionsContextProvider>
                  </ModalProvider>
                </LoadingScreenContextProvider>
              </SnackbarProvider>
            </MuiPickersUtilsProvider>
          </ApiContextProvider>
        </ThemeProvider>
      </Router>
    </StoreSyncedWithLocalStorageProvider>
  );
}

function _Root() {
  const api = useApi();
  const store = useStoreSyncedWithLocalStorage();
  const withLoadingScreen = useLoadingScreen();

  const userId = store.userId();
  const userInfo = store.userInfo();
  const companies = store.companies();

  const location = useLocation();
  const history = useHistory();

  const fallbackRoute = getFallbackRoute({
    userInfo,
    companies
  });

  const [loadedLocation, setLoadedLocation] = React.useState(null);

  const loadUserAndRoute = async () => {
    const isSigningUp = location.pathname.startsWith("/signup");
    const isInOauthFlow = location.pathname.startsWith("/oauth");
    const queryString = new URLSearchParams(location.search);

    const isLoggingOut = location.pathname.startsWith("/logout");
    const isInControl = location.pathname.startsWith("/control");
    if (isLoggingOut || isInControl) {
      return;
    }
    if (!document.hidden && !isInOauthFlow) {
      await loadUserData(api, store);
    }
    if (!isSigningUp && !isInOauthFlow) {
      // Routing priority :
      // 1) if there is a next URL (after login) redirect to this one
      // 2) if current URL is accessible keep it
      // 3) redirect to fallback
      const nextLocation = queryString.get("next");
      if (nextLocation) history.replace(nextLocation, location.state);
      else if (
        loadedLocation &&
        isAccessible(loadedLocation, {
          userInfo: store.userInfo(),
          companies: store.companies()
        })
      ) {
        history.replace(loadedLocation, location.state);
      } else
        history.replace(
          getFallbackRoute({
            userInfo: store.userInfo(),
            companies: store.companies()
          }),
          location.state
        );
    }
    setLoadedLocation(null);
    if (!document.hidden) api.executePendingRequests();
  };

  React.useEffect(() => {
    if (
      !currentUserId() &&
      (location.pathname.startsWith("/app") ||
        location.pathname.startsWith("/admin"))
    )
      history.replace(
        "/login?next=" + encodeURIComponent(location.pathname + location.search)
      );
    else if (
      !location.pathname.startsWith("/login") &&
      !location.pathname.startsWith("/logout") &&
      !location.pathname.startsWith("/activate_email") &&
      !location.pathname.startsWith("/redeem_invite") &&
      !location.pathname.startsWith("/fc-callback")
    )
      setLoadedLocation(location.pathname + location.search);
  }, []);

  React.useEffect(() => {
    withLoadingScreen(
      async () => {
        const latestUserId = store.userId();
        if (latestUserId) await loadUserAndRoute();
      },
      "loadUser",
      false
    );
    return () => {};
  }, [userId]);

  const routes = getAccessibleRoutes({ userInfo, companies });

  return (
    <>
      {(process.env.REACT_APP_SENTRY_ENVIRONMENT === "staging" ||
        process.env.REACT_APP_SENTRY_ENVIRONMENT === "sandbox") && (
        <EnvironmentHeader />
      )}
      <Switch>
        {routes.map(route => (
          <Route
            key={route.path}
            exact={route.exact || false}
            path={route.path}
          >
            {route.component}
          </Route>
        ))}
        <Redirect key="default" from="*" to={fallbackRoute} />
      </Switch>
    </>
  );
}
