import React from "react";
import Card from "@material-ui/core/Card";
import Typography from "@material-ui/core/Typography";
import Grid from "@material-ui/core/Grid";
import { ACTIVITIES, SWITCH_ACTIVITIES } from "common/utils/activities";
import { useModals } from "common/utils/modals";
import { getTime } from "common/utils/events";
import { useStoreSyncedWithLocalStorage } from "common/utils/store";
import makeStyles from "@material-ui/core/styles/makeStyles";
import Box from "@material-ui/core/Box";
import { MainCtaButton } from "./MainCtaButton";
import fromPairs from "lodash/fromPairs";
import uniq from "lodash/uniq";
import { now } from "common/utils/time";
import ArrowDropUpIcon from "@material-ui/icons/ArrowDropUp";

const useStyles = makeStyles(theme => ({
  container: {
    backgroundColor: theme.palette.background.paper,
    borderRadius: "24px",
    marginTop: theme.spacing(-3),
    marginBottom: theme.spacing(-3),
    zIndex: 1000,
    flexShrink: 0
  },
  gridItem: {
    maxWidth: 120
  },
  card: props => ({
    backgroundColor: props.disabled
      ? theme.palette.background.paper
      : props.color,
    color: props.disabled
      ? theme.palette.grey[500]
      : theme.palette.primary.contrastText,
    cursor: props.disabled ? "inherit" : "pointer"
  }),
  cardContent: {
    height: "100%",
    width: "100%",
    maxWidth: 90,
    minHeight: 70,
    maxHeight: 90,
    margin: "auto",
    padding: theme.spacing(0.5)
  },
  cardIcon: {
    margin: theme.spacing(1),
    flexGrow: 1,
    flexShrink: "unset",
    width: "auto",
    height: "auto"
  },
  cardText: props => ({
    width: "100%",
    flexShrink: 0,
    fontWeight: props.current ? "bold" : "normal"
  })
}));

export function ActivitySwitchCard({
  label,
  renderIcon,
  current,
  disabled,
  onClick,
  color
}) {
  const classes = useStyles({ current, disabled, color });
  return (
    <Card className={classes.card} onClick={!disabled ? onClick : null} raised>
      <Box className={`${classes.cardContent} flex-column-space-between`}>
        {renderIcon({
          className: classes.cardIcon
        })}
        <Typography
          align="center"
          variant="body2"
          className={classes.cardText}
          noWrap
          gutterBottom
        >
          {label}
        </Typography>
      </Box>
    </Card>
  );
}

export function ActivitySwitch({
  team,
  latestActivity,
  disableBreak,
  endMission,
  currentMission,
  company,
  requireVehicle = false,
  pushActivitySwitchEvent,
  shouldWaitForClickHandler = false
}) {
  const store = useStoreSyncedWithLocalStorage();
  const classes = useStyles();
  const modals = useModals();
  const handleActivitySwitch = activityName => () => {
    if (
      latestActivity &&
      activityName ===
        (latestActivity.endTime
          ? ACTIVITIES.break.name
          : latestActivity.type) &&
      activityName !== ACTIVITIES.drive.name &&
      activityName !== ACTIVITIES.support.name
    )
      return;
    else if (
      activityName === ACTIVITIES.drive.name ||
      activityName === ACTIVITIES.support.name
    ) {
      modals.open("driverSelection", {
        team,
        requireVehicle: requireVehicle,
        company,
        currentDriverId:
          latestActivity &&
          !latestActivity.endTime &&
          latestActivity.type === ACTIVITIES.drive.name
            ? store.userId()
            : undefined,
        currentDriverStartTime: latestActivity ? getTime(latestActivity) : null,
        handleDriverSelection: async (driverId, vehicle, kilometerReading) =>
          shouldWaitForClickHandler
            ? await pushActivitySwitchEvent(
                activityName,
                driverId,
                vehicle,
                kilometerReading
              )
            : pushActivitySwitchEvent(
                activityName,
                driverId,
                vehicle,
                kilometerReading
              )
      });
    } else pushActivitySwitchEvent(activityName);
  };

  return (
    <Box className={classes.container} p={2}>
      <Grid
        container
        direction="row"
        justify="center"
        alignItems={"center"}
        spacing={2}
      >
        {Object.values(SWITCH_ACTIVITIES).map(activity => {
          const current =
            latestActivity &&
            (!latestActivity.endTime
              ? activity.name === latestActivity.type ||
                (activity === ACTIVITIES.drive &&
                  latestActivity.type === ACTIVITIES.support.name)
              : activity === ACTIVITIES.break);
          return (
            <Grid
              item
              className={classes.gridItem}
              xs
              key={activity.name}
              style={{ marginBottom: current ? 16 : 0, lineHeight: 0 }}
            >
              <ArrowDropUpIcon
                viewBox="0 8 24 8"
                style={{
                  color: activity.color,
                  visibility: current ? "visible" : "hidden",
                  width: 24,
                  height: 8
                }}
              />
              <ActivitySwitchCard
                label={activity.label}
                renderIcon={activity.renderIcon}
                current={current}
                onClick={handleActivitySwitch(activity.name)}
                disabled={
                  disableBreak && activity.name === ACTIVITIES.break.name
                }
                color={activity.color}
              />
            </Grid>
          );
        })}
      </Grid>
      {endMission && (
        <Box pt={6} pb={2}>
          <MainCtaButton
            onClick={() => {
              const missionEndTime = now();
              modals.open("endMission", {
                currentExpenditures: fromPairs(
                  uniq(currentMission.expenditures.map(e => [e.type, true]))
                ),
                companyAddresses: store
                  .getEntity("knownAddresses")
                  .filter(
                    a =>
                      a.companyId ===
                      (currentMission.company
                        ? currentMission.company.id
                        : currentMission.companyId)
                  ),
                handleMissionEnd: async (
                  expenditures,
                  comment,
                  address,
                  kilometerReading
                ) =>
                  await endMission({
                    endTime: missionEndTime,
                    expenditures,
                    comment,
                    endLocation: address,
                    kilometerReading
                  }),
                currentEndLocation: currentMission.endLocation,
                currentMission: currentMission
              });
            }}
          >
            Mission terminée
          </MainCtaButton>
        </Box>
      )}
    </Box>
  );
}
