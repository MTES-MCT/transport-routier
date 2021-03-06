import React from "react";
import Typography from "@material-ui/core/Typography";
import DialogContent from "@material-ui/core/DialogContent";
import { DatePicker } from "@material-ui/pickers";
import Dialog from "@material-ui/core/Dialog";
import { useApi } from "common/utils/api";
import makeStyles from "@material-ui/core/styles/makeStyles";
import { LoadingButton } from "common/components/LoadingButton";
import { CompanyFilter } from "./CompanyFilter";
import { useSnackbarAlerts } from "../../common/Snackbar";
import { formatApiError } from "common/utils/errors";
import {
  CustomDialogActions,
  CustomDialogTitle
} from "../../common/CustomDialogTitle";
import { EmployeeFilter } from "./EmployeeFilter";
import { useMatomo } from "@datapunt/matomo-tracker-react";
import Grid from "@material-ui/core/Grid";
import Box from "@material-ui/core/Box";
import Switch from "@material-ui/core/Switch/Switch";
import { DAY, isoFormatLocalDate, startOfDayAsDate } from "common/utils/time";
import Alert from "@material-ui/lab/Alert";

const useStyles = makeStyles(theme => ({
  start: {
    marginRight: theme.spacing(4)
  },
  end: {
    marginLeft: theme.spacing(4)
  },
  flexGrow: {
    flexGrow: 1
  },
  grid: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2)
  },
  switchContainer: {
    display: "flex",
    alignItems: "center"
  },
  subTitle: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2)
  }
}));

