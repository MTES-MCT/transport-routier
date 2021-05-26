import React from "react";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import Avatar from "@material-ui/core/Avatar";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import {
  ACTIVITIES,
  filterActivitiesOverlappingPeriod
} from "common/utils/activities";
import {
  formatDateTime,
  formatLongTimer,
  formatTimeOfDay,
  getStartOfDay,
  LONG_BREAK_DURATION,
  now
} from "common/utils/time";
import { getTime, sortEvents } from "common/utils/events";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import IconButton from "@material-ui/core/IconButton";
import CreateIcon from "@material-ui/icons/Create";
import { useModals } from "common/utils/modals";
import Typography from "@material-ui/core/Typography";
import makeStyles from "@material-ui/core/styles/makeStyles";

const useStyles = makeStyles(theme => ({
  infoText: {
    color: theme.palette.grey[500],
    fontStyle: "italic"
  },
  longBreak: {
    color: theme.palette.success.main
  },
  avatar: props => ({
    backgroundColor: props.color,
    color: theme.palette.primary.contrastText
  })
}));

function ActivityItem({
  activity,
  editActivityEvent,
  createActivity,
  allMissionActivities,
  previousMissionEnd,
  nextMissionStart,
  teamChanges,
  nullableEndTimeInEditActivity,
  allowTeamMode,
  showDates = false
}) {
  const modals = useModals();
  const classes = useStyles({ color: ACTIVITIES[activity.type].color });

  const datetimeFormatter = showDates ? formatDateTime : formatTimeOfDay;
  const isBreak = activity.type === ACTIVITIES.break.name;
  const isLongBreak =
    isBreak && activity.duration && activity.duration >= LONG_BREAK_DURATION;

  return (
    <ListItem disableGutters>
      <ListItemAvatar>
        <Avatar className={classes.avatar}>
          {ACTIVITIES[activity.type].renderIcon()}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          isLongBreak ? "Repos journalier" : ACTIVITIES[activity.type].label
        }
        primaryTypographyProps={
          isLongBreak ? { className: classes.longBreak } : {}
        }
        secondary={`${datetimeFormatter(activity.displayedStartTime)} - ${
          activity.displayedEndTime
            ? `${datetimeFormatter(
                activity.displayedEndTime
              )} - ${formatLongTimer(activity.duration)}`
            : "En cours"
        }`}
        secondaryTypographyProps={
          isLongBreak
            ? { className: classes.longBreak }
            : isBreak
            ? {}
            : { color: "primary" }
        }
      />
      {editActivityEvent && (
        <ListItemSecondaryAction>
          <IconButton
            edge="end"
            color="primary"
            onClick={() =>
              modals.open("activityRevision", {
                event: activity,
                otherActivities: isBreak
                  ? allMissionActivities
                  : allMissionActivities.filter(
                      a => getTime(a) !== getTime(activity)
                    ),
                handleRevisionAction: (
                  activity,
                  actionType,
                  newUserStartTime,
                  newUserEndTime,
                  userComment,
                  forAllTeam
                ) =>
                  editActivityEvent(
                    activity,
                    actionType,
                    newUserStartTime,
                    newUserEndTime,
                    userComment,
                    forAllTeam
                  ),
                createActivity,
                previousMissionEnd,
                nextMissionStart,
                cancellable: true,
                teamChanges,
                allowTeamMode,
                nullableEndTime: nullableEndTimeInEditActivity
              })
            }
          >
            <CreateIcon />
          </IconButton>
        </ListItemSecondaryAction>
      )}
    </ListItem>
  );
}

export function ActivityList({
  previousMissionEnd,
  nextMissionStart,
  activities,
  allMissionActivities,
  editActivityEvent,
  createActivity,
  teamChanges,
  allowTeamMode = false,
  nullableEndTimeInEditActivity,
  isMissionEnded,
  fromTime = null,
  untilTime = null
}) {
  const filteredActivities = filterActivitiesOverlappingPeriod(
    activities,
    fromTime,
    untilTime
  );

  const hasActivitiesBeforeMinTime =
    fromTime && filteredActivities.some(a => a.startTime < fromTime);
  const hasActivitiesAfterMaxTime =
    untilTime &&
    filteredActivities.some(a => !a.endTime || a.endTime > untilTime);

  // Add breaks
  const activitiesWithBreaks = [];
  sortEvents(filteredActivities);
  filteredActivities.forEach((a, index) => {
    activitiesWithBreaks.push(a);
    if (index < filteredActivities.length - 1) {
      const nextA = filteredActivities[index + 1];
      if (a.endTime < nextA.startTime)
        activitiesWithBreaks.push({
          type: ACTIVITIES.break.name,
          startTime: a.endTime,
          endTime: nextA.startTime
        });
    }
  });

  // Compute duration and end time for each activity
  const augmentedAndSortedActivities = activitiesWithBreaks.map(activity => {
    const startTime = Math.max(activity.startTime, fromTime);
    const endTime = untilTime
      ? Math.min(activity.endTime || now(), untilTime)
      : activity.endTime;
    const endTimeOrNow = endTime || now();
    return {
      ...activity,
      displayedStartTime: startTime,
      displayedEndTime: endTime,
      endTimeOrNow,
      duration: endTimeOrNow - startTime
    };
  });

  const showDates =
    augmentedAndSortedActivities.length > 0
      ? !isMissionEnded
        ? getStartOfDay(augmentedAndSortedActivities[0].displayedStartTime) !==
          getStartOfDay(now())
        : getStartOfDay(augmentedAndSortedActivities[0].displayedStartTime) !==
          getStartOfDay(
            augmentedAndSortedActivities[
              augmentedAndSortedActivities.length - 1
            ].displayedEndTime - 1
          )
      : false;

  augmentedAndSortedActivities.reverse();
  const latestActivity = augmentedAndSortedActivities[0];

  const classes = useStyles();

  return (
    <List dense>
      {hasActivitiesAfterMaxTime && (
        <Typography variant="body2" className={classes.infoText}>
          Les activités après minuit le jour suivant ne sont pas affichées
        </Typography>
      )}
      {!isMissionEnded && latestActivity && latestActivity.endTime && (
        <ListItem disableGutters key={"trailingBreak"}>
          <ListItemAvatar>
            <Avatar>{ACTIVITIES.break.renderIcon()}</Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={ACTIVITIES.break.label}
            secondary={`${(showDates ? formatDateTime : formatTimeOfDay)(
              latestActivity.endTime
            )} - En cours`}
          />
        </ListItem>
      )}
      {augmentedAndSortedActivities.length === 0 && (
        <Typography variant="body2" className={classes.infoText}>
          Pas d'activités sur cette journée
        </Typography>
      )}
      {augmentedAndSortedActivities.map((activity, index) => (
        <ActivityItem
          activity={activity}
          editActivityEvent={editActivityEvent}
          createActivity={createActivity}
          allMissionActivities={allMissionActivities}
          previousMissionEnd={previousMissionEnd}
          nextMissionStart={nextMissionStart}
          teamChanges={teamChanges}
          allowTeamMode={allowTeamMode}
          nullableEndTimeInEditActivity={nullableEndTimeInEditActivity}
          key={activity.id ? "a" + activity.id : index}
          showDates={showDates}
        />
      ))}
      {hasActivitiesBeforeMinTime && (
        <Typography variant="body2" className={classes.infoText}>
          Les activités avant minuit le jour précédent ne sont pas affichées
        </Typography>
      )}
    </List>
  );
}
