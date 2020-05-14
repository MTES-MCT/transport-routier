import { MissionReviewSection } from "./MissionReviewSection";
import { ActivityList } from "./ActivityList";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import PersonIcon from "@material-ui/core/SvgIcon/SvgIcon";
import Typography from "@material-ui/core/Typography";
import { formatLatestEnrollmentInfo } from "common/utils/coworkers";
import Box from "@material-ui/core/Box";
import Chip from "@material-ui/core/Chip";
import { EXPENDITURES } from "common/utils/expenditures";
import React from "react";
import makeStyles from "@material-ui/core/styles/makeStyles";
import { ACTIVITIES } from "common/utils/activities";
import { useModals } from "common/utils/modals";
import { getTime } from "common/utils/events";

const useStyles = makeStyles(theme => ({
  backgroundPaper: {
    backgroundColor: theme.palette.background.paper
  },
  expenditures: {
    flexWrap: "wrap",
    textAlign: "left",
    textTransform: "capitalize",
    "& > *": {
      margin: theme.spacing(0.5)
    }
  }
}));

export function MissionDetails({
  mission,
  missionActivities,
  team,
  editActivityEvent,
  editExpenditures,
  previousMissionEnd,
  hideExpenditures,
  createActivity
}) {
  const classes = useStyles();
  const modals = useModals();

  const lastMissionActivity = missionActivities[missionActivities.length - 1];
  const isMissionComplete = lastMissionActivity.type === ACTIVITIES.rest.name;

  return [
    <MissionReviewSection
      key={0}
      title="Activités"
      className="unshrinkable"
      editButtonLabel="Ajouter"
      onEdit={
        createActivity
          ? () =>
              modals.open("activityRevision", {
                createActivity: args =>
                  createActivity({ ...args, missionId: mission.id }),
                minStartTime: previousMissionEnd + 1,
                maxStartTime: isMissionComplete
                  ? getTime(lastMissionActivity) - 1
                  : Date.now()
              })
          : null
      }
    >
      <ActivityList
        activities={missionActivities}
        editActivityEvent={editActivityEvent}
        previousMissionEnd={0}
      />
    </MissionReviewSection>,
    <MissionReviewSection
      key={1}
      title={team.length > 0 ? "En équipe" : "En solo"}
      className={`${classes.backgroundPaper} unshrinkable`}
      mb={hideExpenditures && 4}
    >
      {team.length > 0 && (
        <List dense>
          {team.map((tm, index) => (
            <ListItem disableGutters key={index}>
              <PersonIcon />
              <Typography>{`${tm.firstName} (${formatLatestEnrollmentInfo(
                tm
              )})`}</Typography>
            </ListItem>
          ))}
        </List>
      )}
    </MissionReviewSection>,
    !hideExpenditures && (
      <MissionReviewSection
        key={2}
        title="Frais"
        className="unshrinkable"
        mb={2}
        onEdit={
          editExpenditures
            ? () =>
                modals.open("expenditures", {
                  handleSubmit: expenditures =>
                    editExpenditures(mission, expenditures),
                  currentExpenditures: mission.expenditures
                })
            : null
        }
      >
        <Box className={`flex-row ${classes.expenditures}`}>
          {mission.expenditures &&
            Object.keys(mission.expenditures)
              .filter(exp => mission.expenditures[exp] > 0)
              .map(exp => <Chip key={exp} label={EXPENDITURES[exp].label} />)}
        </Box>
      </MissionReviewSection>
    )
  ];
}
