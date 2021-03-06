import React from "react";
import { useDropzone } from "react-dropzone";
import { Header } from "../common/Header";
import Container from "@material-ui/core/Container";
import Typography from "@material-ui/core/Typography";
import { PaperContainer, PaperContainerTitle } from "../common/PaperContainer";
import makeStyles from "@material-ui/core/styles/makeStyles";
import Box from "@material-ui/core/Box";
import DescriptionIcon from "@material-ui/icons/Description";
import CircularProgress from "@material-ui/core/CircularProgress/CircularProgress";
import { useApi } from "common/utils/api";
import * as Sentry from "@sentry/browser";
import Alert from "@material-ui/lab/Alert";
import AlertTitle from "@material-ui/lab/AlertTitle";
import { useSnackbarAlerts } from "../common/Snackbar";

const STATUS_MAP = {
  SUCCESS: {
    title: "FICHIER INTÈGRE",
    desc: "Le fichier n'a pas été modifié après sa génération par Mobilic"
  },
  INTERNAL_ERROR: {
    title: "ERREUR INTERNE",
    desc:
      "La vérification d'intégrité n'a pas pu être effectuée à cause d'une erreur interne. Veuillez réessayer ultérieurement."
  },
  NETWORK_ERROR: {
    title: "ERREUR DE CONNEXION",
    desc:
      "Le serveur Mobilic semble injoignable. Veuillez réessayer ultérieurement."
  },
  MISSING_FILE: {
    title: "PAS DE FICHIER",
    desc: "Aucun fichier n'a été détecté"
  },
  MISSING_SIGNATURE: {
    title: "VÉRIFICATION IMPOSSIBLE",
    desc:
      "Le fichier ne comporte pas d'informations d'intégrité, il est impossible d'effectuer la vérification. Êtes-vous sûrs qu'il a bien été généré par Mobilic ?"
  },
  INVALID_FORMAT: {
    title: "MAUVAIS FORMAT",
    desc: "Le fichier n'est pas dans un format .xlsx valide"
  },
  SIGNATURE_DOES_NOT_MATCH: {
    title: "FICHIER NON INTÈGRE",
    desc: "Le fichier a été modifié après sa génération par Mobilic."
  },
  UNAVAILABLE: {
    title: "SERVICE NON DISPONIBLE",
    desc:
      "Impossible d'effectuer la vérification d'intégrité, veuillez réessayer ultérieurement."
  }
};

const useStyles = makeStyles(theme => ({
  root: {
    paddingBottom: theme.spacing(2)
  },
  text: {
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2)
  },
  outer: {
    height: 150,
    width: "100%",
    margin: "auto",
    position: "relative"
  },
  container: {
    width: "100%",
    height: "100%",
    cursor: "pointer",
    flex: 1,
    display: "flex",
    flexDirection: "row",
    flewWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderRadius: 10,
    borderColor: ({ isDragActive, fileName, verifyResponse }) =>
      verifyResponse
        ? verifyResponse.success
          ? theme.palette.success.main
          : theme.palette.error.main
        : isDragActive || fileName
        ? theme.palette.primary.main
        : theme.palette.grey[500],
    borderStyle: "dashed",
    backgroundColor: ({ verifyResponse }) =>
      verifyResponse
        ? verifyResponse.success
          ? theme.palette.success.light
          : theme.palette.error.light
        : theme.palette.grey[100],
    color: ({ verifyResponse }) =>
      verifyResponse
        ? verifyResponse.success
          ? theme.palette.success.main
          : theme.palette.error.main
        : theme.palette.grey[700],
    outline: "none",
    transition: "backgroundColor .24s ease-in-out",
    filter: ({ loading }) => (loading ? "blur(1px)" : "none")
  },
  inner: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  newFileButton: {
    margin: theme.spacing(2)
  },
  response: {
    textAlign: "justify",
    marginTop: theme.spacing(2)
  },
  placeholder: {
    padding: theme.spacing(2)
  }
}));

export function XlsxVerifier() {
  const api = useApi();
  const alerts = useSnackbarAlerts();

  const [loading, setLoading] = React.useState(false);
  const [fileName, setFileName] = React.useState(null);
  const [verifyResponse, setVerifyResponse] = React.useState(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    validator: file => {
      if (!file.name.endsWith(".xlsx"))
        return {
          code: "bad-extension",
          message: "Le fichier n'est pas un .xlsx"
        };
    },
    accept: ".xlsx",
    onDropAccepted: async files => {
      const file = files[0];
      setFileName(file.name);
      setLoading(true);
      const fd = new FormData();
      fd.append("xlsx-to-check", file);
      try {
        const apiResponse = await api.httpQuery(
          "POST",
          "/control/verify-xlsx-signature",
          {
            body: fd,
            timeout: 15000
          }
        );
        const json = await apiResponse.json();
        setVerifyResponse(json);
      } catch (err) {
        Sentry.captureException(err);
        if (err.name === "NetworkError" || err.name === "AbortError") {
          setVerifyResponse({ error: "NETWORK_ERROR" });
        } else setVerifyResponse({ error: "INTERNAL_ERROR" });
      }
      setLoading(false);
    },
    onDropRejected: fileRejections => {
      alerts.error(
        "Fichier invalide. Seuls les fichiers avec extension .xlsx sont acceptés",
        "rejection",
        6000
      );
    }
  });

  const classes = useStyles({
    isDragActive,
    fileName,
    loading,
    verifyResponse
  });

  const verifyResponseStatus = verifyResponse
    ? verifyResponse.success
      ? "SUCCESS"
      : verifyResponse.error
    : null;

  return [
    <Header key={1} disableMenu />,
    <PaperContainer key={2}>
      <Container className={`centered ${classes.root}`} maxWidth="sm">
        <PaperContainerTitle>
          Vérification de l'intégrité d'un fichier
        </PaperContainerTitle>
        <Typography align="justify" className={classes.text}>
          Vous pouvez vérifier ici l'intégrité des rapports d'activité générés
          par Mobilic au format Excel (.xlsx). Un fichier est considéré comme
          intègre si le fichier n'a subi aucune modification après sa
          génération. Cela permet de sécuriser que les données du rapport
          d'activité n'ont pas été modifiées avant de vous le transmettre.
        </Typography>
        <Box className={classes.outer}>
          <Box
            {...getRootProps({ className: classes.container })}
            style={{ filter: loading ? "blur" : "abc" }}
          >
            <input {...getInputProps()} />
            {fileName && <DescriptionIcon color="inherit" />}
            <Typography className={classes.placeholder} color="inherit">
              {fileName
                ? fileName
                : "Déposez votre fichier ici ou cliquez pour choisir un fichier. Seuls les .xlsx sont acceptés."}
            </Typography>
          </Box>
          {loading && (
            <Box className={classes.inner}>
              <CircularProgress
                style={{ position: "absolute" }}
                color="primary"
              />
            </Box>
          )}
        </Box>
        {verifyResponse && (
          <Alert
            variant="filled"
            className={classes.response}
            severity={verifyResponse.success ? "success" : "error"}
          >
            <AlertTitle className="bold">
              {
                (STATUS_MAP[verifyResponseStatus] || STATUS_MAP.INTERNAL_ERROR)
                  .title
              }
            </AlertTitle>
            {
              (STATUS_MAP[verifyResponseStatus] || STATUS_MAP.INTERNAL_ERROR)
                .desc
            }
          </Alert>
        )}
      </Container>
    </PaperContainer>
  ];
}
