import React from "react";
import TextField from "@material-ui/core/TextField";
import Container from "@material-ui/core/Container";
import CircularProgress from "@material-ui/core/CircularProgress";
import Button from "@material-ui/core/Button";
import { useApi, USER_SIGNUP_MUTATION } from "../common/utils/api";
import Typography from "@material-ui/core/Typography";
import { useStoreSyncedWithLocalStorage } from "../common/utils/store";
import Box from "@material-ui/core/Box";
import Divider from "@material-ui/core/Divider";
import IconButton from "@material-ui/core/IconButton";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import { Header } from "../common/components/Header";

export default function Signup({ setSignUpInsteadOfLogging }) {
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const api = useApi();
  const storeSyncedWithLocalStorage = useStoreSyncedWithLocalStorage();

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const signUpResponse = await api.graphQlMutate(USER_SIGNUP_MUTATION, {
        email,
        password,
        firstName,
        lastName,
        companyName
      });
      const { accessToken, refreshToken } = signUpResponse.data.signupUser;
      storeSyncedWithLocalStorage.storeTokens({ accessToken, refreshToken });
      setSignUpInsteadOfLogging(false);
    } catch (err) {
      setEmail("");
      setPassword("");
      setError("Problème imprévu ! Veuillez nous contacter");
    }
    setLoading(false);
  };

  return (
    <Container className="landing-container scrollable" maxWidth={false}>
      <Header my={1} className="flexbox-flex-start">
        <IconButton
          edge="start"
          color="primary"
          onClick={() => setSignUpInsteadOfLogging(false)}
        >
          <ArrowBackIcon />
        </IconButton>
        <Box ml={1}>
          <Typography>J'ai déjà un compte</Typography>
        </Box>
      </Header>
      <form
        className="vertical-form centered-with-margin"
        noValidate
        autoComplete="off"
        onSubmit={handleSubmit}
      >
        <Box my={4}>
          <Typography variant="h6">Création de compte</Typography>
        </Box>
        <TextField
          fullWidth
          className="vertical-form-text-input"
          label="Email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={e => {
            setError("");
            setEmail(e.target.value);
          }}
        />
        <TextField
          fullWidth
          className="vertical-form-text-input"
          label="Mot de passe"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={e => {
            setError("");
            setPassword(e.target.value);
          }}
        />
        <TextField
          fullWidth
          className="vertical-form-text-input"
          label="Prénom"
          autoComplete="given-name"
          value={firstName}
          onChange={e => {
            setError("");
            setFirstName(e.target.value);
          }}
        />
        <TextField
          fullWidth
          className="vertical-form-text-input"
          label="Nom"
          autoComplete="family-name"
          value={lastName}
          onChange={e => {
            setError("");
            setLastName(e.target.value);
          }}
        />
        <TextField
          fullWidth
          className="vertical-form-text-input"
          label="Entreprise"
          autoComplete="organization"
          value={companyName}
          onChange={e => {
            setError("");
            setCompanyName(e.target.value);
          }}
        />
        {error && (
          <Typography align="left" color="error">
            {error}
          </Typography>
        )}
        <Box mt={4} mb={8}>
          <Button
            variant="contained"
            color="primary"
            type="submit"
            disabled={
              !email ||
              !password ||
              !firstName ||
              !lastName ||
              !companyName ||
              loading ||
              !!error
            }
          >
            <span
              style={{ position: "relative", visibility: loading && "hidden" }}
            >
              M'inscrire
            </span>
            {loading && (
              <CircularProgress
                style={{ position: "absolute" }}
                color="inherit"
                size="1rem"
              />
            )}
          </Button>
        </Box>
      </form>
    </Container>
  );
}
