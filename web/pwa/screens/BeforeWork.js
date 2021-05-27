import React from "react";
import Container from "@material-ui/core/Container";
import { PlaceHolder } from "../../common/PlaceHolder";
import Typography from "@material-ui/core/Typography";
import { useModals } from "common/utils/modals";
import Box from "@material-ui/core/Box";
import { AccountButton } from "../components/AccountButton";
import { MainCtaButton } from "../components/MainCtaButton";
import makeStyles from "@material-ui/core/styles/makeStyles";
import { useStoreSyncedWithLocalStorage } from "common/utils/store";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import Avatar from "@material-ui/core/Avatar";
import ListItemText from "@material-ui/core/ListItemText";
import {
  DAY,
  formatDayOfWeek,
  formatTimeOfDay,
  shortPrettyFormatDay,
  startOfDay
} from "common/utils/time";
import ListSubheader from "@material-ui/core/ListSubheader";
import orderBy from "lodash/orderBy";
import { LoadingButton } from "common/components/LoadingButton";
import { useLoadingScreen } from "common/utils/loading";
import BackgroundImage from "common/assets/images/landing-hero-vertical-without-text-logo.svg";

const MAX_NON_VALIDATED_MISSIONS_TO_DISPLAY = 5;

const useStyles = makeStyles(theme => ({
  outer: {
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    background: `url(${BackgroundImage})`,
    backgroundSize: "cover"
  },
  container: {
    position: "relative",
    justifyContent: "flex-start",
    flexGrow: 1,
    flexShrink: 0,
    overflowY: "hidden"
  },
  heroImage: {
    width: "100%",
    height: "auto",
    color: theme.palette.background.default
  },
  accountButton: {
    alignSelf: "flex-end",
    position: "absolute",
    top: "0",
    right: "0"
  },
  welcomeText: {
    marginBottom: theme.spacing(2)
  },
  missionsToValidateList: {
    backgroundColor: theme.palette.background.paper,
    textAlign: "justify",
    marginTop: theme.spacing(2),
    borderRadius: "24px 24px 0 0"
  },
  listHeader: {
    fontWeight: "bold",
    fontSize: "1.125rem"
  },
  listSubheader: {
    fontSize: "1rem",
    fontWeight: 500,
    display: "block",
    lineHeight: "1.25rem",
    color: theme.palette.grey[600]
  },
  missionDay: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-evenly",
    alignItems: "center",
    height: 50,
    width: 65,
    color: theme.palette.text.primary,
    marginRight: theme.spacing(2),
    backgroundColor: theme.palette.grey[200]
  },
  missionName: {
    color: theme.palette.primary.main,
    fontWeight: "bold"
  },
  ellipsis: {
    color: theme.palette.grey[600]
  },
  ctaButton: {
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.primary.main,
    "&:hover": {
      backgroundColor: theme.palette.background.default
    }
  },
  subButton: {
    color: theme.palette.background.paper
  }
}));