export default function C1BExport({
  open,
  handleClose,
  companies = [],
  users = []
}) {
  const api = useApi();
  const alerts = useSnackbarAlerts();
  const { trackLink } = useMatomo();
  const [minDate, setMinDate] = React.useState(null);
  const [maxDate, setMaxDate] = React.useState(startOfDayAsDate(new Date()));
  const [sign, setSign] = React.useState(true);
  const [dateRangeError, setDateRangeError] = React.useState(null);

  React.useEffect(() => {
    if (
      maxDate &&
      minDate &&
      maxDate.getTime() - minDate.getTime() > 60 * DAY * 1000
    ) {
      setDateRangeError(
        "La période sélectionnée doit être inférieure à 60 jours !"
      );
    } else setDateRangeError(null);
  }, [minDate, maxDate]);

  const [_companies, setCompanies] = React.useState([]);
  const [_users, setUsers] = React.useState([]);

  React.useEffect(() => {
    setCompanies(companies);
    setUsers(users);
  }, [open]);

  const classes = useStyles();

  return (
    <Dialog onClose={handleClose} open={open} maxWidth="md">
      <CustomDialogTitle
        title="Générer des fichiers C1B"
        handleClose={handleClose}
      />
      <DialogContent>
        <Typography gutterBottom>
          Mobilic permet d'exporter les données d'activité au format C1B, qui
          est le format utilisé pour les données des{" "}
          <strong>cartes conducteur</strong> de{" "}
          <strong>chronotachygraphe</strong>.
        </Typography>
        <Typography gutterBottom>
          Si vous êtes équipés d'un logiciel d'analyse des données tachyraphe
          vous pouvez donc l'utiliser pour traiter les données Mobilic, une fois
          exportées dans ce format.
        </Typography>
        <Typography variant="h5" className={classes.subTitle}>
          Conditions d'export
        </Typography>
        <Typography gutterBottom>
          Le téléchargement produit un dossier zippé (.zip) qui contient{" "}
          <strong>un fichier C1B pour chaque travailleur</strong> dans le
          périmètre choisi (précisé par les options ci-dessous). Si un
          travailleur n'a pas d'activités dans la période demandée aucun fichier
          C1B ne sera généré pour lui, même si ce travailleur est dans la liste.
        </Typography>
        <Typography variant="h5" className={classes.subTitle}>
          Avertissement
        </Typography>
        <Alert severity="warning">
          <Typography gutterBottom>
            Les fichiers générés par Mobilic respectent la norme C1B, mais ne
            sont pour autant pas tout à fait identiques aux fichiers des cartes
            conducteur (ex. : certaines parties sont laissées vides faute de
            données, les signatures numériques sont différentes, ...).
          </Typography>
          <Typography>
            Si jamais vous ne parvenez à lire les fichiers Mobilic depuis votre
            logiciel d'analyse n'hésitez pas à nous contacter à l'adresse mail{" "}
            <a href="mailto:mobilic@beta.gouv.fr">mobilic@beta.gouv.fr</a>.
          </Typography>
        </Alert>
        <Typography variant="h5" className={classes.subTitle}>
          Paramètres
        </Typography>
        <Typography>
          Les données d'activité sont limitées à une{" "}
          <strong>période qui ne peut pas dépasser 60 jours</strong>. Par défaut
          les fichiers générés contiendront les données d'activité sur la
          période considérée de <strong>tous</strong> les travailleurs de{" "}
          <strong>toutes</strong> vos entreprises. Vous pouvez limiter la liste
          à certaines entreprises et/ou à certains salariés.
        </Typography>
        <Grid spacing={4} container className={classes.grid}>
          {_companies.length > 1 && (
            <Grid item sm={6} className={classes.flexGrow}>
              <CompanyFilter
                companies={_companies}
                setCompanies={setCompanies}
              />
            </Grid>
          )}
          <Grid
            item
            className={classes.flexGrow}
            sm={_companies.length > 1 ? 6 : 12}
          >
            <EmployeeFilter users={_users} setUsers={setUsers} />
          </Grid>
          <Grid item sm={6}>
            <DatePicker
              required
              label="Date de début"
              value={minDate}
              format="d MMMM yyyy"
              maxDate={maxDate || undefined}
              onChange={setMinDate}
              clearable
              cancelLabel={null}
              clearLabel="Annuler"
              autoOk
              disableFuture
              inputVariant="outlined"
              animateYearScrolling
              error={!!dateRangeError}
              helperText={dateRangeError}
            />
          </Grid>
          <Grid item sm={6}>
            <DatePicker
              required
              label="Date de fin"
              value={maxDate}
              format="d MMMM yyyy"
              minDate={minDate || undefined}
              onChange={setMaxDate}
              clearable
              cancelLabel={null}
              clearLabel="Annuler"
              autoOk
              disableFuture
              inputVariant="outlined"
              animateYearScrolling
              error={!!dateRangeError}
              helperText={dateRangeError}
            />
          </Grid>
          <Grid item xs={12}>
            <Box className={classes.switchContainer}>
              <Switch
                checked={sign}
                onChange={e => setSign(e.target.checked)}
              />
              <Typography style={sign ? {} : { opacity: 0.3 }}>
                Ajouter des signatures numériques aux fichiers pour prouver leur
                intégrité
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <CustomDialogActions>
        <LoadingButton
          color="primary"
          variant="contained"
          disabled={!minDate || !maxDate || dateRangeError}
          onClick={async e => {
            let selectedCompanies = _companies.filter(c => c.selected);
            if (selectedCompanies.length === 0) selectedCompanies = _companies;
            let selectedUsers = _users.filter(u => u.selected);
            const options = {
              company_ids: selectedCompanies.map(c => c.id)
            };
            if (selectedUsers.length > 0)
              options["user_ids"] = selectedUsers.map(u => u.id);
            if (minDate) options["min_date"] = isoFormatLocalDate(minDate);
            if (maxDate) options["max_date"] = isoFormatLocalDate(maxDate);
            options["with_digital_signatures"] = sign;
            e.preventDefault();
            trackLink({
              href: `/generate_tachograph_files`,
              linkType: "download"
            });
            try {
              await api.downloadFileHttpQuery(
                "POST",
                `/companies/generate_tachograph_files`,
                { json: options }
              );
            } catch (err) {
              alerts.error(
                formatApiError(err),
                "generate_tachograph_files",
                6000
              );
            }
          }}
        >
          Générer
        </LoadingButton>
      </CustomDialogActions>
    </Dialog>
  );
}
