import React from "react";
import Container from "@material-ui/core/Container";
import { useStoreSyncedWithLocalStorage } from "common/utils/store";
import makeStyles from "@material-ui/core/styles/makeStyles";
import { useHistory, useLocation } from "react-router-dom";
import {
  REQUEST_RESET_PASSWORD_MUTATION,
  RESET_PASSWORD_MUTATION,
  useApi
} from "common/utils/api";
import Paper from "@material-ui/core/Paper/Paper";
import Typography from "@material-ui/core/Typography";
import TextField from "@material-ui/core/TextField/TextField";
import { LoadingButton } from "common/components/LoadingButton";
import Box from "@material-ui/core/Box";
import { formatApiError, graphQLErrorMatchesCode } from "common/utils/errors";
import jwt_decode from "jwt-decode";
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";
import { useLoadingScreen } from "common/utils/loading";
import { Header } from "../common/Header";
import { PasswordField } from "common/components/PasswordField";

const useStyles = makeStyles(theme => ({
  container: {
    padding: theme.spacing(2),
    paddingTop: theme.spacing(4),
    margin: "auto",
    flexGrow: 1
  },
  title: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
    textAlign: "center"
  },
  introText: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
    textAlign: "left"
  },
  submitText: {
    paddingTop: theme.spacing(10),
    paddingBottom: theme.spacing(10)
  }
}));

