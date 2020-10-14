import React from "react";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import TextField from "@material-ui/core/TextField/TextField";
import { useApi, USER_SIGNUP_MUTATION } from "common/utils/api";
import { useHistory } from "react-router-dom";
import { useStoreSyncedWithLocalStorage } from "common/utils/store";
import Paper from "@material-ui/core/Paper";
import SignupStepper from "./SignupStepper";
import makeStyles from "@material-ui/core/styles/makeStyles";
import Container from "@material-ui/core/Container";
import { formatApiError } from "common/utils/errors";
import { LoadingButton } from "common/components/LoadingButton";
import { Section } from "../../common/Section";
import {
  buildCallbackUrl,
  buildFranceConnectUrl
} from "common/utils/franceConnect";
import { FranceConnectContainer } from "../../common/FranceConnect";
import { useModals } from "common/utils/modals";
import { PasswordField } from "common/components/PasswordField";
import * as Sentry from "@sentry/browser";

const useStyles = makeStyles(theme => ({
  title: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
    textAlign: "center"
  }
}));

export function AccountCreation({ employeeInvite, isAdmin }) {
  const classes = useStyles();

  const api = useApi();
  const history = useHistory();
  const store = useStoreSyncedWithLocalStorage();
  const modals = useModals();

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    if (store.hasAcceptedCgu()) {
      await _createAccount(
        employeeInvite,
        isAdmin,
        email,
        password,
        firstName,
        lastName
      );
    } else {
      modals.open("cgu", {
        handleAccept: async () =>
          await _createAccount(
            employeeInvite,
            isAdmin,
            email,
            password,
            firstName,
            lastName
          ),
        handleReject: () => {}
      });
    }
  };

  const _createAccount = async (
    employeeInvite,
    isAdmin,
    email,
    password,
    firstName,
    lastName
  ) => {
    setLoading(true);
    try {
      const signupPayload = {
        email,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim()
      };
      if (employeeInvite) {
        signupPayload.inviteToken = employeeInvite.inviteToken;
      }
      await api.graphQlMutate(USER_SIGNUP_MUTATION, signupPayload, {
        context: { nonPublicApi: true }
      });
      await store.updateUserIdAndInfo();
      if (isAdmin) history.push("/signup/company?onboarding=true");
      else history.push("/signup/complete");
    } catch (err) {
      Sentry.captureException(err);
      setEmail("");
      setPassword("");
      setError(formatApiError(err));
    }
    setLoading(false);
  };

  return (
    <>
      {isAdmin && (
        <Paper key={0}>
          <SignupStepper activeStep={0} />
        </Paper>
      )}
      <Paper key={1}>
        <Container className="centered" maxWidth="sm">
          <Typography className={classes.title} variant="h3">
            Création de compte
          </Typography>
          {employeeInvite && employeeInvite.company && (
            <Typography align="left">
              Vous avez été invité(e) par{" "}
              <span style={{ fontWeight: "bold" }}>
                {employeeInvite.company.name}
              </span>{" "}
              à créer un compte
            </Typography>
          )}
          <Section title="via FranceConnect">
            <FranceConnectContainer
              onButtonClick={() => {
                const callbackUrl = buildCallbackUrl(
                  employeeInvite,
                  true,
                  isAdmin
                );
                window.location.href = buildFranceConnectUrl(callbackUrl);
              }}
              helperText="FranceConnect est la solution proposée par l’État pour sécuriser
              et simplifier la connexion à vos services en ligne."
            />
          </Section>

          <Section last title="ou via le formulaire d'inscription">
            <form
              className="vertical-form centered"
              noValidate
              autoComplete="off"
              onSubmit={handleSubmit}
            >
              <TextField
                required
                fullWidth
                className="vertical-form-text-input"
                label="Email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={e => {
                  setError("");
                  setEmail(e.target.value.replace(/\s/g, ""));
                }}
              />
              <PasswordField
                required
                fullWidth
                className="vertical-form-text-input"
                label="Choisissez un mot de passe"
                autoComplete="current-password"
                value={password}
                onChange={e => {
                  setError("");
                  setPassword(e.target.value);
                }}
              />
              <TextField
                required
                fullWidth
                className="vertical-form-text-input"
                label="Prénom"
                autoComplete="given-name"
                value={firstName}
                onChange={e => {
                  setError("");
                  setFirstName(e.target.value.trimLeft());
                }}
              />
              <TextField
                required
                fullWidth
                className="vertical-form-text-input"
                label="Nom"
                autoComplete="family-name"
                value={lastName}
                onChange={e => {
                  setError("");
                  setLastName(e.target.value.trimLeft());
                }}
              />
              <Box my={4}>
                <LoadingButton
                  variant="contained"
                  color="primary"
                  type="submit"
                  disabled={
                    !email || !password || !firstName || !lastName || !!error
                  }
                  loading={loading}
                >
                  M'inscrire
                </LoadingButton>
                {error && <Typography color="error">{error}</Typography>}
              </Box>
            </form>
          </Section>
        </Container>
      </Paper>
    </>
  );
}