export function BeforeWork({ beginNewMission, openHistory, missions }) {
  const modals = useModals();
  const store = useStoreSyncedWithLocalStorage();
  const withLoadingScreen = useLoadingScreen();

  const companies = store.companies();
  const userId = store.userId();

  function handleFirstActivitySelection(teamMates, missionInfos) {
    const team = teamMates ? [userId, ...teamMates.map(cw => cw.id)] : [userId];
    modals.open("firstActivity", {
      team,
      handleActivitySelection: async (
        activityType,
        driverId,
        vehicle,
        kilometerReading
      ) => {
        await withLoadingScreen(
          async () => {
            await beginNewMission({
              firstActivityType: activityType,
              driverId,
              companyId: missionInfos.company.id,
              name: missionInfos.mission,
              vehicle: vehicle || missionInfos.vehicle || null,
              startLocation: missionInfos.address,
              kilometerReading:
                kilometerReading || missionInfos.kilometerReading,
              team
            });
            await modals.closeAll();
          },
          null,
          true
        );
      },
      requireVehicle: !missionInfos.vehicle,
      company: missionInfos.company
    });
  }

  const onEnterNewMissionFunnel = () => {
    modals.open("newMission", {
      companies,
      companyAddresses: store.getEntity("knownAddresses"),
      handleContinue: missionInfos => {
        const company = companies.find(c => c.id === missionInfos.company.id);
        if (company.allowTeamMode) {
          modals.open("teamOrSoloChoice", {
            handleContinue: isTeamMode => {
              if (isTeamMode) {
                modals.open("teamSelection", {
                  mission: null,
                  companyId: missionInfos.company.id,
                  handleContinue: teamMates =>
                    handleFirstActivitySelection(teamMates, missionInfos)
                });
              } else handleFirstActivitySelection(null, missionInfos);
            }
          });
        } else handleFirstActivitySelection(null, missionInfos);
      }
    });
  };

  const classes = useStyles();

  const currentTime = startOfDay(new Date(Date.now()));

  const missionsInHistory = missions.filter(m => m.isComplete && m.ended);
  const nonValidatedMissions = orderBy(
    missionsInHistory.filter(
      m =>
        !m.validation &&
        !m.adminValidation &&
        m.startTime >= currentTime - DAY * 31
    ),
    ["startTime"],
    ["desc"]
  );

  return (
    <Container maxWidth={false} className={classes.outer} disableGutters>
      <AccountButton p={2} className={classes.accountButton} darkBackground />
      <PlaceHolder>
        <Typography variant="h3">👋</Typography>
        <Typography variant="h3" className={classes.welcomeText}>
          Bienvenue sur Mobilic !
        </Typography>
      </PlaceHolder>
      <Box key={2} mt={2} className="cta-container" mb={2}>
        <MainCtaButton
          className={classes.ctaButton}
          onClick={onEnterNewMissionFunnel}
        >
          Commencer une mission
        </MainCtaButton>
        <LoadingButton
          style={{ marginTop: 8 }}
          className={classes.subButton}
          onClick={() => {
            openHistory();
          }}
        >
          Voir mon historique
        </LoadingButton>
      </Box>
      {nonValidatedMissions.length > 0 && (
        <Box key={3} className={classes.missionsToValidateList}>
          <List
            subheader={
              <ListSubheader
                component="div"
                color="inherit"
                className={classes.listHeader}
              >
                Missions à valider
                <span className={classes.listSubheader}>
                  Vérifiez les informations saisies par vous-même ou par vos
                  coéquipiers
                </span>
              </ListSubheader>
            }
          >
            {nonValidatedMissions
              .slice(0, MAX_NON_VALIDATED_MISSIONS_TO_DISPLAY)
              .map(m => (
                <MissionItem key={m.id} mission={m} openHistory={openHistory} />
              ))}
            {nonValidatedMissions.length >
              MAX_NON_VALIDATED_MISSIONS_TO_DISPLAY && (
              <ListItem className={classes.ellipsis}>
                <Typography>
                  +{" "}
                  {nonValidatedMissions.length -
                    MAX_NON_VALIDATED_MISSIONS_TO_DISPLAY}{" "}
                  autre
                  {nonValidatedMissions.length -
                    MAX_NON_VALIDATED_MISSIONS_TO_DISPLAY >
                  1
                    ? "s"
                    : ""}{" "}
                  mission
                  {nonValidatedMissions.length -
                    MAX_NON_VALIDATED_MISSIONS_TO_DISPLAY >
                  1
                    ? "s"
                    : ""}{" "}
                  non validée
                  {nonValidatedMissions.length -
                    MAX_NON_VALIDATED_MISSIONS_TO_DISPLAY >
                  1
                    ? "s"
                    : ""}
                </Typography>
              </ListItem>
            )}
          </List>
        </Box>
      )}
    </Container>
  );
}

function MissionItem({ mission, openHistory }) {
  const classes = useStyles();

  return (
    <ListItem
      button
      onClick={() => openHistory(mission.id, { previousPagePath: "/app" })}
    >
      <ListItemAvatar>
        <Avatar variant="rounded" className={classes.missionDay}>
          <Typography style={{ textTransform: "uppercase" }}>
            {formatDayOfWeek(mission.startTime)}
          </Typography>
          <Typography className="bold">
            {shortPrettyFormatDay(mission.startTime)}
          </Typography>
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={`Mission ${mission.name || "sans nom"}`}
        primaryTypographyProps={{ className: classes.missionName }}
        secondary={`${formatTimeOfDay(mission.startTime)} - ${formatTimeOfDay(
          mission.endTime
        )}`}
      />
    </ListItem>
  );
}