export function ResetPassword() {
  const store = useStoreSyncedWithLocalStorage();
  const api = useApi();
  const location = useLocation();
  const history = useHistory();
  const classes = useStyles();
  const withLoadingScreen = useLoadingScreen();

  const [didSubmitForm, setDidSubmitForm] = React.useState(false);
  const [password, setPassword] = React.useState(null);
  const [passwordCopy, setPasswordCopy] = React.useState(null);

  const [submitError, setSubmitError] = React.useState("");
  const [tokenError, setTokenError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [token, setToken] = React.useState(null);

  React.useEffect(() => {
    withLoadingScreen(async () => {
      const queryString = new URLSearchParams(location.search);
      const tok = queryString.get("token");
      setToken(tok);
      try {
        const decodedToken = jwt_decode(tok);
        // eslint-disable-next-line no-prototype-builtins
        if (!decodedToken.user_id || !decodedToken.hasOwnProperty("hash")) {
          throw Error;
        }
      } catch (err) {
        setTokenError(
          "Le lien de réinitialisation du mot de passe est invalide."
        );
        return;
      }
      // Logout if another user is logged in
      await api.logout(
        `/logout?next=${encodeURIComponent("/reset_password?token=" + tok)}`
      );
    });
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setSubmitError("");
    try {
      await api.graphQlMutate(
        RESET_PASSWORD_MUTATION,
        { token, password },
        {
          context: { nonPublicApi: true }
        }
      );
      await store.updateUserIdAndInfo();
      setDidSubmitForm(true);
      setLoading(false);
    } catch (err) {
      setSubmitError(
        formatApiError(err, gqlError => {
          if (graphQLErrorMatchesCode(gqlError, "INVALID_TOKEN")) {
            return "Le lien de réinitialisation est invalide.";
          }
          if (graphQLErrorMatchesCode(gqlError, "EXPIRED_TOKEN")) {
            return "Le lien de réinitialisation a expiré.";
          }
        })
      );
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <Container className={classes.container} maxWidth="md">
        {tokenError ? (
          <Typography color="error">{tokenError}</Typography>
        ) : (
          <Paper>
            <Container className="centered" maxWidth="sm">
              {didSubmitForm ? (
                <Grid
                  style={{ marginTop: 0 }}
                  container
                  spacing={10}
                  direction="column"
                  alignItems="center"
                >
                  <Grid item xs={12}>
                    <Typography className={classes.title} variant="h1">
                      🎉
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography>
                      Votre mot de passe a bien été réinitialisé !
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      color="primary"
                      variant="contained"
                      onClick={() => {
                        history.push("/");
                      }}
                    >
                      Aller dans mon espace
                    </Button>
                  </Grid>
                </Grid>
              ) : (
                <>
                  <Typography className={classes.title} variant="h3">
                    Réinitialisation du mot de passe
                  </Typography>
                  <form
                    className="vertical-form centered"
                    noValidate
                    autoComplete="off"
                    onSubmit={handleSubmit}
                  >
                    <Typography className={classes.introText}>
                      Veuillez choisir un nouveau mot de passe.
                    </Typography>
                    <PasswordField
                      fullWidth
                      className="vertical-form-text-input"
                      label="Nouveau mot de passe"
                      placeholder="Choisissez un mot de passe"
                      autoComplete="current-password"
                      value={password}
                      onChange={e => {
                        setSubmitError("");
                        setPassword(e.target.value);
                      }}
                    />
                    <PasswordField
                      required
                      fullWidth
                      label="Confirmez le mot de passe"
                      className="vertical-form-text-input"
                      error={
                        passwordCopy && passwordCopy !== password
                          ? "Le mot de passe n'est pas identique"
                          : null
                      }
                      value={passwordCopy}
                      onChange={e => {
                        setPasswordCopy(e.target.value);
                      }}
                    />
                    <Box my={4}>
                      <LoadingButton
                        variant="contained"
                        color="primary"
                        type="submit"
                        disabled={
                          !token ||
                          !password ||
                          !passwordCopy ||
                          password !== passwordCopy
                        }
                        loading={loading}
                      >
                        Valider
                      </LoadingButton>
                      {submitError && (
                        <Typography color="error">{submitError}</Typography>
                      )}
                    </Box>
                  </form>
                </>
              )}
            </Container>
          </Paper>
        )}
      </Container>
    </>
  );
}

export function RequestResetPassword() {
  const classes = useStyles();
  const api = useApi();

  const [email, setEmail] = React.useState("");
  const [didSubmitForm, setDidSubmitForm] = React.useState(false);
  const [submitError, setSubmitError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setSubmitError("");
    try {
      const apiResponse = await api.graphQlMutate(
        REQUEST_RESET_PASSWORD_MUTATION,
        { mail: email },
        {
          context: { nonPublicApi: true }
        }
      );
      if (apiResponse.data.account.requestResetPassword.message !== "success") {
        throw Error;
      }
      setDidSubmitForm(true);
      setLoading(false);
    } catch (err) {
      setSubmitError(formatApiError(err));
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <Container className={classes.container} maxWidth="md">
        <Paper>
          <Container className="centered" maxWidth="sm">
            {didSubmitForm ? (
              <Typography className={classes.submitText}>
                Si l'adresse email <strong>{email}</strong> correspond à un
                compte Mobilic vous allez y recevoir un email pour réinitialiser
                votre mot de passe.
              </Typography>
            ) : (
              <>
                <Typography className={classes.title} variant="h3">
                  Demande de réinitialisation du mot de passe
                </Typography>
                <form
                  className="vertical-form centered"
                  noValidate
                  autoComplete="off"
                  onSubmit={handleSubmit}
                >
                  <Typography className={classes.introText}>
                    Pour réinitialiser votre mot de passe veuillez entrer
                    l'adresse email avec laquelle vous vous êtes inscrits sur
                    Mobilic.
                  </Typography>
                  <TextField
                    required
                    fullWidth
                    className="vertical-form-text-input"
                    label="Adresse email de connexion"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={e => {
                      setSubmitError("");
                      setEmail(e.target.value.replace(/\s/g, ""));
                    }}
                  />
                  <Box my={4}>
                    <LoadingButton
                      variant="contained"
                      color="primary"
                      type="submit"
                      disabled={!email}
                      loading={loading}
                    >
                      Valider
                    </LoadingButton>
                    {submitError && (
                      <Typography color="error">{submitError}</Typography>
                    )}
                  </Box>
                </form>
              </>
            )}
          </Container>
        </Paper>
      </Container>
    </>
  );
}