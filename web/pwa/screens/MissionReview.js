import React from "react";
import { getTime } from "common/utils/events";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import makeStyles from "@material-ui/core/styles/makeStyles";
import Container from "@material-ui/core/Container";
import {
  computeTimesAndDurationsFromActivities,
  renderMissionKpis,
  WorkTimeSummaryKpiGrid
} from "../components/WorkTimeSummary";
import { AccountButton } from "../components/AccountButton";
import { prettyFormatDay } from "common/utils/time";
import { MissionDetails } from "../components/MissionDetails";

const useStyles = makeStyles(theme => ({
  overviewTimersContainer: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText
  },
  overviewTimersTitle: {
    paddingBottom: theme.spacing(2)
  },
  backgroundPaper: {
    backgroundColor: theme.palette.background.paper
  }
}));

export function MissionReview({
  currentMission,
  pushNewTeamActivityEvent,
  editActivityEvent,
  validateMission,
  editExpendituresForTeam,
  previousMissionEnd,
  logComment,
  cancelComment,
  registerKilometerReading
}) {
  const classes = useStyles();
  return (
    <Container style={{ flexGrow: 1 }} className="flex-column" disableGutters>
      <Box p={2} pt={2} pb={4} className={classes.overviewTimersContainer}>
        <AccountButton pb={4} darkBackground />
        <Typography
          className={classes.overviewTimersTitle}
          align="left"
          variant="h5"
        >
          Récapitulatif de la mission
          {` ${
            currentMission.name ? currentMission.name : ""
          } du ${prettyFormatDay(getTime(currentMission))}`}
        </Typography>
        <WorkTimeSummaryKpiGrid
          metrics={renderMissionKpis(
            computeTimesAndDurationsFromActivities(currentMission.activities)
          )}
        />
      </Box>
      <MissionDetails
        mission={currentMission}
        editActivityEvent={editActivityEvent}
        editExpenditures={editExpendituresForTeam}
        previousMissionEnd={previousMissionEnd}
        createActivity={args =>
          pushNewTeamActivityEvent({ ...args, switchMode: false })
        }
        validateMission={validateMission}
        logComment={logComment}
        cancelComment={cancelComment}
        editKilometerReading={registerKilometerReading}
      />
    </Container>
  );
}
