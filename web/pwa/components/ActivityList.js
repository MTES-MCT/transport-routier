import React from "react";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import Avatar from "@material-ui/core/Avatar";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import { ACTIVITIES } from "common/utils/activities";
import { formatLongTimer, formatTimeOfDay } from "common/utils/time";
import { getTime, sortEvents } from "common/utils/events";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import IconButton from "@material-ui/core/IconButton";
import CreateIcon from "@material-ui/icons/Create";
import { useModals } from "common/utils/modals";

export function ActivityList({
  previousMissionEnd,
  missionEnd,
  activities,
  allMissionActivities,
  editActivityEvent,
  teamChanges
}) {
  const modals = useModals();

  // Compute duration and end time for each activity
  const augmentedAndSortedActivities = activities.map((activity, index) => {
    if (index < activities.length - 1) {
      const nextActivity = activities[index + 1];
      return {
        ...activity,
        duration: getTime(nextActivity) - getTime(activity),
        endTime: getTime(nextActivity)
      };
    }
    return activity;
  });

  sortEvents(augmentedAndSortedActivities).reverse();

  return (
    <List dense className="scrollable">
      {augmentedAndSortedActivities
        .filter(a => a.type !== ACTIVITIES.rest.name)
        .map((activity, index) => (
          <ListItem disableGutters key={index}>
            <ListItemAvatar>
              <Avatar>
                {ACTIVITIES[activity.type].renderIcon({ color: "primary" })}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={ACTIVITIES[activity.type].label}
              secondary={`${formatTimeOfDay(getTime(activity))} - ${
                activity.duration
                  ? formatLongTimer(activity.duration)
                  : "En cours"
              }`}
              secondaryTypographyProps={{ color: "primary" }}
            />
            {editActivityEvent && (
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  color="primary"
                  onClick={() =>
                    modals.open("activityRevision", {
                      event: activity,
                      handleRevisionAction: (
                        actionType,
                        newUserStartTime,
                        newUserEndTime,
                        userComment,
                        forAllTeam
                      ) =>
                        editActivityEvent(
                          activity,
                          actionType,
                          allMissionActivities,
                          newUserStartTime,
                          newUserEndTime,
                          userComment,
                          forAllTeam
                        ),
                      minStartTime: previousMissionEnd + 1,
                      maxStartTime: missionEnd || Date.now(),
                      cancellable: true,
                      teamChanges
                    })
                  }
                >
                  <CreateIcon />
                </IconButton>
              </ListItemSecondaryAction>
            )}
          </ListItem>
        ))}
    </List>
  );
}
